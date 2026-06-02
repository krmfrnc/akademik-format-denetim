"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";

interface OnlyOfficeEditorConfig {
  token: string;
  onlyofficeUrl: string;
  serverUrl: string;
  documentUrl: string;
}

interface OnlyOfficeEditorProps {
  documentId: string;
}

export default function OnlyOfficeEditor({ documentId }: OnlyOfficeEditorProps) {
  const [config, setConfig] = useState<OnlyOfficeEditorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    (async () => {
      try {
        const result = await apiGet<OnlyOfficeEditorConfig>(
          `/api/documents/${documentId}/editor`,
        );
        setConfig(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Editör yüklenemedi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex h-[680px] flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <p className="text-sm text-gray-500">OnlyOffice editörü yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[680px] flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50">
        <svg className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!config) return null;

  const editorUrl = `${config.onlyofficeUrl}?jwt=${encodeURIComponent(config.token)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-gray-500">OnlyOffice Document Editor — Gerçek Word Deneyimi</span>
          </div>
          <span className="text-xs text-green-600 font-medium">✓ Aktif</span>
        </div>
        <iframe
          key={config.token}
          src={editorUrl}
          width="100%"
          height="680"
          frameBorder="0"
          allow="clipboard-write; clipboard-read; clipboard-cut; clipboard-paste"
          title="OnlyOffice Document Editor"
          className="block"
        />
      </div>
    </div>
  );
}