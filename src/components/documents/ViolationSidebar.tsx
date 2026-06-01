"use client";

import { useMemo } from "react";

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

interface ViolationSidebarProps {
  violations: ViolationData[];
  dismissedIds: Set<string>;
  onViolationClick: (violation: ViolationData) => void;
  activeViolationId: string | null;
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

const severityColors: Record<string, string> = {
  ERROR: "bg-red-500",
  WARNING: "bg-amber-500",
  INFO: "bg-blue-500",
};

export default function ViolationSidebar({
  violations,
  dismissedIds,
  onViolationClick,
  activeViolationId,
}: ViolationSidebarProps) {
  const activeViolations = useMemo(
    () => violations.filter((v) => !dismissedIds.has(v.id)),
    [violations, dismissedIds],
  );

  const dismissedViolations = useMemo(
    () => violations.filter((v) => dismissedIds.has(v.id)),
    [violations, dismissedIds],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Format İhlalleri ({activeViolations.length})
        </h3>

        {activeViolations.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {violations.length === 0 ? "İhlal tespit edilmedi." : "Tüm ihlaller gözardı edildi."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {activeViolations.map((v) => (
              <button
                key={v.id}
                onClick={() => onViolationClick(v)}
                className={`w-full rounded-lg p-2.5 text-left transition-colors ${
                  activeViolationId === v.id
                    ? "bg-indigo-50 ring-1 ring-indigo-200"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${severityColors[v.severity] || "bg-gray-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-800 truncate">
                        {violationTypeLabels[v.type] || v.type}
                      </span>
                    </div>
                    {v.location && (
                      <p className="mt-0.5 text-xs text-gray-400 truncate">{v.location}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {dismissedViolations.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <h4 className="text-xs font-medium text-gray-500 mb-2">
              Gözardı Edilen ({dismissedViolations.length})
            </h4>
            <div className="space-y-1">
              {dismissedViolations.map((v) => (
                <div
                  key={v.id}
                  className="rounded-lg p-2 opacity-50"
                >
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-gray-300" />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-gray-500 line-through">
                        {violationTypeLabels[v.type] || v.type}
                      </span>
                      {v.location && (
                        <p className="mt-0.5 text-xs text-gray-300 truncate">{v.location}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
