"use client";

import { useCallback, useEffect, useState } from "react";
import FileUploadZone from "./FileUploadZone";
import { apiGet, apiUpload, apiPost } from "@/lib/api-client";

interface FormatTemplate {
  id: string;
  name: string;
  isSystem: boolean;
  description?: string | null;
  rules: Record<string, unknown> | null;
}

interface CitationStyle {
  id: string;
  name: string;
  shortName?: string | null;
  icon?: string | null;
  isSystem: boolean;
}

interface WizardProps {
  onComplete: (documentId: string) => void;
  onCancel: () => void;
}

const STEPS = [
  "Belge Seçimi",
  "Format Şablonu",
  "Kaynakça Stili",
  "Onay",
];

export default function DocumentUploadWizard({ onComplete, onCancel }: WizardProps) {
  const [step, setStep] = useState(0);
  const [formats, setFormats] = useState<FormatTemplate[]>([]);
  const [styles, setStyles] = useState<CitationStyle[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string>("");
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [autoSelectedStyle, setAutoSelectedStyle] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [fmtRes, styRes] = await Promise.all([
          apiGet<{ data: FormatTemplate[]; pagination: { total: number } }>("/api/formats?limit=100"),
          apiGet<{ data: CitationStyle[]; pagination: { total: number } }>("/api/citations?limit=100").catch(() => null),
        ]);
        setFormats(fmtRes.data || []);
        if (styRes) {
          setStyles((styRes as unknown as { data: CitationStyle[] }).data || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleFormatSelect = useCallback(
    (formatId: string) => {
      setSelectedFormatId(formatId);
      setUploadError(null);

      const format = formats.find((f) => f.id === formatId);
      if (!format) return;

      const citationStyleId = (format.rules as Record<string, unknown> | null)
        ?.citationStyleId as string | undefined;

      if (citationStyleId && styles.some((s) => s.id === citationStyleId)) {
        setSelectedStyleId(citationStyleId);
        setAutoSelectedStyle(true);
      } else {
        setSelectedStyleId("");
        setAutoSelectedStyle(false);
      }
    },
    [formats, styles],
  );

  const selectedFormat = formats.find((f) => f.id === selectedFormatId);
  const selectedStyle = styles.find((s) => s.id === selectedStyleId);

  const formatRules = (selectedFormat?.rules ?? {}) as Record<string, unknown>;
  const hasBodyRules = !!formatRules.body;
  const sections = ["body", "heading1", "heading2", "heading3", "abstract", "footnote", "blockQuote", "bibliography"]
    .filter((k) => !!formatRules[k]);
  const hasPageNumbers = !!formatRules.pageNumbers;
  const hasTables = !!formatRules.tables;

  const sectionLabels: Record<string, string> = {
    body: "Gövde Metni",
    heading1: "Başlık 1",
    heading2: "Başlık 2",
    heading3: "Başlık 3",
    abstract: "Özet",
    footnote: "Dipnot",
    blockQuote: "Uzun Alıntı",
    bibliography: "Kaynakça",
  };

  const canProceedStep0 = !!selectedFile;
  const canProceedStep1 = !!selectedFormatId;
  const canProceedStep2 = true;

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

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

      if (selectedFormatId || selectedStyleId) {
        try {
          await apiPost(`/api/documents/${uploadedDoc.id}/analyze`, {
            formatTemplateId: selectedFormatId || null,
            citationStyleId: selectedStyleId || null,
          });
        } catch {
          // Analysis start failure shouldn't block completion
        }
      }

      onComplete(uploadedDoc.id);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Yükleme sırasında bir hata oluştu.");
    } finally {
      setUploading(false);
    }
  };

  const stepPercent = Math.round(((step + 1) / STEPS.length) * 100);

  if (loading) {
    return (
      <div className="card flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Belge Yükleme Sihirbazı</h2>
        <p className="mt-1 text-sm text-gray-500">
          Belgenizi adım adım yükleyin, format şablonu ve kaynakça stili seçerek analiz edin.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Adım {step + 1} / {STEPS.length}: <span className="font-medium text-gray-900">{STEPS[step]}</span>
          </span>
          <span className="text-gray-400">{stepPercent}%</span>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${stepPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-center gap-2">
          {STEPS.map((s, i) => (
            <button
              key={s}
              onClick={() => {
                if (i <= step) setStep(i);
              }}
              disabled={i > step}
              title={s}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                i === step
                  ? "bg-indigo-600 w-6"
                  : i < step
                    ? "bg-indigo-400"
                    : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm text-indigo-800">
              <strong>1. Adım:</strong> Analiz edilecek .docx belgenizi sürükleyip bırakın veya seçmek için tıklayın.
            </p>
          </div>

          <FileUploadZone
            onFileSelected={setSelectedFile}
            disabled={uploading}
            uploadProgress={uploadProgress}
            isUploading={uploading}
            onRemove={() => {
              setSelectedFile(null);
              setUploadProgress(0);
            }}
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm text-indigo-800">
              <strong>2. Adım:</strong> Belgenizin uyması gereken format şablonunu seçin. Seçtiğiniz şablona göre yazı tipi, satır aralığı, kenar boşlukları gibi kurallar denetlenecektir.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {formats.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => handleFormatSelect(fmt.id)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedFormatId === fmt.id
                    ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{fmt.name}</p>
                  {fmt.isSystem && (
                    <span className="flex-shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                      Sistem
                    </span>
                  )}
                </div>
                {fmt.description && (
                  <p className="mt-1 text-xs text-gray-500 line-clamp-2">{fmt.description}</p>
                )}
              </button>
            ))}
          </div>

          {selectedFormat && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
              <p className="text-sm font-medium text-indigo-900 mb-2">Seçilen Şablon: {selectedFormat.name}</p>
              {selectedFormat.description && (
                <p className="text-xs text-gray-600 mb-3">{selectedFormat.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {sections.map((s) => (
                  <span key={s} className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    {sectionLabels[s] || s}
                  </span>
                ))}
                {hasPageNumbers && (
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    Sayfa Numarası
                  </span>
                )}
                {hasTables && (
                  <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    Tablolar
                  </span>
                )}
                {sections.length === 0 && !hasPageNumbers && !hasTables && (
                  <span className="text-xs text-gray-500">Henüz kural tanımlanmamış.</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm text-indigo-800">
              <strong>3. Adım:</strong> Kaynakça stilinizi seçin. Seçtiğiniz format şablonuna bir kaynakça stili atanmışsa otomatik olarak seçilir.
            </p>
          </div>

          {autoSelectedStyle && selectedStyle && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Format şablonundan otomatik seçildi: <span className="font-semibold">{selectedStyle.name}</span>
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {selectedFormat?.name} şablonu bu stili öneriyor. İsterseniz aşağıdan değiştirebilirsiniz.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {styles.map((sty) => (
              <button
                key={sty.id}
                onClick={() => { setSelectedStyleId(sty.id); setAutoSelectedStyle(false); }}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  selectedStyleId === sty.id
                    ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {sty.icon && <span className="text-lg">{sty.icon}</span>}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{sty.name}</p>
                    {sty.shortName && <p className="text-xs text-gray-500">{sty.shortName}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => {
                setSelectedStyleId("");
                setAutoSelectedStyle(false);
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Kaynakça stili kullanmadan devam et
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm text-indigo-800">
              <strong>4. Adım:</strong> Seçimlerinizi gözden geçirin ve belgenizi analize gönderin.
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{selectedFile?.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : ""}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-500">Format Şablonu</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFormat ? selectedFormat.name : "Seçilmedi"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Kaynakça Stili</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedStyle ? (
                      <span>
                        {selectedStyle.name}
                        {autoSelectedStyle && (
                          <span className="ml-1.5 text-xs text-green-600">(otomatik)</span>
                        )}
                      </span>
                    ) : "Seçilmedi"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {uploadError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {uploadError}
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Yükleniyor ve analiz başlatılıyor...</span>
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

          <div className="flex justify-center">
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="btn-primary px-8 py-3 text-base"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Yükleniyor...
                </span>
              ) : (
                "Yükle ve Analiz Et"
              )}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-200 pt-4">
        <button
          onClick={step === 0 ? onCancel : handlePrev}
          className="btn-secondary"
          disabled={uploading}
        >
          {step === 0 ? "İptal" : "← Geri"}
        </button>

        {step < STEPS.length - 1 && (
          <button
            onClick={handleNext}
            disabled={
              (step === 0 && !canProceedStep0) ||
              (step === 1 && !canProceedStep1) ||
              uploading
            }
            className="btn-primary"
          >
            İleri →
          </button>
        )}
      </div>
    </div>
  );
}
