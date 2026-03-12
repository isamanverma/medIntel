"""
PageIndex Service — vectorless, reasoning-based RAG tree operations.

Wraps the VectifyAI/PageIndex library to:
  1. Build a hierarchical TOC tree from PDF/document bytes.
  2. Perform reasoning-based tree search (LLM navigates the tree).
  3. Extract text content from matching nodes.

Uses the official PageIndex Python SDK client flow:
    1. submit_document(file)
    2. poll get_tree(doc_id) until retrieval_ready
    3. normalize result to the internal schema

For non-PDF files (images, DOCX) we build a simplified flat tree
via text extraction, using the same node schema.

References:
  https://github.com/VectifyAI/PageIndex
  https://docs.pageindex.ai/cookbook/vectorless-rag-pageindex
"""

from __future__ import annotations

import json
import logging
import tempfile
import time
import uuid
from typing import Any

import fitz

logger = logging.getLogger(__name__)
PAGEINDEX_POLL_INTERVAL_SECONDS = 2.0
PAGEINDEX_POLL_TIMEOUT_SECONDS = 90.0


def _coerce_tree_nodes(nodes: list[Any]) -> list[dict]:
    coerced: list[dict] = []
    for idx, raw in enumerate(nodes):
        if not isinstance(raw, dict):
            continue

        child_candidates = raw.get("nodes") or raw.get("children") or raw.get("items") or []
        if not isinstance(child_candidates, list):
            child_candidates = []

        node_id = str(raw.get("node_id") or raw.get("id") or f"n_{idx}")
        title = (
            str(raw.get("title") or raw.get("heading") or raw.get("name") or raw.get("section") or "")
            or f"Section {idx + 1}"
        )
        text = str(raw.get("text") or raw.get("content") or raw.get("markdown") or "")
        summary = str(raw.get("summary") or raw.get("description") or text[:200] or title)

        page_start = raw.get("start_index") or raw.get("page_start") or raw.get("start_page") or raw.get("page")
        page_end = raw.get("end_index") or raw.get("page_end") or raw.get("end_page") or page_start

        node = {
            "node_id": node_id,
            "title": title,
            "summary": summary,
            "text": text or summary,
            "start_index": int(page_start) if isinstance(page_start, int) else 1,
            "end_index": int(page_end) if isinstance(page_end, int) else 1,
        }

        coerced_children = _coerce_tree_nodes(child_candidates)
        if coerced_children:
            node["nodes"] = coerced_children

        coerced.append(node)

    return coerced


def _normalize_tree_payload(payload: Any) -> dict | None:
    if isinstance(payload, dict):
        if isinstance(payload.get("structure"), list):
            return {
                "doc_name": str(payload.get("doc_name") or payload.get("title") or "document"),
                "doc_description": str(payload.get("doc_description") or payload.get("description") or ""),
                "structure": _coerce_tree_nodes(payload.get("structure") or []),
            }

        for key in ("tree", "result", "data", "output"):
            if key in payload:
                normalized = _normalize_tree_payload(payload.get(key))
                if normalized:
                    return normalized

        for key in ("nodes", "children", "items"):
            raw_nodes = payload.get(key)
            if isinstance(raw_nodes, list):
                return {
                    "doc_name": str(payload.get("doc_name") or payload.get("title") or "document"),
                    "doc_description": str(payload.get("doc_description") or payload.get("description") or ""),
                    "structure": _coerce_tree_nodes(raw_nodes),
                }

    if isinstance(payload, list):
        return {
            "doc_name": "document",
            "doc_description": "",
            "structure": _coerce_tree_nodes(payload),
        }

    return None


def _extract_ready_tree_from_response(resp: dict) -> dict | None:
    for key in ("tree", "result", "data", "output", "structure"):
        if key in resp:
            normalized = _normalize_tree_payload(resp.get(key))
            if normalized and normalized.get("structure"):
                return normalized

    # Some responses may already be the tree object.
    normalized = _normalize_tree_payload(resp)
    if normalized and normalized.get("structure"):
        return normalized
    return None


def _is_tree_ready(resp: dict) -> bool:
    if resp.get("retrieval_ready") is True:
        return True

    status_fields = [
        str(resp.get("status", "")).lower(),
        str(resp.get("tree_status", "")).lower(),
        str(resp.get("processing_status", "")).lower(),
    ]
    if any(s in {"done", "ready", "completed", "success"} for s in status_fields):
        return True

    return _extract_ready_tree_from_response(resp) is not None


