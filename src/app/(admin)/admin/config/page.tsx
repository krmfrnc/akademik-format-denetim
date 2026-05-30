"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPut } from "@/lib/api-client";

interface SystemConfigItem {
  key: string;
  value: unknown;
  description: string | null;
  updatedAt: string;
}

interface ConfigState {
  "feature.subscriptions_enabled": boolean;
  "feature.credits_enabled": boolean;
  "feature.registration_open": boolean;
  "limits.max_file_size_mb": number;
  "limits.free_analyses_per_user": number;
  "limits.analysis_timeout_seconds": number;
  "billing.default_currency": string;
  "billing.tax_rate": number;
  "storage.type": string;
  "storage.local_path": string;
  "storage.s3_bucket": string;
  "storage.s3_region": string;
}

const defaultConfig: ConfigState = {
  "feature.subscriptions_enabled": true,
  "feature.credits_enabled": true,
  "feature.registration_open": true,
  "limits.max_file_size_mb": 100,
  "limits.free_analyses_per_user": 3,
  "limits.analysis_timeout_seconds": 250,
  "billing.default_currency": "TRY",
  "billing.tax_rate": 18,
  "storage.type": "local",
  "storage.local_path": "/uploads/documents",
  "storage.s3_bucket": "",
  "storage.s3_region": "eu-west-1",
};

export default function AdminConfigPage() {
  const [config, setConfig] = useState<ConfigState>(defaultConfig);
  const [items, setItems] = useState<SystemConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiGet<{ configs: Record<string, unknown>; items: SystemConfigItem[] }>(
        "/api/admin/config",
      );

      const merged = { ...defaultConfig };
      if (result.configs) {
        for (const [key, value] of Object.entries(result.configs)) {
          (merged as Record<string, unknown>)[key] = value;
        }
      }

      setConfig(merged);
      setItems(result.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ayarlar yüklenirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      await apiPut("/api/admin/config", config);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ayarlar kaydedilirken bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = <K extends keyof ConfigState>(key: K, value: ConfigState[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sistem Ayarları</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform özelliklerini ve sistem yapılandırmasını yönetin.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Ayarlar başarıyla kaydedildi.
        </div>
      )}

      <div className="card space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Özellik Yönetimi</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {[
            {
              key: "feature.subscriptions_enabled" as const,
              label: "Abonelik Sistemi",
              desc: "Aylık/yıllık abonelik planlarını aktif eder.",
            },
            {
              key: "feature.credits_enabled" as const,
              label: "Kredi Sistemi",
              desc: "Kontör/kredi paket alımlarını aktif eder.",
            },
            {
              key: "feature.registration_open" as const,
              label: "Kayıt Açık",
              desc: "Yeni kullanıcı kayıtlarını açar/kapatır.",
            },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
              <button
                onClick={() => updateConfig(key, !config[key])}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  config[key] ? "bg-indigo-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    config[key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Limit ve Kısıtlamalar</h2>

        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label className="label-text">Maks. Dosya Boyutu (MB)</label>
            <input
              type="number"
              value={config["limits.max_file_size_mb"]}
              onChange={(e) => updateConfig("limits.max_file_size_mb", parseInt(e.target.value, 10) || 100)}
              className="input-field"
              min={1}
              max={500}
            />
          </div>
          <div>
            <label className="label-text">Ücretsiz Analiz Hakkı</label>
            <input
              type="number"
              value={config["limits.free_analyses_per_user"]}
              onChange={(e) => updateConfig("limits.free_analyses_per_user", parseInt(e.target.value, 10) || 3)}
              className="input-field"
              min={0}
              max={100}
            />
          </div>
          <div>
            <label className="label-text">Analiz Zaman Aşımı (saniye)</label>
            <input
              type="number"
              value={config["limits.analysis_timeout_seconds"]}
              onChange={(e) => updateConfig("limits.analysis_timeout_seconds", parseInt(e.target.value, 10) || 250)}
              className="input-field"
              min={10}
              max={600}
            />
          </div>
        </div>
      </div>

      <div className="card space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Faturalandırma</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="label-text">Varsayılan Para Birimi</label>
            <select
              value={config["billing.default_currency"]}
              onChange={(e) => updateConfig("billing.default_currency", e.target.value)}
              className="input-field"
            >
              <option value="TRY">TRY (₺)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>
          <div>
            <label className="label-text">KDV Oranı (%)</label>
            <input
              type="number"
              value={config["billing.tax_rate"]}
              onChange={(e) => updateConfig("billing.tax_rate", parseFloat(e.target.value) || 18)}
              className="input-field"
              min={0}
              max={100}
              step={0.1}
            />
          </div>
        </div>
      </div>

      <div className="card space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Depolama Yapılandırması</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="label-text">Depolama Türü</label>
            <select
              value={config["storage.type"]}
              onChange={(e) => updateConfig("storage.type", e.target.value)}
              className="input-field"
            >
              <option value="local">Yerel Sunucu Diski (Local Disk)</option>
              <option value="s3">Bulut Depolama (S3 Compatible)</option>
              <option value="vercel_blob">Vercel Blob Storage</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Belge dosyalarının nerede saklanacağını belirler.
            </p>
          </div>

          <div>
            <label className="label-text">Kayıt Dizini (Local için)</label>
            <input
              type="text"
              value={config["storage.local_path"]}
              onChange={(e) => updateConfig("storage.local_path", e.target.value)}
              placeholder="/uploads/documents"
              className="input-field"
              disabled={config["storage.type"] !== "local"}
            />
            <p className="mt-1 text-xs text-gray-500">
              {config["storage.type"] === "local"
                ? "Sunucu üzerindeki belge kayıt dizini."
                : "Yalnızca 'Yerel Sunucu Diski' seçiliyken kullanılır."}
            </p>
          </div>

          {config["storage.type"] === "s3" && (
            <>
              <div>
                <label className="label-text">S3 Bucket Adı</label>
                <input
                  type="text"
                  value={config["storage.s3_bucket"]}
                  onChange={(e) => updateConfig("storage.s3_bucket", e.target.value)}
                  placeholder="my-bucket"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text">S3 Bölgesi</label>
                <input
                  type="text"
                  value={config["storage.s3_region"]}
                  onChange={(e) => updateConfig("storage.s3_region", e.target.value)}
                  placeholder="eu-west-1"
                  className="input-field"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">Mevcut Sistem Kayıtları</h2>

        {items.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz hiçbir sistem ayarı kaydedilmemiş. Kaydettiğinizde burada görünecek.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Anahtar</th>
                  <th className="pb-3 font-medium">Değer</th>
                  <th className="pb-3 font-medium">Açıklama</th>
                  <th className="pb-3 font-medium">Güncelleme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.key}>
                    <td className="py-2 font-mono text-xs text-gray-700">{item.key}</td>
                    <td className="py-2 text-xs text-gray-600">
                      {typeof item.value === "boolean"
                        ? item.value ? "✅ Açık" : "❌ Kapalı"
                        : typeof item.value === "object"
                          ? JSON.stringify(item.value)
                          : String(item.value)}
                    </td>
                    <td className="py-2 text-xs text-gray-500">{item.description || "-"}</td>
                    <td className="py-2 text-xs text-gray-500">
                      {new Date(item.updatedAt).toLocaleString("tr-TR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary min-w-[200px]">
          {saving ? "Kaydediliyor..." : "Tüm Ayarları Kaydet"}
        </button>
      </div>
    </div>
  );
}
