"""
RAG Service — Medical document intelligence via PageIndex + Gemini.

Pipeline
────────
1. process_document(report_id, ...)
   Called as a background task after file upload.
   a. PDF  → PageIndex tree (OpenRouter/GPT-4o) in thread executor
   b. Image → Gemini Vision text extraction → flat tree
   c. DOCX  → python-docx text extraction → flat tree
   Saves tree + insights to MedicalReport, sets status → COMPLETED.

2. answer_medical_query(patient_id, query, session)
   RAG chat: loads all completed reports for the patient,
   uses Gemini to tree-search relevant nodes, extracts context,
   then generates a safe, factual answer with Gemini.

Medical Safety Guardrails
─────────────────────────
The system prompt enforces:
  - Factual answers based only on uploaded documents
  - No diagnosis or prognosis
  - Drug substitution questions get "same active ingredient — confirm with pharmacist"
  - All answers end with a consult-your-provider reminder
  - Refuses off-topic non-medical questions
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.db.engine import async_session_factory
from app.models.enums import AIAnalysisStatus
from app.models.report import MedicalReport
from app.models.profiles import PatientProfile
from app.services import file_storage, pageindex_service

logger = logging.getLogger(__name__)

# ─── Medical Safety System Prompt ────────────────────────────────────────────

_MEDICAL_SAFETY_SYSTEM_PROMPT = """
You are MedIntel Assistant, a safe and factual medical document helper.

STRICT RULES — follow every rule without exception:

1. ONLY answer questions based on the patient's uploaded medical documents provided in context.
2. Do NOT diagnose, prescribe, or provide prognosis.
3. Do NOT answer questions that are not related to the provided documents or general medical understanding.
4. For drug substitution questions (e.g. "Can I take Brand X instead of Brand Y?"):
   - State whether they contain the same active ingredient if that information is in the documents.
   - Always add: "Please confirm any medication change with your pharmacist or prescribing doctor before switching."
5. For dosage questions: state only what is written in the document. Add: "Follow your prescription exactly as written."
6. Always end answers with: "⚕️ This information is for reference only. Always consult your healthcare provider for medical decisions."
7. If no relevant documents are available, say: "I could not find information about this in your uploaded documents."
8. Be concise, clear, and use plain language.
""".strip()

# ─── Gemini helpers ───────────────────────────────────────────────────────────


def _get_gemini_client():
    """Return a configured Google GenAI client."""
    from google import genai
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def _gemini_generate(prompt: str, system: str | None = None) -> str:
    """
    Call Gemini with a simple prompt. Falls back through model chain on 429.
    Returns the text response.
    """
    from google import genai
    from google.genai import types

    client = _get_gemini_client()
    model_chain = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]

    contents: list[Any] = [{"role": "user", "parts": [{"text": prompt}]}]
    config_kwargs: dict[str, Any] = {"max_output_tokens": 4096}
    if system:
        config_kwargs["system_instruction"] = system

    for model in model_chain:
        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=contents,
                config=types.GenerateContentConfig(**config_kwargs),
            )
            return response.text or ""
        except Exception as exc:
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                logger.warning("Gemini model %s quota exceeded, trying next.", model)
                continue
            raise

    raise RuntimeError("All Gemini models quota-exhausted. Retry later.")


async def _extract_text_from_image_gemini(image_bytes: bytes, mime_type: str) -> str:
    """Use Gemini Vision to extract text from an image (OCR-free approach)."""
    from google import genai
    from google.genai import types

    client = _get_gemini_client()
    prompt = (
        "This is a medical document image. "
        "Extract all text from it exactly as written, preserving structure and headings. "
        "Include all medications, diagnoses, lab values, dosages, dates, and instructions. "
        "Output only the extracted text."
    )

    for model in ["gemini-2.0-flash", "gemini-1.5-flash"]:
        try:
            response = await asyncio.to_thread(
                client.models.generate_content,
                model=model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt,
                ],
                config=types.GenerateContentConfig(max_output_tokens=8192),
            )
            return response.text or ""
        except Exception as exc:
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                continue
            raise

    raise RuntimeError("Could not extract image text — all Gemini vision models exhausted.")


async def _extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract plain text from a DOCX file using python-docx."""
    import io

    try:
        from docx import Document

        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        return "\n\n".join(paragraphs)
    except Exception as exc:
        logger.error("DOCX text extraction failed: %s", exc)
        return ""


