"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  FlaskConical,
  Loader2,
  Pill,
  Send,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMyReports,
  uploadReport,
  getReportInsights,
  sendRAGQuery,
} from "@/lib/api-client";
import type {
  AIAnalysisStatus,
  MedicalReport,
  MedicalReportInsightLabValue,
  MedicalReportInsightMedication,
  RAGChatMessage,
  RAGChatSource,
  ReportInsights,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES =
  "application/pdf,image/jpeg,image/png,image/webp,image/gif,image/tiff,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const POLL_INTERVAL_MS = 5_000;

const STARTER_QUESTIONS = [
  "What medications am I currently prescribed?",
  "Summarise my recent lab results.",
  "Are there any drug interactions I should know about?",
  "What do my diagnoses mean?",
];

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AIAnalysisStatus,
  { label: string; icon: React.ElementType; classes: string }
> = {
  PENDING: {
    label: "Queued",
    icon: Clock,
    classes:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  PROCESSING: {
    label: "Analysing…",
    icon: Loader2,
    classes: "border-primary/30 bg-primary/10 text-primary",
  },
  COMPLETED: {
    label: "Ready",
    icon: CheckCircle2,
    classes:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  FAILED: {
    label: "Failed",
    icon: AlertCircle,
    classes: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function mimeToLabel(mime: string | null): string {
  if (!mime) return "Document";
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "Image";
  if (
    mime === "application/msword" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "DOCX";
  return "File";
}

function needsPolling(status: AIAnalysisStatus) {
  return status === "PENDING" || status === "PROCESSING";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AIAnalysisStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn("h-6 gap-1.5 px-2.5 text-xs font-medium", cfg.classes)}
    >
      <Icon
        className={cn(
          "h-3 w-3",
          status === "PROCESSING" && "animate-spin",
        )}
      />
      {cfg.label}
    </Badge>
  );
}

function LabValueRow({ lv }: { lv: MedicalReportInsightLabValue }) {
  const colorMap: Record<string, string> = {
    normal: "text-emerald-600 dark:text-emerald-400",
    high: "text-red-600 dark:text-red-400",
    low: "text-amber-600 dark:text-amber-400",
    unknown: "text-muted-foreground",
  };
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border/50 last:border-0 text-sm">
      <span className="font-medium">{lv.test}</span>
      <div className="flex items-center gap-2">
        <span className={cn("font-semibold tabular-nums", colorMap[lv.status])}>
          {lv.value}
        </span>
        {lv.reference_range && (
          <span className="text-muted-foreground text-xs">
            ({lv.reference_range})
          </span>
        )}
      </div>
    </div>
  );
}

function MedicationCard({ med }: { med: MedicalReportInsightMedication }) {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-3 space-y-1">
      <div className="flex items-center gap-2">
        <Pill className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-semibold">{med.name}</span>
        {med.dosage && (
          <Badge variant="secondary" className="text-xs ml-auto">
            {med.dosage}
          </Badge>
        )}
      </div>
      {med.frequency && (
        <p className="text-xs text-muted-foreground pl-6">{med.frequency}</p>
      )}
      {med.purpose && (
        <p className="text-xs text-muted-foreground pl-6 italic">
          {med.purpose}
        </p>
      )}
    </div>
  );
}

function InsightsPanel({ insights }: { insights: ReportInsights }) {
  const hasMeds = insights.medications?.length > 0;
  const hasDx = insights.diagnoses?.length > 0;
  const hasLabs = insights.lab_values?.length > 0;
  const hasFindings = insights.key_findings?.length > 0;
  const hasRisks = insights.risk_flags?.length > 0;

  if (!hasMeds && !hasDx && !hasLabs && !hasFindings && !hasRisks) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No structured insights extracted.
      </p>
    );
  }

  return (
    <div className="space-y-4 pt-1">
      {hasRisks && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 flex gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-destructive">Risk Flags</p>
            <ul className="text-xs text-destructive/90 space-y-0.5 list-disc list-inside">
              {insights.risk_flags.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {hasMeds && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Pill className="h-3.5 w-3.5" />
            Medications ({insights.medications.length})
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {insights.medications.map((m, i) => (
              <MedicationCard key={i} med={m} />
            ))}
          </div>
        </div>
      )}

      {hasDx && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5" />
            Diagnoses
          </h4>
          <ul className="space-y-1">
            {insights.diagnoses.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasLabs && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Lab Results
          </h4>
          <div className="rounded-md border border-border/60 px-3 py-1">
            {insights.lab_values.map((lv, i) => (
              <LabValueRow key={i} lv={lv} />
            ))}
          </div>
        </div>
      )}

      {hasFindings && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Key Findings
          </h4>
          <ul className="space-y-1">
            {insights.key_findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({
  report,
  onOpenChat,
}: {
  report: MedicalReport;
  onOpenChat: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasInsights =
    report.ai_analysis_status === "COMPLETED" &&
    (report.ai_summary || report.ai_insights);

  return (
    <Card
      className={cn(
        "transition-shadow",
        expanded && "shadow-md shadow-primary/10",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="rounded-md border border-border bg-muted/40 p-2 mt-0.5">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold truncate">
              {report.file_name ?? "Uploaded Report"}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-xs">
                {mimeToLabel(report.file_type)}
              </Badge>
              <Badge variant="secondary" className="text-xs capitalize">
                {report.report_type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(report.uploaded_at)}
              </span>
            </div>
          </div>
          <StatusBadge status={report.ai_analysis_status} />
        </div>
      </CardHeader>

      {hasInsights && (
        <CardContent className="pt-0 pb-3">
          {report.ai_summary && !expanded && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {report.ai_summary}
            </p>
          )}

          {expanded && (
            <div className="space-y-4">
              {report.ai_summary && (
                <p className="text-sm text-muted-foreground">
                  {report.ai_summary}
                </p>
              )}
              {report.ai_insights && (
                <InsightsPanel insights={report.ai_insights} />
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  View insights
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
              onClick={onOpenChat}
            >
              <Bot className="h-3.5 w-3.5" />
              Ask AI
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Upload Dropzone ──────────────────────────────────────────────────────────

function UploadDropzone({
  onUpload,
  uploading,
}: {
  onUpload: (file: File, type: string) => Promise<void>;
  uploading: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reportType, setReportType] = useState("lab_results");

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      await onUpload(files[0], reportType);
    },
    [onUpload, reportType],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground">
          Report type:
        </label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          disabled={uploading}
          className="h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="lab_results">Lab Results</option>
          <option value="imaging">Imaging</option>
          <option value="prescription">Prescription</option>
          <option value="discharge_summary">Discharge Summary</option>
          <option value="consultation">Consultation</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Drop zone — click or drag a file to upload"
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/30 hover:border-primary/60 hover:bg-muted/50",
          uploading && "pointer-events-none opacity-50",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            !uploading && inputRef.current?.click();
          }
        }}
      >
        {uploading ? (
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
        ) : (
          <Upload className="h-10 w-10 text-muted-foreground" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {uploading
              ? "Uploading…"
              : "Drop your document here, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            PDF, JPEG, PNG, WebP, TIFF, DOC, DOCX — max 25 MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}

// ─── RAG Chat Panel ───────────────────────────────────────────────────────────

function RAGChatPanel({
  patientId,
  onClose,
}: {
  patientId: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<RAGChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;
      const userMsg: RAGChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setSending(true);
      try {
        const res = await sendRAGQuery(text.trim(), patientId);
        const assistantMsg: RAGChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          timestamp: new Date().toISOString(),
        };
        setMessages((m) => [...m, assistantMsg]);
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              "Sorry, I couldn't process your question. Please try again.",
            timestamp: new Date().toISOString(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [patientId, sending],
  );

  return (
    <div className="flex flex-col h-[520px] rounded-xl border border-border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">Medical AI Assistant</span>
          <Badge
            variant="outline"
            className="text-xs gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online
          </Badge>
        </div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Disclaimer */}
      <div className="mx-3 mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700 dark:text-amber-400">
          AI answers are informational only.{" "}
          <strong>Always consult your healthcare provider.</strong>
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground text-center">
              Ask anything about your uploaded medical documents
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => void sendMessage(q)}
                  className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-left hover:bg-muted/60 hover:border-primary/40 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-2",
              msg.role === "user" && "flex-row-reverse",
            )}
          >
            <div
              className={cn(
                "h-6 w-6 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold mt-0.5",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted border border-border",
              )}
            >
              {msg.role === "user" ? "U" : <Bot className="h-3.5 w-3.5" />}
            </div>
            <div
              className={cn(
                "max-w-[78%] space-y-1.5",
                msg.role === "user" && "items-end",
              )}
            >
              <div
                className={cn(
                  "rounded-xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted border border-border/60",
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
                  {msg.sources.map((s: RAGChatSource, i: number) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-xs text-primary"
                    >
                      <FileText className="h-3 w-3" />
                      {s.doc_name}
                      {s.page_range && (
                        <span className="text-muted-foreground">
                          {s.page_range}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-2">
            <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 bg-muted border border-border mt-0.5">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="rounded-xl bg-muted border border-border/60 px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="flex items-end gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/60 transition-colors"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder="Ask about your documents…"
            rows={1}
            disabled={sending}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            aria-label="Send message"
            className="rounded-md p-1.5 text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Aggregated Insights Banner ───────────────────────────────────────────────

function InsightsBanner({
  patientId,
  reportCount,
}: {
  patientId: string;
  reportCount: number;
}) {
  const [insights, setInsights] = useState<ReportInsights | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (reportCount === 0) return;
    getReportInsights(patientId)
      .then((data) => setInsights(data))
      .catch(() => null);
  }, [patientId, reportCount]);

  if (!insights) return null;

  const total =
    (insights.medications?.length ?? 0) +
    (insights.diagnoses?.length ?? 0) +
    (insights.lab_values?.length ?? 0) +
    (insights.risk_flags?.length ?? 0);

  if (total === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Health Summary — across all documents
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Hide" : "Show"}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <InsightsPanel insights={insights} />
        </CardContent>
      )}
      {!expanded && (
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {insights.medications?.length > 0 && (
              <span className="flex items-center gap-1">
                <Pill className="h-3.5 w-3.5 text-primary" />
                {insights.medications.length} medication
                {insights.medications.length !== 1 && "s"}
              </span>
            )}
            {insights.diagnoses?.length > 0 && (
              <span className="flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5 text-primary" />
                {insights.diagnoses.length} diagnos
                {insights.diagnoses.length !== 1 ? "es" : "is"}
              </span>
            )}
            {insights.lab_values?.length > 0 && (
              <span className="flex items-center gap-1">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
                {insights.lab_values.length} lab value
                {insights.lab_values.length !== 1 && "s"}
              </span>
            )}
            {insights.risk_flags?.length > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <ShieldAlert className="h-3.5 w-3.5" />
                {insights.risk_flags.length} risk flag
                {insights.risk_flags.length !== 1 && "s"}
              </span>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

interface ReportsViewProps {
  patientId: string;
}

export function ReportsView({ patientId }: ReportsViewProps) {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchReports = useCallback(async () => {
    try {
      const data = await getMyReports(patientId);
      setReports(data);
      setError(null);
    } catch {
      setError("Failed to load reports.");
    }
  }, [patientId]);

  useEffect(() => {
    setLoading(true);
    fetchReports().finally(() => setLoading(false));
  }, [fetchReports]);

  // ── Polling for PENDING / PROCESSING reports ───────────────────────────────

  useEffect(() => {
    const hasActiveProcessing = reports.some((r) => needsPolling(r.ai_analysis_status));
    if (!hasActiveProcessing) return;
    const id = setInterval(() => {
      void fetchReports();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [reports, fetchReports]);

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (file: File, reportType: string) => {
      setUploadError(null);
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("report_type", reportType);
        const created = await uploadReport(fd);
        setReports((prev) => [created, ...prev]);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Upload failed. Please retry.";
        setUploadError(msg);
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const completedReports = reports.filter(
    (r) => r.ai_analysis_status === "COMPLETED",
  );

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Reports &amp; Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload medical documents to extract AI-powered insights and chat with
          your records.
        </p>
      </div>

      {/* Top-level AI summary across all documents */}
      <InsightsBanner
        patientId={patientId}
        reportCount={completedReports.length}
      />

      {/* Upload zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Upload a New Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDropzone onUpload={handleUpload} uploading={uploading} />
          {uploadError && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {uploadError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* RAG Chat */}
      {showChat ? (
        <RAGChatPanel
          patientId={patientId}
          onClose={() => setShowChat(false)}
        />
      ) : completedReports.length > 0 ? (
        <button
          onClick={() => setShowChat(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
        >
          <Bot className="h-4 w-4" />
          Chat with your medical documents
        </button>
      ) : null}

      {/* Reports list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Uploaded Documents{" "}
            {reports.length > 0 && (
              <span className="text-muted-foreground font-normal text-sm">
                ({reports.length})
              </span>
            )}
          </h2>
          {reports.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void fetchReports()}
              className="h-7 text-xs gap-1.5"
            >
              <Loader2
                className={cn(
                  "h-3.5 w-3.5",
                  loading && "animate-spin",
                )}
              />
              Refresh
            </Button>
          )}
        </div>

        {loading && reports.length === 0 && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-14 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium">No documents yet</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload a PDF, image, or Word document to get started.
              </p>
            </div>
          </div>
        )}

        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onOpenChat={() => setShowChat(true)}
          />
        ))}
      </div>
    </div>
  );
}
