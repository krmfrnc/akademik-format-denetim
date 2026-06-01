"use client";

import { useEffect, useRef } from "react";

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

interface ViolationPopoverProps {
  violation: ViolationData | null;
  position: { top: number; left: number } | null;
  onFix: (violation: ViolationData) => void;
  onLeave: (violationId: string) => void;
  onClose: () => void;
}

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

const severityStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  ERROR: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300", label: "Hata" },
  WARNING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-300", label: "Uyarı" },
  INFO: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300", label: "Bilgi" },
};

export default function ViolationPopover({
  violation,
  position,
  onFix,
  onLeave,
  onClose,
}: ViolationPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!violation || !position) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [violation, position, onClose]);

  if (!violation || !position) return null;

  const sev = severityStyles[violation.severity] || severityStyles.INFO;
  const canFix = ["FONT_FAMILY", "FONT_SIZE", "BOLD", "ITALIC", "ALIGNMENT"].includes(violation.type);

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-80 rounded-xl bg-white shadow-xl ring-1 ring-black/5"
      style={{ top: position.top + 8, left: position.left }}
    >
      <div className="rounded-t-xl bg-gray-50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${sev.bg} ${sev.text}`}>
              {sev.label}
            </span>
            <span className="text-xs font-medium text-gray-600">
              {violationTypeLabels[violation.type] || violation.type}
            </span>
          </div>
          <button onClick={onClose} className="rounded p-0.5 text-gray-400 hover:text-gray-600">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {violation.section && (
          <p className="mt-1 text-xs text-gray-400">{violation.section} · {violation.location}</p>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-gray-700">{violation.description}</p>

        <div className="grid gap-2 grid-cols-2">
          <div className="rounded-lg bg-red-50 px-3 py-2">
            <p className="text-xs font-medium text-red-600 mb-0.5">Bulunan</p>
            <p className="text-xs text-red-700">{violation.found}</p>
          </div>
          <div className="rounded-lg bg-green-50 px-3 py-2">
            <p className="text-xs font-medium text-green-600 mb-0.5">Beklenen</p>
            <p className="text-xs text-green-700">{violation.expected}</p>
          </div>
        </div>

        {violation.suggestion && (
          <div className="rounded-lg bg-indigo-50 px-3 py-2">
            <p className="text-xs font-medium text-indigo-600 mb-0.5">Öneri</p>
            <p className="text-xs text-indigo-700">{violation.suggestion}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-2.5 bg-gray-50 rounded-b-xl">
        <button
          onClick={() => onLeave(violation.id)}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
        >
          Bırak
        </button>
        <button
          onClick={() => onFix(violation)}
          disabled={!canFix}
          className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
            canFix
              ? "bg-indigo-600 text-white hover:bg-indigo-500"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          Düzelt
        </button>
      </div>
    </div>
  );
}
