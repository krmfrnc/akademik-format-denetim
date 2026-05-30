"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

interface PlanItem {
  id: string;
  name: string;
  description: string | null;
  interval: string;
  price: string;
  currency: string;
  analysisLimit: number | null;
  maxFileSizeMB: number;
  concurrentLimit: number;
  isActive: boolean;
  sortOrder: number;
  _count: { subscriptions: number };
}

const intervalLabels: Record<string, string> = {
  MONTHLY: "Aylık", YEARLY: "Yıllık", LIFETIME: "Ömür Boyu",
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", description: "", interval: "MONTHLY",
    price: "", currency: "TRY", analysisLimit: "", maxFileSizeMB: "50", concurrentLimit: "1",
  });

  const fetchPlans = useCallback(async () => {
    try { setLoading(true);
      const result = await apiGet<{ data: PlanItem[] }>("/api/admin/plans");
      setPlans(result.data);
    } catch (err) { setError(err instanceof Error ? err.message : "Hata"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = {
        name: form.name, description: form.description || null,
        interval: form.interval, price: parseFloat(form.price) || 0,
        currency: form.currency,
        analysisLimit: form.analysisLimit ? parseInt(form.analysisLimit) : null,
        maxFileSizeMB: parseInt(form.maxFileSizeMB) || 50,
        concurrentLimit: parseInt(form.concurrentLimit) || 1,
        features: {},
      };

      if (editingId) {
        await apiPut(`/api/admin/plans/${editingId}`, payload);
      } else {
        await apiPost("/api/admin/plans", payload);
      }

      setShowForm(false); setEditingId(null);
      setForm({ name: "", description: "", interval: "MONTHLY", price: "", currency: "TRY", analysisLimit: "", maxFileSizeMB: "50", concurrentLimit: "1" });
      fetchPlans();
    } catch (err) { setError(err instanceof Error ? err.message : "Hata"); }
    finally { setSaving(false); }
  };

  const handleEdit = (plan: PlanItem) => {
    setEditingId(plan.id); setShowForm(true);
    setForm({
      name: plan.name, description: plan.description ?? "",
      interval: plan.interval, price: plan.price,
      currency: plan.currency,
      analysisLimit: plan.analysisLimit?.toString() ?? "",
      maxFileSizeMB: plan.maxFileSizeMB.toString(),
      concurrentLimit: plan.concurrentLimit.toString(),
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu planı silmek istediğinize emin misiniz?")) return;
    try { await apiDelete(`/api/admin/plans/${id}`); fetchPlans(); }
    catch (err) { setError(err instanceof Error ? err.message : "Hata"); }
  };

  const handleToggleActive = async (plan: PlanItem) => {
    try {
      await apiPut(`/api/admin/plans/${plan.id}`, { isActive: !plan.isActive });
      fetchPlans();
    } catch (err) { setError(err instanceof Error ? err.message : "Hata"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abonelik Planları</h1>
          <p className="mt-1 text-sm text-gray-500">Planları oluşturun, düzenleyin ve yönetin.</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", description: "", interval: "MONTHLY", price: "", currency: "TRY", analysisLimit: "", maxFileSizeMB: "50", concurrentLimit: "1" }); }} className="btn-primary">
          {showForm ? "Vazgeç" : "Yeni Plan"}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold">{editingId ? "Planı Düzenle" : "Yeni Plan"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label-text">Plan Adı *</label><input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" /></div>
            <div><label className="label-text">Aralık *</label><select value={form.interval} onChange={e => setForm({...form, interval: e.target.value})} className="input-field"><option value="MONTHLY">Aylık</option><option value="YEARLY">Yıllık</option><option value="LIFETIME">Ömür Boyu</option></select></div>
            <div><label className="label-text">Fiyat *</label><input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="input-field" step="0.01" /></div>
            <div><label className="label-text">Para Birimi</label><select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="input-field"><option value="TRY">TRY</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
            <div><label className="label-text">Analiz Limiti (boş=sınırsız)</label><input type="number" value={form.analysisLimit} onChange={e => setForm({...form, analysisLimit: e.target.value})} className="input-field" /></div>
            <div><label className="label-text">Max Dosya (MB)</label><input type="number" value={form.maxFileSizeMB} onChange={e => setForm({...form, maxFileSizeMB: e.target.value})} className="input-field" /></div>
            <div><label className="label-text">Eş Zamanlı Analiz</label><input type="number" value={form.concurrentLimit} onChange={e => setForm({...form, concurrentLimit: e.target.value})} className="input-field" /></div>
            <div><label className="label-text">Açıklama</label><input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field" /></div>
          </div>
          <div className="flex justify-end"><button onClick={handleSubmit} disabled={saving} className="btn-primary">{saving ? "Kaydediliyor..." : "Kaydet"}</button></div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className={`card ${!p.isActive && "opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="text-xs text-gray-500">{intervalLabels[p.interval] || p.interval}</p>
                </div>
                <button onClick={() => handleToggleActive(p)} className={`text-xs rounded-full px-2 py-0.5 font-medium ${p.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{p.isActive ? "Aktif" : "Pasif"}</button>
              </div>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {new Intl.NumberFormat("tr-TR", { style: "currency", currency: p.currency }).format(parseFloat(p.price))}
              </p>
              <div className="mt-3 space-y-1 text-xs text-gray-600">
                {p.analysisLimit ? <p>Dönem başı {p.analysisLimit} analiz</p> : <p>Sınırsız analiz</p>}
                <p>Max {p.maxFileSizeMB} MB dosya</p>
                <p>{p.concurrentLimit} eş zamanlı analiz</p>
                <p>{p._count.subscriptions} abone</p>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => handleEdit(p)} className="btn-secondary flex-1 text-xs">Düzenle</button>
                <button onClick={() => handleDelete(p.id)} className="btn-danger flex-1 text-xs">Sil</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
