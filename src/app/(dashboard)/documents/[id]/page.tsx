"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";

const OnlyOfficeEditor = dynamic(() => import("@/components/documents/OnlyOfficeEditor"), { ssr: false });

interface ViolationData {
  id: string;
  type: string;
  severity: "ERROR" | "WARNING" | "INFO";
  section: string | null;
  location: string | null;
  description: string;
  expected: string;
  found: string;
  suggestion: string | null;
}

interface CitationCheckItem {
  id: string;
  citationText: string;
  sourceType: string | null;
  isCorrect: boolean;
  expected: string | null;
  found: string | null;
  issues: Record<string, unknown> | null;
  location: string | null;
}

interface AnalysisSummary {
  totalViolations: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  formatScore: number;
  citationScore: number;
  overallScore: number;
  violationCategories: Record<string, number>;
  processingTimeMs: number;
}

interface DocumentDetail {
  id: string;
  originalName: string;
  fileName: string;
  status: string;
  pageCount: number | null;
  wordCount: number | null;
  citationCount: number | null;
  analysis: {
    id: string;
    status: string;
    creditCost: number;
    summary: AnalysisSummary | null;
    formatTemplate: { id: string; name: string } | null;
    citationStyle: { id: string; name: string } | null;
    violations: ViolationData[];
    citationResults: CitationCheckItem[];
  } | null;
}

const severityStyles: Record<string, { bg: string; text: string; border: string }> = {
  ERROR: { bg: "bg-red-50", text: "text-red-700", border: "border-l-red-500" },
  WARNING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-l-amber-500" },
  INFO: { bg: "bg-blue-50", text: "text-blue-700", border: "border-l-blue-500" },
};