def _build_tree_via_pageindex_sdk(pdf_bytes: bytes, api_key: str) -> dict:
    from pageindex import PageIndexClient

    if not api_key:
        raise RuntimeError("Missing PageIndex API key")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp:
        tmp.write(pdf_bytes)
        tmp.flush()

        client = PageIndexClient(api_key=api_key)
        submit_resp = client.submit_document(tmp.name)
        doc_id = submit_resp.get("doc_id") or submit_resp.get("id")
        if not doc_id:
            raise RuntimeError(f"PageIndex submit_document did not return doc_id: {submit_resp}")

        deadline = time.time() + PAGEINDEX_POLL_TIMEOUT_SECONDS
        last_resp: dict | None = None
        while time.time() < deadline:
            resp = client.get_tree(doc_id, node_summary=True)
            if not isinstance(resp, dict):
                resp = {"result": resp}
            last_resp = resp

            if _is_tree_ready(resp):
                normalized = _extract_ready_tree_from_response(resp)
                if normalized:
                    return normalized

            time.sleep(PAGEINDEX_POLL_INTERVAL_SECONDS)

        raise RuntimeError(f"Timed out waiting for PageIndex tree readiness for doc_id={doc_id}. Last response={last_resp}")


def build_tree_sync(pdf_bytes: bytes, api_key: str, model: str = "openai/gpt-4o") -> dict:
    """
    Synchronously build a PageIndex tree from raw PDF bytes.

    This function is designed to be called inside a thread-pool executor
    (via asyncio.run_in_executor) so it doesn't block the event loop.
    PageIndex internally calls asyncio.run(), which is safe inside a
    separate thread.

    Args:
        pdf_bytes: Raw PDF file content.
        api_key:   OpenRouter API key.
        model:     OpenRouter model name.

    Returns:
        PageIndex result dict with keys: doc_name, doc_description, structure.
        On failure, returns a minimal fallback tree.
    """
    try:
        return _build_tree_via_pageindex_sdk(pdf_bytes, api_key)
    except Exception as exc:
        logger.warning(
            "Native PageIndex SDK flow unavailable (%s). Falling back to PDF text tree.",
            exc,
        )

    # Fallback path: extract text from PDF pages and build a compatible flat tree.
    try:
        pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
        pages: list[str] = []
        for i, page in enumerate(pdf):
            text = page.get_text("text").strip()
            if text:
                pages.append(f"Page {i + 1}\n{text}")
        pdf.close()

        full_text = "\n\n".join(pages).strip()
        if not full_text:
            full_text = "No text could be extracted from this PDF."
        return build_flat_tree_from_text(full_text, "uploaded_pdf")
    except Exception as exc:
        logger.error("PDF fallback tree generation failed: %s", exc, exc_info=True)
        raise


def build_flat_tree_from_text(text: str, doc_name: str = "document") -> dict:
    """
    Build a minimal flat PageIndex-compatible tree from plain text.

    Used for images (after Gemini Vision extraction) and DOCX files.
    Each paragraph becomes a leaf node.

    Args:
        text:     Extracted text content.
        doc_name: Display name for the document.

    Returns:
        PageIndex-compatible dict: {doc_name, structure: [nodes]}.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    nodes = []
    for i, para in enumerate(paragraphs):
        nodes.append(
            {
                "node_id": f"{i:04d}",
                "title": para[:80] + ("…" if len(para) > 80 else ""),
                "summary": para[:200],
                "text": para,
                "start_index": i + 1,
                "end_index": i + 1,
            }
        )
    return {
        "doc_name": doc_name,
        "doc_description": f"Document: {doc_name}",
        "structure": nodes,
    }


def _flatten_nodes(tree: dict) -> list[dict]:
    """
    Recursively flatten a PageIndex tree into a list of all nodes
    (depth-first, including nested nodes).
    """
    flat: list[dict] = []

    def _walk(nodes: list[dict]) -> None:
        for node in nodes:
            flat.append(node)
            if "nodes" in node and node["nodes"]:
                _walk(node["nodes"])

    structure = tree.get("structure", [])
    _walk(structure)
    return flat


def extract_node_text(tree: dict, node_ids: list[str]) -> str:
    """
    Extract and concatenate the text content of the specified nodes.

    Args:
        tree:     PageIndex result dict.
        node_ids: List of node_id strings to retrieve.

    Returns:
        Concatenated text suitable for an LLM context window.
    """
    flat = _flatten_nodes(tree)
    node_map = {n.get("node_id", ""): n for n in flat}
    parts: list[str] = []
    for nid in node_ids:
        node = node_map.get(nid)
        if node:
            text = node.get("text") or node.get("summary") or node.get("title", "")
            if text:
                parts.append(text)
    return "\n\n".join(parts)


def get_tree_summary_for_prompt(tree: dict) -> str:
    """
    Return a compact JSON summary of the tree for use in prompts.
    Only includes node_id, title, and summary (drops raw text).
    """
    flat = _flatten_nodes(tree)
    compact = [
        {
            "node_id": n.get("node_id"),
            "title": n.get("title"),
            "summary": n.get("summary", "")[:200],
        }
        for n in flat
    ]
    return json.dumps(compact, indent=2)
