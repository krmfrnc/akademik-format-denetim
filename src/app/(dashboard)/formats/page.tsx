"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api-client";

interface FormatTemplateItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isPublic: boolean;
  version: number;
  createdAt: string;
}

export default function FormatsPage() {
  const [templates, setTemplates] = useState<FormatTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<{
        data: FormatTemplateItem[];
        pagination: { total: number };
      }>("/api/formats?limit=100");
      setTemplates(result.data ?? []);
    } catch (err) {
      setError("Şablonlar yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Format Şablonları
        </h1>
      </div>

      <p className="text-gray-500 mb-6">
        Belge analizinde kullanılan format şablonlarını görüntüleyin. Şablonlar
        yazı tipi, satır aralığı, kenar boşlukları gibi kuralları içerir.
      </p>

      {loading && (
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!loading && !error && templates.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Henüz bir şablon bulunmuyor.</p>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{t.name}</h3>
                  {t.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {t.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {t.isSystem && (
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      Sistem
                    </span>
                  )}
                  {t.isPublic && (
                    <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                      Herkese Açık
                    </span>
                  )}
                  <span className="text-xs text-gray-400">v{t.version}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