async def _generate_medical_insights(tree: dict, doc_name: str) -> dict:
    """
    Use Gemini to extract structured medical insights from a PageIndex tree.

    Returns a dict with keys:
      medications, diagnoses, lab_values, key_findings, risk_flags, summary
    """
    tree_summary = pageindex_service.get_tree_summary_for_prompt(tree)

    prompt = f"""
You are a medical document analyst. Analyze the following document structure from "{doc_name}" and extract structured medical insights.

Document structure (nodes with summaries):
{tree_summary}

Extract the following in JSON format:
{{
  "medications": [
    {{"name": "...", "dosage": "...", "frequency": "...", "purpose": "..."}}
  ],
  "diagnoses": ["..."],
  "lab_values": [
    {{"test": "...", "value": "...", "reference_range": "...", "status": "normal|high|low|unknown"}}
  ],
  "key_findings": ["..."],
  "risk_flags": ["..."],
  "summary": "2-3 sentence plain language summary of this document"
}}

Rules:
- Only include information explicitly present in the document.
- If a field has no information, use an empty array or empty string.
- For medications without dosage info, use "not specified".
- Risk flags: only include genuinely concerning findings (e.g. critical lab values, drug interactions noted).
- Keep summary concise and in plain language suitable for a patient.

Return ONLY the JSON object, no additional text.
""".strip()

    try:
        raw = await _gemini_generate(prompt)
        # Strip markdown fences if present
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        insights = json.loads(raw)
    except (json.JSONDecodeError, Exception) as exc:
        logger.warning("Failed to parse insights JSON for %s: %s", doc_name, exc)
        insights = {
            "medications": [],
            "diagnoses": [],
            "lab_values": [],
            "key_findings": [],
            "risk_flags": [],
            "summary": "Document processed. Manual review recommended.",
        }

    return insights


# ─── Tree Search via Gemini ───────────────────────────────────────────────────


async def _tree_search_gemini(tree: dict, query: str) -> list[str]:
    """
    Use Gemini to search a PageIndex tree and return relevant node IDs.
    Simulates the reasoning-based tree search step from the PageIndex cookbook.
    """
    tree_summary = pageindex_service.get_tree_summary_for_prompt(tree)
    doc_name = tree.get("doc_name", "document")

    prompt = f"""
You are a medical document search assistant.

Document: "{doc_name}"
User question: {query}

Document tree structure (each node has an ID, title, and summary):
{tree_summary}

Find all nodes that are likely to contain the answer to the user's question.

Reply ONLY in this JSON format:
{{
  "thinking": "brief explanation of which nodes are relevant",
  "node_list": ["node_id_1", "node_id_2"]
}}
""".strip()

    try:
        raw = await _gemini_generate(prompt)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
        return result.get("node_list", [])
    except Exception as exc:
        logger.warning("Tree search failed: %s — using all nodes.", exc)
        # Fallback: use first 5 nodes
        from app.services.pageindex_service import _flatten_nodes
        flat = _flatten_nodes(tree)
        return [n.get("node_id", "") for n in flat[:5] if n.get("node_id")]


# ─── Main Background Task ─────────────────────────────────────────────────────


async def process_document(
    report_id: uuid.UUID,
    file_url: str,
    file_type: str,
    doc_name: str,
) -> None:
    """
    Background task: process an uploaded medical document.

    1. Sets report status to PROCESSING
    2. Reads file bytes
    3. Builds a PageIndex tree (PDF) or flat tree (image/DOCX)
    4. Generates structured AI insights
    5. Sets status to COMPLETED and stores results

    On any error: sets status to FAILED.
    """
    async with async_session_factory() as session:
        # Mark as processing
        report = await session.get(MedicalReport, report_id)
        if not report:
            logger.error("process_document: report %s not found", report_id)
            return

        report.ai_analysis_status = AIAnalysisStatus.PROCESSING
        await session.commit()

        try:
            file_bytes = file_storage.read_file_bytes(file_url)
            tree: dict = {}

            if "pdf" in file_type.lower():
                # Build PageIndex tree via OpenRouter
                logger.info("Building PageIndex tree for report %s (PDF)", report_id)
                loop = asyncio.get_event_loop()
                pageindex_api_key = settings.PAGEINDEX_API_KEY or settings.OPENROUTER_API_KEY
                tree = await loop.run_in_executor(
                    None,
                    pageindex_service.build_tree_sync,
                    file_bytes,
                    pageindex_api_key,
                    settings.OPENROUTER_MODEL,
                )

            elif file_type.lower().startswith("image/"):
                # Use Gemini Vision to extract text
                logger.info("Extracting text from image for report %s", report_id)
                extracted_text = await _extract_text_from_image_gemini(file_bytes, file_type)
                tree = pageindex_service.build_flat_tree_from_text(extracted_text, doc_name)

            else:
                # DOCX / DOC
                logger.info("Extracting text from DOCX for report %s", report_id)
                extracted_text = await _extract_text_from_docx(file_bytes)
                tree = pageindex_service.build_flat_tree_from_text(extracted_text, doc_name)

            # Generate medical insights from tree
            insights = await _generate_medical_insights(tree, doc_name)

            # Persist results
            report = await session.get(MedicalReport, report_id)  # refresh
            report.page_index_tree = tree
            report.ai_insights = insights
            report.ai_summary = insights.get("summary", "")
            report.ai_analysis_status = AIAnalysisStatus.COMPLETED
            await session.commit()

            logger.info("Report %s processing COMPLETED", report_id)

        except Exception as exc:
            logger.error(
                "process_document FAILED for report %s: %s", report_id, exc, exc_info=True
            )
            try:
                report = await session.get(MedicalReport, report_id)
                if report:
                    report.ai_analysis_status = AIAnalysisStatus.FAILED
                    await session.commit()
            except Exception:
                pass


