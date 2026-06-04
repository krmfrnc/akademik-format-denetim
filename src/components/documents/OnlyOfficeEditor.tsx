"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { apiGet } from "@/lib/api-client";

interface OnlyOfficeEditorConfig {
  token: string;
  config: Record<string, unknown>;
  serverUrl: string;
  documentUrl: string;
}

interface OnlyOfficeEditorProps {
  documentId: string;
}

type DocEditorInstance = {
  destroyEditor: () => void;
  showMessage: (message: string) => void;
};

declare global {
  interface Window {
    DocsAPI?: {
      DocEditor: new (
        placeholderId: string,
        config: Record<string, unknown>,
      ) => DocEditorInstance;
    };
  }
}

export default function OnlyOfficeEditor({ documentId }: OnlyOfficeEditorProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<DocEditorInstance | null>(null);
  const placeholderId = `onlyoffice-editor-${documentId}`;

  const loadScript = useCallback(
    (serverUrl: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (window.DocsAPI?.DocEditor) {
          resolve();
          return;
        }

        const existingScript = document.querySelector(
          `script[src="${serverUrl}/web-apps/apps/api/documents/api.js"]`,
        );
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve());
          existingScript.addEventListener("error", () =>
            reject(new Error("OnlyOffice API yüklenemedi.")),
          );
          return;
        }

        const script = document.createElement("script");
        script.src = `${serverUrl}/web-apps/apps/api/documents/api.js`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () =>
          reject(new Error("OnlyOffice API yüklenemedi."));
        document.head.appendChild(script);
      });
    },
    [],
  );

  useEffect(() => {
    if (!documentId) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await apiGet<OnlyOfficeEditorConfig>(
          `/api/documents/${documentId}/editor`,
        );

        if (cancelled) return;

        await loadScript(result.serverUrl);

        if (cancelled) return;

        editorRef.current?.destroyEditor();

        const editor = new window.DocsAPI!.DocEditor(
          placeholderId,
          result.config,
        );
        editorRef.current = editor;
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Editör yüklenemedi.",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      editorRef.current?.destroyEditor();
      editorRef.current = null;
    };
  }, [documentId, placeholderId, loadScript]);

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
        <svg
          className="h-12 w-12 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

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
            <span className="text-xs text-gray-500">
              OnlyOffice Document Editor — Gerçek Word Deneyimi
            </span>
          </div>
          <span className="text-xs text-green-600 font-medium">&check; Aktif</span>
        </div>
        <div id={placeholderId} style={{ height: 680 }} />
      </div>
    </div>
  );
}
