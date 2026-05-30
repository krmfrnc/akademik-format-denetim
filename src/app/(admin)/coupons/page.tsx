"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api-client";

interface CouponItem {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE";
  discountValue: string | null;
  maxDiscount: string | null;
  appliesTo: string[];
  targetType: "ALL_USERS" | "SPECIFIC_USERS" | "EMAIL_DOMAIN" | "NEW_USERS_ONLY";
  targetUserIds: string[];
  targetDomains: string[];
  maxTotalUses: number | null;
  maxUsesPerUser: number | null;
  currentTotalUses: number;
  minCartAmount: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { usages: number };
  plans?: { plan: { id: string; name: string } }[];
  packages?: { package: { id: string; name: string } }[];
}

interface PaginatedCoupons {
  data: CouponItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface CouponFormState {
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE";
  discountValue: string;
  maxDiscount: string;
  appliesTo: string[];
  targetType: "ALL_USERS" | "SPECIFIC_USERS" | "EMAIL_DOMAIN" | "NEW_USERS_ONLY";
  targetDomains: string;
  maxTotalUses: string;
  maxUsesPerUser: string;
  minCartAmount: string;
  startsAt: string;
  expiresAt: string;
}

const initialForm: CouponFormState = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  maxDiscount: "",
  appliesTo: ["SUBSCRIPTION", "CREDIT_PACKAGE"],
  targetType: "ALL_USERS",
  targetDomains: "",
  maxTotalUses: "",
  maxUsesPerUser: "1",
  minCartAmount: "",
  startsAt: "",
  expiresAt: "",
};

const discountTypeLabels: Record<string, string> = {
  PERCENTAGE: "Yüzde (%)",
  FIXED_AMOUNT: "Sabit Tutar",
  FREE: "Ücretsiz (%100)",
};