# ─── RAG Chat: Answer Medical Query ──────────────────────────────────────────


async def answer_medical_query(
    patient_id: uuid.UUID,
    query: str,
    session: AsyncSession,
) -> dict:
    """
    Answer a medical query using the patient's uploaded documents.

    1. Loads all COMPLETED reports for the patient.
    2. For each report, runs Gemini tree search to find relevant nodes.
    3. Extracts text from matched nodes.
    4. Generates a grounded, safety-guardrailed answer with Gemini.

    Returns:
        {
          "answer": str,
          "sources": [{"doc_name": str, "page_range": str}]
        }
    """
    # Load all completed reports
    result = await session.execute(
        select(MedicalReport)
        .where(
            MedicalReport.patient_id == patient_id,
            MedicalReport.ai_analysis_status == AIAnalysisStatus.COMPLETED,
            MedicalReport.page_index_tree.isnot(None),
        )
        .order_by(MedicalReport.uploaded_at.desc())
    )
    reports = result.scalars().all()

    if not reports:
        return {
            "answer": (
                "No processed medical documents found. "
                "Please upload your medical documents and wait for processing to complete."
            ),
            "sources": [],
        }

    # Gather context from all reports via tree search
    context_parts: list[str] = []
    sources: list[dict] = []

    for report in reports:
        tree = report.page_index_tree
        if not tree:
            continue

        doc_name = report.file_name or f"Document {report.id}"

        try:
            node_ids = await _tree_search_gemini(tree, query)
            if node_ids:
                context_text = pageindex_service.extract_node_text(tree, node_ids)
                if context_text.strip():
                    context_parts.append(f"[From: {doc_name}]\n{context_text}")
                    # Derive page range from matched nodes
                    flat = pageindex_service._flatten_nodes(tree)
                    node_map = {n.get("node_id"): n for n in flat}
                    pages = []
                    for nid in node_ids:
                        node = node_map.get(nid, {})
                        start = node.get("start_index") or node.get("page_index")
                        end = node.get("end_index", start)
                        if start:
                            pages.append(f"{start}–{end}" if end != start else str(start))
                    sources.append(
                        {
                            "doc_name": doc_name,
                            "page_range": ", ".join(pages) if pages else "N/A",
                        }
                    )
        except Exception as exc:
            logger.warning("Tree search failed for report %s: %s", report.id, exc)

    if not context_parts:
        return {
            "answer": "I could not find information about this in your uploaded documents.",
            "sources": [],
        }

    # Build final answer prompt
    combined_context = "\n\n---\n\n".join(context_parts)
    answer_prompt = f"""
Patient's question: {query}

Relevant context from their medical documents:
{combined_context}

Answer the patient's question based ONLY on the context above.
""".strip()

    answer = await _gemini_generate(answer_prompt, system=_MEDICAL_SAFETY_SYSTEM_PROMPT)

    return {
        "answer": answer.strip(),
        "sources": sources,
    }


# ─── Aggregate Insights ───────────────────────────────────────────────────────


async def get_aggregated_insights(
    patient_id: uuid.UUID,
    session: AsyncSession,
) -> dict:
    """
    Aggregate AI insights across all completed reports for a patient.

    Returns a merged insights dict with de-duplicated medications, diagnoses, etc.
    """
    result = await session.execute(
        select(MedicalReport)
        .where(
            MedicalReport.patient_id == patient_id,
            MedicalReport.ai_analysis_status == AIAnalysisStatus.COMPLETED,
            MedicalReport.ai_insights.isnot(None),
        )
        .order_by(MedicalReport.uploaded_at.desc())
    )
    reports = result.scalars().all()

    # Merge across reports (latest upload wins on duplicates)
    merged: dict = {
        "medications": [],
        "diagnoses": [],
        "lab_values": [],
        "key_findings": [],
        "risk_flags": [],
    }

    seen_medications: set[str] = set()
    seen_diagnoses: set[str] = set()

    for report in reports:
        insights = report.ai_insights or {}

        for med in insights.get("medications", []):
            key = med.get("name", "").lower().strip()
            if key and key not in seen_medications:
                merged["medications"].append(med)
                seen_medications.add(key)

        for diag in insights.get("diagnoses", []):
            key = diag.lower().strip()
            if key and key not in seen_diagnoses:
                merged["diagnoses"].append(diag)
                seen_diagnoses.add(key)

        merged["lab_values"].extend(insights.get("lab_values", []))
        merged["key_findings"].extend(insights.get("key_findings", []))
        merged["risk_flags"].extend(insights.get("risk_flags", []))

    return merged