const violationTypeLabels: Record<string, string> = {
  FONT_FAMILY: "Font Ailesi",
  FONT_SIZE: "Font Boyutu",
  LINE_SPACING: "Satır Aralığı",
  MARGIN_LEFT: "Sol Kenar",
  MARGIN_RIGHT: "Sağ Kenar",
  MARGIN_TOP: "Üst Kenar",
  MARGIN_BOTTOM: "Alt Kenar",
  ALIGNMENT: "Hizalama",
  FIRST_LINE_INDENT: "İlk Satır Girintisi",
  PARAGRAPH_SPACING: "Paragraf Boşluğu",
  HEADING_FORMAT: "Başlık Formatı",
  PAGE_NUMBER: "Sayfa Numarası",
  BOLD: "Kalın",
  ITALIC: "İtalik",
  CITATION_INLINE: "Metin İçi Atıf",
  CITATION_BIBLIOGRAPHY: "Kaynakça",
  OTHER: "Diğer",
};

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const documentId = params.id as string;

  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"violations" | "citations">("violations");
  const [violationFilter, setViolationFilter] = useState<string>("all");
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<"editor" | "list">("editor");

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<DocumentDetail>(`/api/documents/${documentId}`);
      setDocument(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belge bilgileri yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  useEffect(() => {
    if (document?.analysis?.status === "PROCESSING") {
      const interval = setInterval(fetchDocument, 3000);
      return () => clearInterval(interval);
    }
  }, [document?.analysis?.status, fetchDocument]);

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      await apiPost(`/api/documents/${documentId}/analyze`, {
        formatTemplateId: document?.analysis?.formatTemplate?.id ?? null,
        citationStyleId: document?.analysis?.citationStyle?.id ?? null,
      });
      await fetchDocument();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analiz başlatılamadı.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDismiss = (violationId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(violationId);
      return next;
    });
  };

  const handleRestoreAll = () => {
    setDismissedIds(new Set());
  };

  const handleDeleteDocument = async () => {
    if (!document) return;
    if (!window.confirm(`"${document.originalName}" belgesini kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      setDeleting(true);
      setError(null);
      await apiDelete(`/api/documents/${document.id}`);
      router.push("/documents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belge silinirken bir hata oluştu.");
      setDeleting(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-amber-600";
    return "text-red-600";
  };

  const violations = useMemo(
    () => document?.analysis?.violations ?? [],
    [document?.analysis?.violations],
  );
  const citationResults = useMemo(
    () => document?.analysis?.citationResults ?? [],
    [document?.analysis?.citationResults],
  );

  const visibleViolations = useMemo(
    () => violations
      .filter((v) => !dismissedIds.has(v.id))
      .filter((v) => violationFilter === "all" || v.severity === violationFilter.toUpperCase()),
    [violations, dismissedIds, violationFilter],
  );

  const progress = violations.length > 0
    ? Math.round(((violations.length - dismissedIds.size) / violations.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center py-12">
        <p className="text-red-600">{error}</p>
        <button onClick={fetchDocument} className="btn-secondary mt-4">
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-600">Belge bulunamadı.</p>
        <button onClick={() => router.push("/documents")} className="btn-primary mt-4">
          Belgelerime Dön
        </button>
      </div>
    );
  }

  const analysis = document.analysis;
  const summary = analysis?.summary as AnalysisSummary | null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/documents")}
            className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Belgelere Dön
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{document.originalName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {document.pageCount ? `${document.pageCount} sayfa` : ""}
            {document.wordCount ? ` · ${document.wordCount} kelime` : ""}
            {document.citationCount ? ` · ${document.citationCount} atıf` : ""}
          </p>
        </div>
        <div className="flex gap-3">
          {(!analysis || analysis.status === "UPLOADED" || analysis.status === "FAILED") && (
            <button onClick={handleAnalyze} disabled={analyzing} className="btn-primary">
              {analyzing ? "Analiz Başlatılıyor..." : "Analiz Et"}
            </button>
          )}
          {analysis && (
            <button
              onClick={() => router.push(`/api/documents/${documentId}/download`)}
              className="btn-secondary text-sm"
            >
              İndir
            </button>
          )}
          <button
            onClick={handleDeleteDocument}
            disabled={deleting}
            className="btn-danger text-sm"
          >
            {deleting ? "Siliniyor..." : "Belgeyi Sil"}
          </button>
        </div>
      </div>

      {analysis?.status === "PROCESSING" && (
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <div>
              <p className="font-medium text-gray-900">Belgeniz analiz ediliyor...</p>
              <p className="text-sm text-gray-500">
                Bu işlem belge boyutuna bağlı olarak birkaç saniye sürebilir.
              </p>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="card">
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="text-center">
              <div className="relative mx-auto h-24 w-24">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke={summary.formatScore >= 80 ? "#22c55e" : summary.formatScore >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="10"
                    strokeDasharray={`${summary.formatScore * 2.513} 251.3`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${getScoreColor(summary.formatScore)}`}>
                  {summary.formatScore}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-700">Format Skoru</p>
            </div>

            <div className="text-center">
              <div className="relative mx-auto h-24 w-24">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke={summary.citationScore >= 80 ? "#22c55e" : summary.citationScore >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="10"
                    strokeDasharray={`${summary.citationScore * 2.513} 251.3`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${getScoreColor(summary.citationScore)}`}>
                  {summary.citationScore}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-700">Kaynakça Skoru</p>
            </div>

            <div className="text-center">
              <div className="relative mx-auto h-24 w-24">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke={summary.overallScore >= 80 ? "#6366f1" : summary.overallScore >= 50 ? "#f59e0b" : "#ef4444"}
                    strokeWidth="10"
                    strokeDasharray={`${summary.overallScore * 2.513} 251.3`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${
                  summary.overallScore >= 80 ? "text-indigo-600" : summary.overallScore >= 50 ? "text-amber-600" : "text-red-600"
                }`}>
                  {summary.overallScore}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-700">Genel Skor</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 border-t border-gray-100 pt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
              {summary.errorCount} Hata
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
              {summary.warningCount} Uyarı
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
              {summary.infoCount} Bilgi
            </div>
            <span>·</span>
            <span>{summary.processingTimeMs} ms</span>
          </div>

          {violations.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>İlerleme ({dismissedIds.size}/{violations.length} gözardı edildi)</span>
                <span>{progress}% kaldı</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${100 - progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {analysis && (
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("editor")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "editor"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Editör
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              İhlalleri Listele
            </button>
          </div>
          {dismissedIds.size > 0 && (
            <button onClick={handleRestoreAll} className="text-xs text-gray-500 hover:text-gray-700">
              Tümünü geri yükle
            </button>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <OnlyOfficeEditor documentId={documentId} />
      </div>

      {viewMode === "list" && (
        <div className="card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("violations")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "violations"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Format İhlalleri ({visibleViolations.length})
              </button>
              <button
                onClick={() => setActiveTab("citations")}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === "citations"
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Kaynakça Kontrolleri ({citationResults.length})
              </button>
            </div>
          </div>

          {activeTab === "violations" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {violations.length > 0 && (
                  <select
                    value={violationFilter}
                    onChange={(e) => setViolationFilter(e.target.value)}
                    className="input-field w-auto"
                  >
                    <option value="all">Tümü</option>
                    <option value="error">Hatalar</option>
                    <option value="warning">Uyarılar</option>
                    <option value="info">Bilgiler</option>
                  </select>
                )}
              </div>

              {visibleViolations.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-900">
                    {violations.length === 0 ? "Tebrikler! Hiçbir format ihlali bulunamadı." : "Tüm ihlaller gözardı edildi."}
                  </p>
                </div>
              ) : (
                visibleViolations.map((v) => {
                  const sev = severityStyles[v.severity] || severityStyles.INFO;
                  return (
                    <div
                      key={v.id}
                      className={`rounded-lg border-l-4 bg-white p-4 shadow-sm ${sev.border} ${dismissedIds.has(v.id) ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sev.bg} ${sev.text}`}>
                              {v.severity === "ERROR" ? "Hata" : v.severity === "WARNING" ? "Uyarı" : "Bilgi"}
                            </span>
                            <span className="text-xs text-gray-500">
                              {violationTypeLabels[v.type] || v.type}
                            </span>
                            {v.section && <span className="text-xs text-gray-400">· {v.section}</span>}
                            {v.location && <span className="text-xs text-gray-400">· {v.location}</span>}
                          </div>
                          <p className="mt-2 text-sm text-gray-700">{v.description}</p>
                          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                            <div className="rounded bg-red-50 px-3 py-2">
                              <span className="font-medium text-red-700">Bulunan:</span>{" "}
                              <span className="text-red-600">{v.found}</span>
                            </div>
                            <div className="rounded bg-green-50 px-3 py-2">
                              <span className="font-medium text-green-700">Beklenen:</span>{" "}
                              <span className="text-green-600">{v.expected}</span>
                            </div>
                          </div>
                          {v.suggestion && (
                            <p className="mt-2 text-sm text-indigo-600">
                              <span className="font-medium">Öneri:</span> {v.suggestion}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDismiss(v.id)}
                          className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            dismissedIds.has(v.id)
                              ? "bg-gray-100 text-gray-400"
                              : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                          }`}
                          disabled={dismissedIds.has(v.id)}
                        >
                          {dismissedIds.has(v.id) ? "Gözardı Edildi" : "Gözardı Et"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "citations" && (
            <div className="space-y-3">
              {citationResults.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">
                    Kaynakça doğrulaması için bir atıf stili seçerek analiz başlatın.
                  </p>
                </div>
              ) : (
                citationResults.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-lg border bg-white p-4 shadow-sm ${
                      c.isCorrect ? "border-green-200" : "border-red-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          }`}>
                            {c.isCorrect ? "Doğru" : "Hatalı"}
                          </span>
                          {c.sourceType && <span className="text-xs text-gray-500">{c.sourceType}</span>}
                          {c.location && <span className="truncate text-xs text-gray-400">{c.location}</span>}
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {!c.isCorrect && c.found && (
                            <div className="rounded bg-red-50 p-3">
                              <p className="text-xs font-medium text-red-700 mb-1">Sizin Yazdığınız</p>
                              <p className="text-sm text-red-600 break-words">{c.found}</p>
                            </div>
                          )}
                          {!c.isCorrect && c.expected && (
                            <div className="rounded bg-green-50 p-3">
                              <p className="text-xs font-medium text-green-700 mb-1">Crossref Doğru Format</p>
                              <p className="text-sm text-green-600 break-words"
                                dangerouslySetInnerHTML={{ __html: c.expected }}
                              />
                            </div>
                          )}
                          {c.isCorrect && (
                            <div className="rounded bg-green-50 p-3 sm:col-span-2">
                              <p className="text-sm text-green-700 break-words">{c.citationText}</p>
                            </div>
                          )}
                        </div>
                        {c.issues && typeof c.issues === "object" && Object.keys(c.issues).length > 0 && (
                          <div className="mt-3 border-t border-gray-100 pt-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">Tespit Edilen Sorunlar:</p>
                            <ul className="space-y-1">
                              {Object.entries(c.issues).map(([key, value]) => {
                                if (value && typeof value === "object" && "message" in value) {
                                  return (
                                    <li key={key} className="text-xs text-gray-600">
                                      <span className="font-medium">{key}:</span>{" "}
                                      {String((value as Record<string, string>).message)}
                                    </li>
                                  );
                                }
                                return null;
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
