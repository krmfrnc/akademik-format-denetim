"use client";

import { useMemo, useState } from "react";

interface Violation {
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

const severityStyles: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
  ERROR: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-l-red-500",
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
    label: "Hata",
  },
  WARNING: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-l-amber-500",
    icon: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z",
    label: "Uyarı",
  },
  INFO: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-l-blue-500",
    icon: "M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
    label: "Bilgi",
  },
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

interface ViolationWizardProps {
  violations: Violation[];
  dismissedIds: Set<string>;
  onDismiss: (id: string) => void;
  onRestoreAll: () => void;
  onViewAll: () => void;
}

export default function ViolationWizard({
  violations,
  dismissedIds,
  onDismiss,
  onRestoreAll,
  onViewAll,
}: ViolationWizardProps) {
  const visibleViolations = useMemo(
    () => violations.filter((v) => !dismissedIds.has(v.id)),
    [violations, dismissedIds],
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  if (visibleViolations.length === 0) {
    const allDismissed = violations.length > 0 && dismissedIds.size === violations.length;

    return (
      <div className="card py-12 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {violations.length === 0 ? (
          <>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Tebrikler!</h3>
            <p className="mt-1 text-sm text-gray-500">
              Belgeniz tüm format kurallarına uygun. Herhangi bir ihlal tespit edilmedi.
            </p>
          </>
        ) : allDismissed ? (
          <>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Tüm İhlaller Gözardı Edildi</h3>
            <p className="mt-1 text-sm text-gray-500">
              Tüm ihlalleri gözardı ettiniz. İsterseniz geri yükleyebilirsiniz.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button onClick={onRestoreAll} className="btn-secondary text-sm">
                Tümünü Geri Yükle
              </button>
              <button onClick={onViewAll} className="btn-primary text-sm">
                Tüm İhlalleri Listele
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">İhlal Bulunamadı</h3>
            <button onClick={onViewAll} className="btn-primary mt-4 text-sm">
              Tüm İhlalleri Listele
            </button>
          </>
        )}
      </div>
    );
  }

  const v = visibleViolations[currentIndex];
  if (!v) {
    return (
      <div className="card py-12 text-center">
        <p className="text-gray-500">Gösterilecek ihlal kalmadı.</p>
        <button onClick={onViewAll} className="btn-primary mt-4 text-sm">
          Tüm İhlalleri Listele
        </button>
      </div>
    );
  }

  const sev = severityStyles[v.severity] || severityStyles.INFO;
  const dismissedCount = dismissedIds.size;
  const totalCount = violations.length;
  const progress = totalCount > 0 ? Math.round((dismissedCount / totalCount) * 100) : 0;

  const handleDismissAndNext = () => {
    onDismiss(v.id);
    if (currentIndex >= visibleViolations.length - 1) {
      setCurrentIndex(Math.max(0, currentIndex - 1));
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Adım Adım Düzeltme
            </h3>
            <p className="text-sm text-gray-500">
              {dismissedCount}/{totalCount} gözardı edildi · {visibleViolations.length} kaldı
            </p>
          </div>
          <button onClick={onViewAll} className="text-sm text-indigo-600 hover:text-indigo-800">
            Tümünü Listele
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>İlerleme</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {currentIndex + 1} / {visibleViolations.length}
          </span>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(visibleViolations.length, 20) }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === currentIndex ? "w-6 bg-indigo-600" : "w-2 bg-gray-300"
                }`}
                title={`${i + 1}. ihlal`}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl border-l-4 bg-white p-6 shadow-sm ${sev.border}`}
      >
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${sev.bg} ${sev.text}`}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d={sev.icon} />
                </svg>
                {sev.label}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {violationTypeLabels[v.type] || v.type}
              </span>
              {v.section && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  {v.section}
                </span>
              )}
            </div>

            {v.location && (
              <p className="text-xs text-gray-400 mb-2">Konum: {v.location}</p>
            )}

            <p className="text-base text-gray-800 font-medium">{v.description}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-red-50 p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">Bulunan</span>
              </div>
              <p className="text-sm text-red-700">{v.found}</p>
            </div>

            <div className="rounded-xl bg-green-50 p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Beklenen</span>
              </div>
              <p className="text-sm text-green-700">{v.expected}</p>
            </div>
          </div>

          {v.suggestion && (
            <div className="rounded-xl bg-indigo-50 p-4 border border-indigo-100">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
                <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Düzeltme Önerisi</span>
              </div>
              <p className="text-sm text-indigo-700">{v.suggestion}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="btn-secondary text-sm"
          >
            ← Önceki
          </button>
          <button
            onClick={() => setCurrentIndex(Math.min(visibleViolations.length - 1, currentIndex + 1))}
            disabled={currentIndex >= visibleViolations.length - 1}
            className="btn-secondary text-sm"
          >
            Sonraki →
          </button>
        </div>

        <button
          onClick={handleDismissAndNext}
          className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
          Gözardı Et
        </button>
      </div>

      <div className="text-center">
        <button onClick={onRestoreAll} className="text-xs text-gray-400 hover:text-gray-600">
          Tüm gözardı edilenleri geri yükle
        </button>
      </div>
    </div>
  );
}
