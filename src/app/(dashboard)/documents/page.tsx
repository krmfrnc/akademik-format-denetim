"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DocumentUploadWizard from "@/components/documents/DocumentUploadWizard";
import { apiGet, apiDelete } from "@/lib/api-client";

interface DocumentItem {
  id: string;
  originalName: string;
  fileName: string;
  fileSize: number;
  status: "UPLOADED" | "PROCESSING" | "ANALYZED" | "FAILED";
  pageCount: number | null;
  wordCount: number | null;
  citationCount: number | null;
  errorMessage: string | null;
  createdAt: string;
  lastAnalysis: {
    id: string;
    status: string;
    summary: Record<string, unknown> | null;
    creditCost: number;
  } | null;
}

interface PaginatedDocs {
  data: DocumentItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

const statusLabels: Record<string, { label: string; className: string }> = {
  UPLOADED: { label: "Yüklendi", className: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "Analiz Ediliyor", className: "bg-amber-100 text-amber-700" },
  ANALYZED: { label: "Analiz Tamamlandı", className: "bg-green-100 text-green-700" },
  FAILED: { label: "Başarısız", className: "bg-red-100 text-red-700" },
};

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<PaginatedDocs>(
        `/api/documents?page=${pagination.page}&limit=${pagination.limit}`,
      );
      setDocuments(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belgeler yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadComplete = (documentId: string) => {
    setShowUpload(false);
    fetchDocuments();
    router.push(`/documents/${documentId}?wizard=1`);
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!window.confirm(`"${docName}" belgesini kalıcı olarak silmek istediğinize emin misiniz?`)) {
      return;
    }
    try {
      setDeletingId(docId);
      setError(null);
      await apiDelete(`/api/documents/${docId}`);
      fetchDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Belge silinirken bir hata oluştu.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getScore = (doc: DocumentItem): string | null => {
    const summary = doc.lastAnalysis?.summary as Record<string, number> | null;
    if (summary?.overallScore !== undefined) {
      return `${summary.overallScore}%`;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Belgelerim</h1>
          <p className="mt-1 text-sm text-gray-500">
            Yüklediğiniz akademik belgeleri yönetin ve analiz sonuçlarını inceleyin.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="btn-primary"
        >
          {showUpload ? "Vazgeç" : "Yeni Belge Yükle"}
        </button>
      </div>

      {showUpload && (
        <DocumentUploadWizard
          onComplete={handleUploadComplete}
          onCancel={() => setShowUpload(false)}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : documents.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h3 className="mt-4 text-sm font-semibold text-gray-900">Henüz belge yüklemediniz</h3>
          <p className="mt-1 text-sm text-gray-500">
            Yeni bir .docx belgesi yükleyerek format denetimi ve kaynakça doğrulaması yapabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const status = statusLabels[doc.status] || statusLabels.UPLOADED;
            const score = getScore(doc);

            return (
              <div key={doc.id} className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                      <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {doc.originalName}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{formatSize(doc.fileSize)}</span>
                        {doc.pageCount && <span>· {doc.pageCount} sayfa</span>}
                        {doc.wordCount && <span>· {doc.wordCount} kelime</span>}
                        <span>· {formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}>
                    {status.label}
                  </span>

                  {score && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      parseInt(score) >= 80 ? "bg-green-100 text-green-700" :
                      parseInt(score) >= 50 ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {score}
                    </span>
                  )}

                  {doc.status === "ANALYZED" && (
                    <Link
                      href={`/documents/${doc.id}?wizard=1`}
                      className="btn-primary text-xs"
                    >
                      Sonuçları İncele
                    </Link>
                  )}

                  {doc.status === "UPLOADED" && (
                    <Link
                      href={`/documents/${doc.id}`}
                      className="btn-secondary text-xs"
                    >
                      Analiz Et
                    </Link>
                  )}

                  {doc.status === "FAILED" && doc.errorMessage && (
                    <span className="text-xs text-red-600 max-w-[200px] truncate" title={doc.errorMessage}>
                      {doc.errorMessage}
                    </span>
                  )}

                  <button
                    onClick={() => handleDelete(doc.id, doc.originalName)}
                    disabled={deletingId === doc.id}
                    className="btn-danger text-xs p-2"
                    title="Belgeyi sil"
                  >
                    {deletingId === doc.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="btn-secondary text-sm"
              >
                Önceki
              </button>
              <span className="text-sm text-gray-600">
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-secondary text-sm"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