const targetTypeLabels: Record<string, string> = {
  ALL_USERS: "Tüm Kullanıcılar",
  SPECIFIC_USERS: "Belirli Kullanıcılar",
  EMAIL_DOMAIN: "E-posta Domaini (.edu.tr vb.)",
  NEW_USERS_ONLY: "Yalnızca Yeni Kullanıcılar",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CouponFormState>({ ...initialForm });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<PaginatedCoupons>(
        `/api/coupons?page=${pagination.page}&limit=${pagination.limit}`,
      );
      setCoupons(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kuponlar yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleCreate = async () => {
    try {
      setSaving(true);
      setFormError(null);
      setFormSuccess(false);

      if (!form.code.trim() || form.code.trim().length < 3) {
        setFormError("Kupon kodu en az 3 karakter olmalıdır.");
        return;
      }

      const discountValue =
        form.discountType === "FREE" ? null : parseFloat(form.discountValue) || 0;

      const payload = {
        code: form.code.trim(),
        description: form.description.trim() || null,
        discountType: form.discountType,
        discountValue,
        maxDiscount:
          form.discountType === "PERCENTAGE" && form.maxDiscount
            ? parseFloat(form.maxDiscount)
            : null,
        appliesTo: form.appliesTo,
        targetType: form.targetType,
        targetDomains:
          form.targetType === "EMAIL_DOMAIN"
            ? form.targetDomains
                .split(",")
                .map((d) => d.trim().toLowerCase())
                .filter(Boolean)
            : [],
        maxTotalUses: form.maxTotalUses ? parseInt(form.maxTotalUses, 10) : null,
        maxUsesPerUser: parseInt(form.maxUsesPerUser, 10) || 1,
        minCartAmount: form.minCartAmount ? parseFloat(form.minCartAmount) : null,
        startsAt: form.startsAt || null,
        expiresAt: form.expiresAt || null,
      };

      await apiPost("/api/coupons", payload);

      setFormSuccess(true);
      setForm({ ...initialForm });

      setTimeout(() => setFormSuccess(false), 3000);
      await fetchCoupons();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Kupon oluşturulurken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu kuponu silmek istediğinize emin misiniz?")) return;

    try {
      setDeleting(id);
      await apiDelete(`/api/coupons/${id}`);
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kupon silinirken bir hata oluştu.");
    } finally {
      setDeleting(null);
    }
  };

  const formatCurrency = (value: string | null): string => {
    if (!value) return "-";
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(parseFloat(value));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kupon Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">
            İndirim kuponları oluşturun ve mevcut kuponları yönetin.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Formu Kapat" : "Yeni Kupon Oluştur"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {showForm && (
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Yeni Kupon</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-text">Kupon Kodu *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="UNI2026"
                className="input-field"
                maxLength={50}
              />
            </div>
            <div>
              <label className="label-text">Açıklama</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Bahar dönemi indirimi..."
                className="input-field"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label-text">İndirim Türü *</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as CouponFormState["discountType"] })}
                className="input-field"
              >
                <option value="PERCENTAGE">Yüzde (%)</option>
                <option value="FIXED_AMOUNT">Sabit Tutar (₺)</option>
                <option value="FREE">Ücretsiz (%100)</option>
              </select>
            </div>
            {form.discountType !== "FREE" && (
              <div>
                <label className="label-text">
                  {form.discountType === "PERCENTAGE" ? "İndirim Oranı (%)" : "İndirim Tutarı (₺)"}
                </label>
                <input
                  type="number"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  placeholder={form.discountType === "PERCENTAGE" ? "20" : "100"}
                  className="input-field"
                  min={0}
                  max={form.discountType === "PERCENTAGE" ? 100 : undefined}
                  step={0.01}
                />
              </div>
            )}
            {form.discountType === "PERCENTAGE" && (
              <div>
                <label className="label-text">Maks. İndirim (₺, opsiyonel)</label>
                <input
                  type="number"
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="500"
                  className="input-field"
                  min={0}
                  step={0.01}
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-text">Hedef Kitle *</label>
              <select
                value={form.targetType}
                onChange={(e) => setForm({ ...form, targetType: e.target.value as CouponFormState["targetType"] })}
                className="input-field"
              >
                <option value="ALL_USERS">Tüm Kullanıcılar</option>
                <option value="EMAIL_DOMAIN">E-posta Domaini (.edu.tr vb.)</option>
                <option value="SPECIFIC_USERS">Belirli Kullanıcılar</option>
                <option value="NEW_USERS_ONLY">Yalnızca Yeni Kullanıcılar</option>
              </select>
            </div>

            <div>
              <label className="label-text">Geçerli Sepet Tipleri</label>
              <div className="mt-1 space-x-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.appliesTo.includes("SUBSCRIPTION")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, appliesTo: [...form.appliesTo, "SUBSCRIPTION"] });
                      } else {
                        setForm({ ...form, appliesTo: form.appliesTo.filter((a) => a !== "SUBSCRIPTION") });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  Abonelik
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.appliesTo.includes("CREDIT_PACKAGE")}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, appliesTo: [...form.appliesTo, "CREDIT_PACKAGE"] });
                      } else {
                        setForm({ ...form, appliesTo: form.appliesTo.filter((a) => a !== "CREDIT_PACKAGE") });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  Kredi Paketi
                </label>
              </div>
            </div>
          </div>

          {form.targetType === "EMAIL_DOMAIN" && (
            <div>
              <label className="label-text">Hedef Domain Listesi</label>
              <input
                type="text"
                value={form.targetDomains}
                onChange={(e) => setForm({ ...form, targetDomains: e.target.value })}
                placeholder="ankara.edu.tr, itu.edu.tr, hacettepe.edu.tr"
                className="input-field"
              />
              <p className="mt-1 text-xs text-gray-500">
                Virgülle ayırarak birden fazla domain girebilirsiniz. Örn: ciu.edu.tr, neu.edu.tr
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label-text">Toplam Kullanım Limiti</label>
              <input
                type="number"
                value={form.maxTotalUses}
                onChange={(e) => setForm({ ...form, maxTotalUses: e.target.value })}
                placeholder="Sınırsız"
                className="input-field"
                min={1}
              />
            </div>
            <div>
              <label className="label-text">Kişi Başı Limit</label>
              <input
                type="number"
                value={form.maxUsesPerUser}
                onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })}
                className="input-field"
                min={1}
              />
            </div>
            <div>
              <label className="label-text">Min. Sepet Tutarı (₺)</label>
              <input
                type="number"
                value={form.minCartAmount}
                onChange={(e) => setForm({ ...form, minCartAmount: e.target.value })}
                placeholder="Limit yok"
                className="input-field"
                min={0}
                step={0.01}
              />
            </div>
            <div>
              <label className="label-text">Geçerlilik Başlangıcı</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-text">Son Kullanma Tarihi</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Kupon başarıyla oluşturuldu.
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowForm(false);
                setForm({ ...initialForm });
                setFormError(null);
              }}
              className="btn-secondary"
            >
              İptal
            </button>
            <button onClick={handleCreate} disabled={saving} className="btn-primary">
              {saving ? "Oluşturuluyor..." : "Kupon Oluştur"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        </div>
      ) : coupons.length === 0 ? (
        <div className="card py-16 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </div>
          <p className="mt-4 text-sm text-gray-500">Henüz kupon oluşturulmadı.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-sm font-semibold text-gray-900">
                      {coupon.code}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      coupon.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {coupon.isActive ? "Aktif" : "Pasif"}
                    </span>
                    <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {discountTypeLabels[coupon.discountType] || coupon.discountType}
                    </span>
                    {coupon.discountValue && (
                      <span className="text-xs text-gray-600">
                        {coupon.discountType === "PERCENTAGE"
                          ? `%${parseFloat(coupon.discountValue)}`
                          : formatCurrency(coupon.discountValue)}
                      </span>
                    )}
                  </div>

                  {coupon.description && (
                    <p className="mt-2 text-sm text-gray-600">{coupon.description}</p>
                  )}

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span>
                      Hedef:{" "}
                      <span className="font-medium text-gray-700">
                        {targetTypeLabels[coupon.targetType] || coupon.targetType}
                      </span>
                    </span>

                    {coupon.targetType === "EMAIL_DOMAIN" && coupon.targetDomains.length > 0 && (
                      <span>
                        Domainler:{" "}
                        <span className="font-medium text-gray-700">
                          {coupon.targetDomains.join(", ")}
                        </span>
                      </span>
                    )}

                    <span>
                      Kullanım:{" "}
                      <span className="font-medium text-gray-700">
                        {coupon.currentTotalUses}
                        {coupon.maxTotalUses ? ` / ${coupon.maxTotalUses}` : ""}
                      </span>
                    </span>

                    {coupon.expiresAt && (
                      <span>
                        Bitiş:{" "}
                        <span className="font-medium text-gray-700">
                          {new Date(coupon.expiresAt).toLocaleDateString("tr-TR")}
                        </span>
                      </span>
                    )}

                    <span>
                      Oluşturulma:{" "}
                      {new Date(coupon.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(coupon.id)}
                  disabled={deleting === coupon.id}
                  className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting === coupon.id ? "Siliniyor..." : "Sil"}
                </button>
              </div>
            </div>
          ))}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page <= 1}
                className="btn-secondary text-sm"
              >
                Önceki
              </button>
              <span className="text-sm text-gray-600">
                Sayfa {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="btn-secondary text-sm"
              >
                Sonraki
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
