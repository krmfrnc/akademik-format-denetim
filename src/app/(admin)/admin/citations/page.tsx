"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import CitationEditor from "@/components/citations/CitationEditor";
import type { CitationStyleRules } from "@/services/docx-analyzer/types";

interface CitationStyleItem {
  id: string;
  name: string;
  shortName: string | null;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  icon: string | null;
  createdAt: string;
}

export default function AdminCitationsPage() {
  const [styles, setStyles] = useState<CitationStyleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchStyles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<{ data: CitationStyleItem[] }>("/api/citations?limit=100");
      setStyles(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStyles(); }, [fetchStyles]);

  const handleCreate = async (data: {
    name: string;
    shortName?: string;
    description?: string;
    icon?: string;
    rules: CitationStyleRules;
  }) => {
    setError(null);
    try {
      setSaving(true);
      await apiPost("/api/citations", data);
      setShowForm(false);
      fetchStyles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stil oluşturulurken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (style: CitationStyleItem) => {
    try {
      await apiPut(`/api/citations/${style.id}`, { isActive: !style.isActive });
      fetchStyles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu stili silmek istediğinize emin misiniz?")) return;
    try {
      await apiDelete(`/api/citations/${id}`);
      fetchStyles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hata");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Atıf Stilleri</h1>
          <p className="mt-1 text-sm text-gray-500">Kaynakça ve atıf stillerini yönetin.</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); }}
          className="btn-primary"
        >
          {showForm ? "Vazgeç" : "Yeni Stil"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <CitationEditor
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {styles.map((s) => (
            <div key={s.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{s.icon || "📄"}</span>
                <div>
                  <p className="font-medium text-gray-900">
                    {s.name}{" "}
                    {s.shortName && <span className="text-xs text-gray-500">({s.shortName})</span>}
                  </p>
                  {s.description && <p className="text-xs text-gray-500">{s.description}</p>}
                </div>
                {s.isSystem && (
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Sistem</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleActive(s)}
                  className={`text-xs rounded-full px-2 py-0.5 font-medium ${
                    s.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {s.isActive ? "Aktif" : "Pasif"}
                </button>
                {!s.isSystem && (
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:text-red-800">
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
