"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

interface FormatTemplateItem {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isPublic: boolean;
  version: number;
  createdAt: string;
}

export default function AdminFormatsPage() {
  const [templates, setTemplates] = useState<FormatTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    isPublic: false,
  });

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

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      await apiPost("/api/formats", form);
      setShowForm(false);
      setForm({ name: "", description: "", isPublic: false });
      await fetchTemplates();
    } catch {
      setError("Şablon oluşturulurken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu şablonu silmek istediğinize emin misiniz?")) return;
    try {
      await apiDelete(`/api/formats/${id}`);
      await fetchTemplates();
    } catch {
      setError("Şablon silinirken bir hata oluştu.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Format Şablonları
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          + Yeni Şablon
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="font-medium text-gray-900 mb-4">
            Yeni Format Şablonu
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="Şablon adı"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                rows={2}
                placeholder="Opsiyonel açıklama"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={form.isPublic}
                onChange={(e) =>
                  setForm({ ...form, isPublic: e.target.checked })
                }
                className="rounded"
              />
              <label
                htmlFor="isPublic"
                className="text-sm text-gray-700"
              >
                Herkese açık
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Oluştur"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-100"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-500">Yükleniyor...</div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Henüz bir şablon bulunmuyor.
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
            >
              <div>
                <h3 className="font-medium text-gray-900">{t.name}</h3>
                {t.description && (
                  <p className="text-sm text-gray-500">{t.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
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
                {!t.isSystem && (
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Sil
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
