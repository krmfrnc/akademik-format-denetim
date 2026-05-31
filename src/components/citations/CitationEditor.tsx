"use client";

import { useState } from "react";
import type { CitationStyleRules } from "@/services/docx-analyzer/types";

interface CitationEditorProps {
  onSave: (data: {
    name: string;
    shortName?: string;
    description?: string;
    icon?: string;
    rules: CitationStyleRules;
  }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

const SOURCE_TYPES = [
  { value: "journalArticle", label: "Dergi Makalesi" },
  { value: "book", label: "Kitap" },
  { value: "bookChapter", label: "Kitap Bölümü" },
  { value: "thesis", label: "Tez" },
  { value: "proceeding", label: "Konferans Bildirisi" },
  { value: "report", label: "Rapor" },
  { value: "website", label: "Web Sitesi" },
  { value: "newspaper", label: "Gazete" },
];

const PLACEHOLDERS = [
  { value: "{author}", label: "Yazar(lar)" },
  { value: "{year}", label: "Yıl" },
  { value: "{title}", label: "Başlık" },
  { value: "{journal}", label: "Dergi Adı" },
  { value: "{volume}", label: "Cilt" },
  { value: "{issue}", label: "Sayı" },
  { value: "{pages}", label: "Sayfa" },
  { value: "{publisher}", label: "Yayıncı" },
  { value: "{doi}", label: "DOI" },
  { value: "{url}", label: "URL" },
  { value: "{edition}", label: "Baskı" },
  { value: "{editor}", label: "Editör" },
];

const COMMON_IN_TEXT = [
  { value: "({author}, {year})", label: "Parantez içi: (Yazar, Yıl)" },
  { value: "{author} ({year})", label: "Anlatı: Yazar (Yıl)" },
  { value: "({author} {year})", label: "Parantez içi: (Yazar Yıl)" },
  { value: "[{author} {year}]", label: "Köşeli: [Yazar Yıl]" },
];

const PRESET_TEMPLATES: Record<string, Record<string, string>> = {
  apa7: {
    journalArticle: "{author} ({year}). {title}. <em>{journal}</em>, <em>{volume}</em>({issue}), {pages}. {doi}",
    book: "{author} ({year}). <em>{title}</em> ({edition}). {publisher}.",
    bookChapter: "{author} ({year}). {title}. In {editor} (Ed.), <em>{bookTitle}</em> (ss. {pages}). {publisher}.",
    thesis: "{author} ({year}). <em>{title}</em> [Yayımlanmamış doktora tezi]. {publisher}.",
    proceeding: "{author} ({year}). {title}. In <em>{journal}</em> (ss. {pages}). {publisher}.",
    website: "{author} ({year}). {title}. {url}",
    newspaper: "{author} ({year}, {date}). {title}. <em>{journal}</em>. {url}",
  },
  vancouver: {
    journalArticle: "{author}. {title}. <em>{journal}</em>. {year};{volume}({issue}):{pages}.",
    book: "{author}. <em>{title}</em>. {edition}. {publisher}; {year}.",
    bookChapter: "{author}. {title}. In: {editor}, editor. <em>{bookTitle}</em>. {publisher}; {year}. p. {pages}.",
    thesis: "{author}. {title} [thesis]. {publisher}; {year}.",
    proceeding: "{author}. {title}. In: <em>{journal}</em>. {publisher}; {year}. p. {pages}.",
    website: "{author}. {title} [Internet]. {year} [cited {accessDate}]. Available from: {url}",
  },
};

const STEPS = ["Temel Bilgiler", "Yazar Formatı", "Metin İçi Atıf", "Kaynakça Şablonları", "Gözden Geçir"];

export default function CitationEditor({ onSave, onCancel, saving }: CitationEditorProps) {
  const [step, setStep] = useState(0);
  const [activeSourceType, setActiveSourceType] = useState("journalArticle");

  const [form, setForm] = useState({
    name: "",
    shortName: "",
    description: "",
    icon: "",
    authorFormat: "{lastName}, {firstNameInitial}.",
    inTextGeneral: "({author}, {year})",
    bibliography: {} as Record<string, string>,
    hangingIndent: "",
    ordering: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateBibliography = (sourceType: string, template: string) => {
    setForm((prev) => ({
      ...prev,
      bibliography: { ...prev.bibliography, [sourceType]: template || undefined as unknown as string },
    }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESET_TEMPLATES[presetKey];
    if (!preset) return;
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(preset)) {
      if (v) cleaned[k] = v;
    }
    setForm((prev) => ({
      ...prev,
      bibliography: { ...cleaned },
      authorFormat: presetKey === "vancouver" ? "{lastName} {firstNameInitial}" : "{lastName}, {firstNameInitial}.",
      inTextGeneral: presetKey === "vancouver" ? "[{author} {year}]" : "({author}, {year})",
    }));
  };

  const insertPlaceholder = (placeholder: string) => {
    const current = form.bibliography[activeSourceType] ?? "";
    setForm((prev) => ({
      ...prev,
      bibliography: { ...prev.bibliography, [activeSourceType]: current + placeholder },
    }));
  };

  const buildRules = (): CitationStyleRules => {
    const rules: CitationStyleRules = {};

    if (form.inTextGeneral) {
      rules.inText = { general: form.inTextGeneral };
    }

    const bib: Record<string, string> = {};
    for (const [k, v] of Object.entries(form.bibliography)) {
      if (v && v.trim()) bib[k] = v.trim();
    }
    if (Object.keys(bib).length > 0) {
      rules.bibliography = bib;
    }

    if (form.authorFormat) rules.authorFormat = form.authorFormat;
    if (form.hangingIndent) rules.hangingIndent = form.hangingIndent;
    if (form.ordering) rules.ordering = form.ordering;

    return rules;
  };

  const handleSubmit = async () => {
    await onSave({
      name: form.name,
      shortName: form.shortName || undefined,
      description: form.description || undefined,
      icon: form.icon || undefined,
      rules: buildRules(),
    });
  };

  const stepPercent = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Yeni Atıf Stili</h2>
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">İptal</button>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>{STEPS[step]}</span>
          <span>{stepPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${stepPercent}%` }} />
        </div>
      </div>

      <div className="min-h-[350px]">
        {/* Step 0: Temel Bilgiler */}
        {step === 0 && (
          <div className="space-y-4 max-w-lg">
            <p className="text-sm text-gray-500 mb-4">
              Atıf stiline bir ad verin. Hazır şablonlardan başlayabilir veya sıfırdan kendi stilinizi oluşturabilirsiniz.
            </p>
            <div>
              <label className="label-text">Stil Adı *</label>
              <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} className="input-field" placeholder="APA 7" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-text">Kısa Ad</label>
                <input type="text" value={form.shortName} onChange={(e) => updateField("shortName", e.target.value)} className="input-field" placeholder="apa7" />
              </div>
              <div>
                <label className="label-text">İkon</label>
                <input type="text" value={form.icon} onChange={(e) => updateField("icon", e.target.value)} className="input-field" placeholder="📚" />
              </div>
            </div>
            <div>
              <label className="label-text">Açıklama</label>
              <textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} className="input-field" rows={2} placeholder="APA 7. Edisyon kaynakça stili" />
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Hazır Şablon ile Başla:</p>
              <div className="flex gap-2">
                <button onClick={() => applyPreset("apa7")} className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 border border-blue-200">
                  APA 7
                </button>
                <button onClick={() => applyPreset("vancouver")} className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 border border-blue-200">
                  Vancouver
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Yazar Formatı */}
        {step === 1 && (
          <div className="space-y-4 max-w-xl">
            <p className="text-sm text-gray-500 mb-4">
              Yazar isimlerinin kaynakçada nasıl görüneceğini belirleyin. Kullanılabilir değişkenler: {"{lastName}"}, {"{firstName}"}, {"{firstNameInitial}"}
            </p>
            <div>
              <label className="label-text">Yazar Formatı</label>
              <select value={form.authorFormat} onChange={(e) => updateField("authorFormat", e.target.value)} className="input-field">
                <option value="{lastName}, {firstNameInitial}.">Soyad, A. (APA)</option>
                <option value="{lastName} {firstNameInitial}">Soyad A (Vancouver)</option>
                <option value="{lastName}, {firstName}">Soyad, Ad</option>
                <option value="{firstName} {lastName}">Ad Soyad</option>
                <option value="{lastName}">Sadece Soyad</option>
              </select>
            </div>
            <div>
              <label className="label-text">Asılı Girinti</label>
              <select value={form.hangingIndent} onChange={(e) => updateField("hangingIndent", e.target.value)} className="input-field">
                <option value="">Belirtilmedi</option>
                <option value="0.5in">0.5 inç</option>
                <option value="1.27cm">1.27 cm</option>
                <option value="1.5cm">1.5 cm</option>
                <option value="2cm">2 cm</option>
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Metin İçi Atıf */}
        {step === 2 && (
          <div className="space-y-4 max-w-xl">
            <p className="text-sm text-gray-500 mb-4">
              Metin içinde atıfların nasıl görüneceğini belirleyin. Kullanılabilir değişkenler: {"{author}"}, {"{year}"}, {"{pages}"}
            </p>
            <div>
              <label className="label-text">Metin İçi Atıf Formatı</label>
              <select value={form.inTextGeneral} onChange={(e) => updateField("inTextGeneral", e.target.value)} className="input-field">
                <option value="">Belirtilmedi</option>
                {COMMON_IN_TEXT.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Özel Format (elle yaz)</label>
              <input
                type="text"
                value={form.inTextGeneral}
                onChange={(e) => updateField("inTextGeneral", e.target.value)}
                className="input-field font-mono text-xs"
                placeholder="({author}, {year}, s. {pages})"
              />
              <p className="text-xs text-gray-400 mt-1">Değişkenleri süslü parantez içinde yazın: {"{author}"}, {"{year}"}, {"{pages}"}</p>
            </div>
          </div>
        )}

        {/* Step 3: Kaynakça Şablonları */}
        {step === 3 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">
              Her kaynak türü için kaynakça formatını belirleyin. Değişken eklemek için aşağıdaki butonları kullanın. İtalik için {"<em>...</em>"} etiketi kullanın.
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => insertPlaceholder(p.value)}
                  className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded border border-gray-200 hover:bg-gray-200 font-mono"
                  title={p.label}
                >
                  {p.value}
                </button>
              ))}
            </div>

            <div className="flex gap-2 mb-4">
              {SOURCE_TYPES.map((st) => (
                <button
                  key={st.value}
                  onClick={() => setActiveSourceType(st.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    activeSourceType === st.value
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-medium"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="label-text text-xs">
                  {SOURCE_TYPES.find((s) => s.value === activeSourceType)?.label} Şablonu
                </label>
                <textarea
                  value={form.bibliography[activeSourceType] ?? ""}
                  onChange={(e) => updateBibliography(activeSourceType, e.target.value)}
                  className="input-field font-mono text-xs"
                  rows={3}
                  placeholder={`Örn: {author} ({year}). {title}. <em>{journal}</em>, <em>{volume}</em>({issue}), {pages}.`}
                />
              </div>

              {form.bibliography[activeSourceType] && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Önizleme:</p>
                  <p className="text-xs font-mono text-gray-800 break-all">
                    {form.bibliography[activeSourceType]}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Gözden Geçir */}
        {step === 4 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Oluşturulacak atıf stilinin özetini kontrol edin.</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-gray-500 font-medium">Ad:</span>
                <span className="text-gray-900">{form.name || "-"}</span>
                <span className="text-gray-500 font-medium">Kısa Ad:</span>
                <span className="text-gray-900">{form.shortName || "-"}</span>
                <span className="text-gray-500 font-medium">İkon:</span>
                <span className="text-gray-900">{form.icon || "-"}</span>
                <span className="text-gray-500 font-medium">Yazar Formatı:</span>
                <span className="text-gray-900 font-mono text-xs">{form.authorFormat}</span>
                <span className="text-gray-500 font-medium">Metin İçi Atıf:</span>
                <span className="text-gray-900 font-mono text-xs">{form.inTextGeneral || "-"}</span>
                {form.hangingIndent && (
                  <>
                    <span className="text-gray-500 font-medium">Asılı Girinti:</span>
                    <span className="text-gray-900">{form.hangingIndent}</span>
                  </>
                )}
              </div>

              {Object.entries(form.bibliography).length > 0 && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <span className="text-xs font-semibold text-gray-500">Kaynakça Şablonları:</span>
                  {Object.entries(form.bibliography).map(([type, template]) => (
                    <div key={type} className="mt-1">
                      <span className="text-xs text-gray-500 font-medium">
                        {SOURCE_TYPES.find((s) => s.value === type)?.label ?? type}:
                      </span>
                      <p className="text-xs font-mono text-gray-800 mt-0.5 break-all">{template}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <button onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0} className="btn-secondary">
          ← Geri
        </button>
        <div className="flex gap-2">
          {Array.from({ length: STEPS.length }, (_, i) => (
            <button
              key={i}
              onClick={() => { if (i === 0 || form.name.trim()) setStep(i); }}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === step ? "bg-indigo-600" : i < step ? "bg-indigo-300" : "bg-gray-300"
              }`}
              title={STEPS[i]}
            />
          ))}
        </div>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => { if (step === 0 && !form.name.trim()) return; setStep((s) => Math.min(s + 1, STEPS.length - 1)); }}
            disabled={step === 0 && !form.name.trim()}
            className="btn-primary"
          >
            İleri →
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="btn-primary">
            {saving ? "Kaydediliyor..." : "Stili Oluştur"}
          </button>
        )}
      </div>
    </div>
  );
}
