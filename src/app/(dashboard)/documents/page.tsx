"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import FileUploadZone from "@/components/documents/FileUploadZone";
import { apiGet, apiUpload, apiPost } from "@/lib/api-client";

interface FormatTemplate {
  id: string;
  name: string;
  isSystem: boolean;
}

interface CitationStyle {
  id: string;
  name: string;
  isSystem: boolean;
}

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

interface CouponValidation {
  valid: boolean;
  coupon: { id: string; code: string; discountType: string; discountValue: number | null };
  discount: { originalAmount: number; discountAmount: number; finalAmount: number; formula: string };
  message: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  UPLOADED: { label: "Yüklendi", className: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "Analiz Ediliyor", className: "bg-amber-100 text-amber-700" },
  ANALYZED: { label: "Analiz Tamamlandı", className: "bg-green-100 text-green-700" },
  FAILED: { label: "Başarısız", className: "bg-red-100 text-red-700" },
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formats, setFormats] = useState<FormatTemplate[]>([]);
  const [styles, setStyles] = useState<CitationStyle[]>([]);

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidation | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

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

  const fetchTemplates = useCallback(async () => {
    try {
      const [formatResult, styleResult] = await Promise.all([
        apiGet<{ data: FormatTemplate[] }>("/api/formats?limit=100"),
        apiGet<{ data: CitationStyle[] }>("/api/citations?limit=100").catch(() => null),
      ]);
      setFormats(formatResult.data || []);
      if (styleResult) {
        setStyles((styleResult as unknown as { data: CitationStyle[] }).data || []);
      }
    } catch {
      // Şablonlar yüklenemezse ana işlemi bloke etme
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchTemplates();
  }, [fetchDocuments, fetchTemplates]);

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadError(null);
    setUploadSuccess(false);
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadError(null);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadedDoc = await apiUpload<{ id: string; originalName: string }>(
        "/api/documents",
        formData,
        (percent) => setUploadProgress(percent),
      );

      if (selectedFormat || selectedStyle) {
        try {
          await apiPost(`/api/documents/${uploadedDoc.id}/analyze`, {
            formatTemplateId: selectedFormat || null,
            citationStyleId: selectedStyle || null,
          });
        } catch {
          // Analiz başlatma başarısız olsa bile belge yüklendi
        }
      }

      setUploadSuccess(true);
      setSelectedFile(null);
      setSelectedFormat("");
      setSelectedStyle("");
      setCouponCode("");
      setCouponResult(null);
      setShowUpload(false);

      await fetchDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Yükleme sırasında bir hata oluştu.");
    } finally {
      setUploading(false);
    }
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;

    try {
      setCouponLoading(true);
      setCouponError(null);
      const result = await apiPost<CouponValidation>("/api/coupons/validate", {
        code: couponCode.trim(),
        cartType: "SUBSCRIPTION",
        cartAmount: 0,
      });
      setCouponResult(result);
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Kupon doğrulanamadı.");
      setCouponResult(null);
    } finally {
      setCouponLoading(false);
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
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Belge Yükle</h2>

          <FileUploadZone
            onFileSelected={handleFileSelected}
            disabled={uploading}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-text">Format Şablonu (isteğe bağlı)</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="input-field"
                disabled={uploading}
              >
                <option value="">Seçiniz...</option>
                {formats.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.isSystem ? "(Sistem)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text">Kaynakça Stili (isteğe bağlı)</label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="input-field"
                disabled={uploading}
              >
                <option value="">Seçiniz...</option>
                {styles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.isSystem ? "(Sistem)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <label className="label-text">Kupon Kodu</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Kupon kodunuz varsa giriniz..."
                className="input-field flex-1"
                disabled={uploading || couponLoading}
              />
              <button
                onClick={handleValidateCoupon}
                disabled={!couponCode.trim() || couponLoading}
                className="btn-secondary"
              >
                {couponLoading ? "Kontrol ediliyor..." : "Uygula"}
              </button>
            </div>

            {couponError && (
              <p className="mt-2 text-sm text-red-600">{couponError}</p>
            )}

            {couponResult?.valid && (
              <div className="mt-2 rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-sm font-medium text-green-800">
                  {couponResult.message}
                </p>
                {couponResult.discount.discountAmount > 0 && (
                  <p className="mt-1 text-sm text-green-700">
                    İndirim: {couponResult.discount.formula}
                  </p>
                )}
              </div>
            )}
          </div>

          {uploadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Belge başarıyla yüklendi!
            </div>
          )}

          {uploading && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Yükleniyor...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowUpload(false);
                setSelectedFile(null);
                setUploadError(null);
              }}
              className="btn-secondary"
              disabled={uploading}
            >
              İptal
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="btn-primary"
            >
              {uploading ? "Yükleniyor..." : "Yükle"}
            </button>
          </div>
        </div>
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
                      href={`/documents/${doc.id}`}
                      className="btn-primary text-xs"
                    >
                      Sonuçları İncele
                    </Link>
                  )}

                  {doc.status === "UPLOADED" && formats.length > 0 && (
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
