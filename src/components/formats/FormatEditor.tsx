"use client";

import { useState } from "react";
import type { FormatRules, SectionRules } from "@/services/docx-analyzer/types";

interface FormatEditorProps {
  onSave: (data: { name: string; description: string; isPublic: boolean; rules: FormatRules }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

const FONT_FAMILIES = [
  "Times New Roman", "Arial", "Calibri", "Cambria", "Georgia",
  "Garamond", "Palatino Linotype", "Computer Modern", "Helvetica",
  "Verdana", "Courier New", "Lucida Sans",
];

const FONT_SIZES = [8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 22, 24, 28, 32, 36];

const LINE_SPACINGS = [
  { value: 1, label: "1 (Tek)" },
  { value: 1.15, label: "1.15" },
  { value: 1.5, label: "1.5 (Bir buçuk)" },
  { value: 2, label: "2 (Çift)" },
  { value: 2.5, label: "2.5" },
  { value: 3, label: "3 (Üç)" },
];

const ALIGNMENTS = [
  { value: "left", label: "Sola Yaslı" },
  { value: "right", label: "Sağa Yaslı" },
  { value: "center", label: "Ortalı" },
  { value: "justify", label: "İki Yana Yaslı" },
];

const PAGE_NUMBER_POSITIONS = [
  { value: "top-left", label: "Üst Sol" },
  { value: "top-center", label: "Üst Orta" },
  { value: "top-right", label: "Üst Sağ" },
  { value: "bottom-left", label: "Alt Sol" },
  { value: "bottom-center", label: "Alt Orta" },
  { value: "bottom-right", label: "Alt Sağ" },
];

const PAGE_NUMBER_FORMATS = [
  { value: "1, 2, 3...", label: "Rakam (1, 2, 3)" },
  { value: "I, II, III...", label: "Romen (I, II, III)" },
  { value: "i, ii, iii...", label: "Küçük Romen (i, ii, iii)" },
  { value: "A, B, C...", label: "Harf (A, B, C)" },
  { value: "- 1 -", label: "Tireli (- 1 -)" },
];

const MARGIN_OPTIONS = [
  { value: "1cm", label: "1 cm" },
  { value: "1.27cm", label: "1.27 cm (0.5 inç)" },
  { value: "1.5cm", label: "1.5 cm" },
  { value: "2cm", label: "2 cm" },
  { value: "2.5cm", label: "2.5 cm (~1 inç)" },
  { value: "3cm", label: "3 cm" },
  { value: "3.5cm", label: "3.5 cm" },
  { value: "4cm", label: "4 cm (cilt payı)" },
  { value: "1in", label: "1 inç" },
  { value: "1.25in", label: "1.25 inç" },
];

const INDENT_OPTIONS = [
  { value: "0", label: "Yok" },
  { value: "0.5cm", label: "0.5 cm" },
  { value: "1cm", label: "1 cm" },
  { value: "1.25cm", label: "1.25 cm (0.5 inç)" },
  { value: "1.27cm", label: "1.27 cm" },
  { value: "1.5cm", label: "1.5 cm" },
  { value: "2cm", label: "2 cm" },
  { value: "0.5in", label: "0.5 inç" },
];

const PT_SPACING = [
  { value: 0, label: "Yok (0 pt)" },
  { value: 3, label: "3 pt" },
  { value: 6, label: "6 pt" },
  { value: 12, label: "12 pt" },
  { value: 18, label: "18 pt" },
  { value: 24, label: "24 pt" },
  { value: 36, label: "36 pt" },
  { value: 48, label: "48 pt" },
  { value: 72, label: "72 pt" },
];

const STEPS = [
  "Temel Bilgiler",
  "Gövde Metni",
  "Başlık 1",
  "Başlık 2",
  "Başlık 3",
  "Özet",
  "Dipnot",
  "Uzun Alıntı",
  "Kaynakça",
  "Sayfa Numaraları",
  "Tablolar",
  "Gözden Geçir",
];

interface SectionForm {
  fontFamily?: string;
  fontSize?: number;
  lineSpacing?: number;
  alignment?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  firstLineIndent?: string;
  bold?: boolean;
  italic?: boolean;
  paragraphSpacing?: number;
  paragraphSpacingBefore?: number;
  paragraphSpacingAfter?: number;
}
interface BibForm extends SectionForm { hangingIndent?: string; }

interface FormState {
  name: string;
  description: string;
  isPublic: boolean;
  body: SectionForm;
  heading1: SectionForm;
  heading2: SectionForm;
  heading3: SectionForm;
  abstract: SectionForm;
  footnote: SectionForm;
  blockQuote: SectionForm;
  bibliography: BibForm;
  pageNumbers: { position?: string; fontSize?: number; format?: string; introRoman?: boolean };
  tables: { insideBorders?: boolean };
}

const emptySection: SectionForm = {};

const APA7_PRESET: Partial<FormState> = {
  body: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 2, alignment: "justify", marginTop: "1in", marginBottom: "1in", marginLeft: "1in", marginRight: "1in", firstLineIndent: "0.5in", paragraphSpacingBefore: 0, paragraphSpacingAfter: 0 },
  heading1: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "center", paragraphSpacingBefore: 0, paragraphSpacingAfter: 0 },
  heading2: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 0, paragraphSpacingAfter: 0 },
  heading3: { fontFamily: "Times New Roman", fontSize: 12, bold: true, italic: true, alignment: "left", paragraphSpacingBefore: 0, paragraphSpacingAfter: 0 },
  abstract: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 2 },
  footnote: { fontFamily: "Times New Roman", fontSize: 10, lineSpacing: 1 },
  blockQuote: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 2, marginLeft: "0.5in" },
  bibliography: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 2, hangingIndent: "0.5in" },
  pageNumbers: { position: "top-right", fontSize: 12 },
  tables: { insideBorders: false },
};

const YDU_THESIS_PRESET: Partial<FormState> = {
  body: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1.5, alignment: "justify", marginTop: "2.5cm", marginBottom: "2.5cm", marginLeft: "4cm", marginRight: "2.5cm", firstLineIndent: "1.25cm", paragraphSpacingBefore: 6, paragraphSpacingAfter: 6 },
  heading1: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 72, paragraphSpacingAfter: 18 },
  heading2: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 18, paragraphSpacingAfter: 12 },
  heading3: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 12, paragraphSpacingAfter: 6 },
  abstract: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1, alignment: "justify" },
  footnote: { fontFamily: "Times New Roman", fontSize: 10, lineSpacing: 1 },
  blockQuote: { fontFamily: "Times New Roman", fontSize: 10, lineSpacing: 1, marginLeft: "1cm", marginRight: "0" },
  bibliography: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1, hangingIndent: "1.25cm", paragraphSpacingAfter: 12 },
  pageNumbers: { position: "top-center", fontSize: 12, introRoman: true },
  tables: { insideBorders: true },
};

const UKU_THESIS_PRESET: Partial<FormState> = {
  body: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1.5, alignment: "justify", marginTop: "4cm", marginBottom: "2.5cm", marginLeft: "3.5cm", marginRight: "3cm" },
  heading1: { fontFamily: "Times New Roman", fontSize: 14, bold: true, alignment: "left", paragraphSpacingBefore: 18, paragraphSpacingAfter: 12 },
  heading2: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 12, paragraphSpacingAfter: 6 },
  heading3: { fontFamily: "Times New Roman", fontSize: 12, bold: true, alignment: "left", paragraphSpacingBefore: 6, paragraphSpacingAfter: 6 },
  abstract: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1, alignment: "justify" },
  footnote: { fontFamily: "Times New Roman", fontSize: 8, lineSpacing: 1 },
  blockQuote: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1.5 },
  bibliography: { fontFamily: "Times New Roman", fontSize: 12, lineSpacing: 1.5, paragraphSpacingAfter: 6 },
  pageNumbers: { position: "bottom-center", fontSize: 11, introRoman: true },
  tables: { insideBorders: true },
};

export default function FormatEditor({ onSave, onCancel, saving }: FormatEditorProps) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    name: "", description: "", isPublic: false,
    body: { ...emptySection },
    heading1: { ...emptySection }, heading2: { ...emptySection }, heading3: { ...emptySection },
    abstract: { ...emptySection }, footnote: { ...emptySection },
    blockQuote: { ...emptySection },
    bibliography: { ...emptySection },
    pageNumbers: {}, tables: {},
  });

  const updateSection = (section: keyof FormState, field: string, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, unknown>), [field]: value === "" ? undefined : value },
    }));
  };

  const applyPreset = (preset: Partial<FormState>) => {
    setForm((prev) => ({
      ...prev,
      body: { ...emptySection, ...preset.body },
      heading1: { ...emptySection, ...preset.heading1 },
      heading2: { ...emptySection, ...preset.heading2 },
      heading3: { ...emptySection, ...preset.heading3 },
      abstract: { ...emptySection, ...preset.abstract },
      footnote: { ...emptySection, ...preset.footnote },
      blockQuote: { ...emptySection, ...preset.blockQuote },
      bibliography: { ...emptySection, ...preset.bibliography },
      pageNumbers: { ...preset.pageNumbers },
      tables: { ...preset.tables },
    }));
  };

  const buildRules = (): FormatRules => {
    const r: FormatRules = {};
    const sectionKeys = ["body", "heading1", "heading2", "heading3", "abstract", "footnote", "blockQuote", "bibliography", "pageNumbers", "tables"] as const;
    for (const s of sectionKeys) {
      const val = form[s] as Record<string, unknown>;
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined && v !== "") cleaned[k] = v;
      }
      if (Object.keys(cleaned).length > 0) (r as Record<string, unknown>)[s] = cleaned;
    }
    return r;
  };

  const handleSubmit = async () => {
    await onSave({ name: form.name, description: form.description, isPublic: form.isPublic, rules: buildRules() });
  };

  const stepPercent = Math.round(((step + 1) / STEPS.length) * 100);

  const renderSectionFields = (section: keyof FormState) => {
    const data = form[section] as Record<string, unknown>;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label-text">Yazı Tipi</label>
          <select value={(data.fontFamily as string) ?? ""} onChange={(e) => updateSection(section, "fontFamily", e.target.value || undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {FONT_FAMILIES.map((f) => (<option key={f} value={f}>{f}</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">Yazı Boyutu (pt)</label>
          <select value={(data.fontSize as number) ?? ""} onChange={(e) => updateSection(section, "fontSize", e.target.value ? Number(e.target.value) : undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {FONT_SIZES.map((s) => (<option key={s} value={s}>{s} pt</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">Satır Aralığı</label>
          <select value={(data.lineSpacing as number) ?? ""} onChange={(e) => updateSection(section, "lineSpacing", e.target.value ? Number(e.target.value) : undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {LINE_SPACINGS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">Hizalama</label>
          <select value={(data.alignment as string) ?? ""} onChange={(e) => updateSection(section, "alignment", e.target.value || undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {ALIGNMENTS.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">Üst Kenar Boşluğu</label>
          <select value={(data.marginTop as string) ?? ""} onChange={(e) => updateSection(section, "marginTop", e.target.value || undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {MARGIN_OPTIONS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">Alt Kenar Boşluğu</label>
          <select value={(data.marginBottom as string) ?? ""} onChange={(e) => updateSection(section, "marginBottom", e.target.value || undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {MARGIN_OPTIONS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">Sol Kenar Boşluğu</label>
          <select value={(data.marginLeft as string) ?? ""} onChange={(e) => updateSection(section, "marginLeft", e.target.value || undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {MARGIN_OPTIONS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">Sağ Kenar Boşluğu</label>
          <select value={(data.marginRight as string) ?? ""} onChange={(e) => updateSection(section, "marginRight", e.target.value || undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {MARGIN_OPTIONS.map((m) => (<option key={m.value} value={m.value}>{m.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">İlk Satır Girintisi</label>
          <select value={(data.firstLineIndent as string) ?? ""} onChange={(e) => updateSection(section, "firstLineIndent", e.target.value || undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {INDENT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">Paragraf Öncesi Boşluk</label>
          <select value={(data.paragraphSpacingBefore as number) ?? ""} onChange={(e) => updateSection(section, "paragraphSpacingBefore", e.target.value ? Number(e.target.value) : undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {PT_SPACING.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">Paragraf Sonrası Boşluk</label>
          <select value={(data.paragraphSpacingAfter as number) ?? ""} onChange={(e) => updateSection(section, "paragraphSpacingAfter", e.target.value ? Number(e.target.value) : undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {PT_SPACING.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label-text">Paragraf Aralığı (genel)</label>
          <select value={(data.paragraphSpacing as number) ?? ""} onChange={(e) => updateSection(section, "paragraphSpacing", e.target.value ? Number(e.target.value) : undefined)} className="input-field">
            <option value="">Belirtilmedi</option>
            {PT_SPACING.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
          </select>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={(data.bold as boolean) ?? false} onChange={(e) => updateSection(section, "bold", e.target.checked || undefined)} className="rounded border-gray-300" />
            <span className="text-sm font-medium text-gray-700">Kalın</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={(data.italic as boolean) ?? false} onChange={(e) => updateSection(section, "italic", e.target.checked || undefined)} className="rounded border-gray-300" />
            <span className="text-sm font-medium text-gray-700">İtalik</span>
          </label>
        </div>
      </div>
    );
  };

  const reviewSectionLabel: Record<string, string> = {
    body: "Gövde Metni", heading1: "Başlık 1", heading2: "Başlık 2",
    heading3: "Başlık 3", abstract: "Özet", footnote: "Dipnot",
    blockQuote: "Uzun Alıntı", bibliography: "Kaynakça",
  };

  const renderReviewSection = (section: "body" | "heading1" | "heading2" | "heading3" | "abstract" | "footnote" | "blockQuote" | "bibliography") => {
    const data = form[section] as Record<string, unknown>;
    const defined: string[] = [];
    if (data.fontFamily) defined.push(`Yazı Tipi: ${data.fontFamily}`);
    if (data.fontSize) defined.push(`${data.fontSize} pt`);
    if (data.lineSpacing) defined.push(`Satır Aralığı: ${data.lineSpacing}`);
    if (data.alignment) defined.push(`Hizalama: ${ALIGNMENTS.find((a) => a.value === data.alignment)?.label ?? data.alignment}`);
    if (data.marginTop) defined.push(`Üst: ${data.marginTop}`);
    if (data.marginBottom) defined.push(`Alt: ${data.marginBottom}`);
    if (data.marginLeft) defined.push(`Sol: ${data.marginLeft}`);
    if (data.marginRight) defined.push(`Sağ: ${data.marginRight}`);
    if (data.firstLineIndent) defined.push(`Girinti: ${data.firstLineIndent}`);
    if (data.paragraphSpacingBefore) defined.push(`Önce: ${data.paragraphSpacingBefore} pt`);
    if (data.paragraphSpacingAfter) defined.push(`Sonra: ${data.paragraphSpacingAfter} pt`);
    if (data.paragraphSpacing) defined.push(`Paragraf Aralığı: ${data.paragraphSpacing} pt`);
    if (data.bold) defined.push("Kalın");
    if (data.italic) defined.push("İtalik");
    if (data.hangingIndent) defined.push(`Asılı Girinti: ${data.hangingIndent}`);
    if (defined.length === 0) return null;
    return (
      <div className="border-t border-gray-200 pt-2 mt-2">
        <span className="text-xs font-semibold text-gray-500">{reviewSectionLabel[section]}</span>
        <div className="text-xs text-gray-700 mt-1">{defined.join(" | ")}</div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Format Şablonu Sihirbazı</h2>
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-700">İptal</button>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Adım {step + 1}/{STEPS.length}: {STEPS[step]}</span>
          <span>{stepPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${stepPercent}%` }} />
        </div>
      </div>

      <div className="min-h-[320px]">
        {/* Step 0: Temel Bilgiler */}
        {step === 0 && (
          <div className="space-y-4 max-w-lg">
            <p className="text-sm text-gray-500 mb-4">
              Şablona bir ad verin. İlerleyen adımlarda yazı tipi, kenar boşlukları, satır aralığı, başlık öncesi/sonrası boşluk gibi bütün format kurallarını belirleyeceksiniz.
            </p>
            <div>
              <label className="label-text">Şablon Adı *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Örn: YDÜ Sosyal Bilimler Tez Formatı" />
            </div>
            <div>
              <label className="label-text">Açıklama</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} placeholder="Opsiyonel açıklama" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} className="rounded border-gray-300" />
              <span className="text-sm text-gray-700">Herkese açık</span>
            </label>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Hazır Şablon ile Başla:</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => applyPreset(APA7_PRESET)} className="px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg hover:bg-blue-100 border border-blue-200">APA 7 (Uluslararası)</button>
                <button onClick={() => applyPreset(YDU_THESIS_PRESET)} className="px-4 py-2 bg-amber-50 text-amber-700 text-sm rounded-lg hover:bg-amber-100 border border-amber-200">YDÜ Tez (KKTC)</button>
                <button onClick={() => applyPreset(UKU_THESIS_PRESET)} className="px-4 py-2 bg-emerald-50 text-emerald-700 text-sm rounded-lg hover:bg-emerald-100 border border-emerald-200">UKÜ Tez (KKTC)</button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Hazır şablon tüm adımları doldurur. İsterseniz her adımda değişiklik yapabilirsiniz.</p>
            </div>
          </div>
        )}

        {/* Step 1-7: Sections */}
        {step === 1 && (<div><p className="text-sm text-gray-500 mb-4">Ana gövde metni (paragraflar) formatı. YDÜ: 1.5 satır aralığı, sol 4cm, diğer 2.5cm kenar boşluğu, iki yana yaslı. APA: 2 satır aralığı, 1 inç kenar boşluğu.</p>{renderSectionFields("body")}</div>)}

        {step === 2 && (<div><p className="text-sm text-gray-500 mb-4">1. düzey başlıklar (Ana bölüm başlıkları). YDÜ: 72 pt önce, 18 pt sonra boşluk. APA: Ortalı, kalın.</p>{renderSectionFields("heading1")}</div>)}

        {step === 3 && (<div><p className="text-sm text-gray-500 mb-4">2. düzey başlıklar (Alt bölüm başlıkları). YDÜ: 18 pt önce, 12 pt sonra boşluk.</p>{renderSectionFields("heading2")}</div>)}

        {step === 4 && (<div><p className="text-sm text-gray-500 mb-4">3. düzey başlıklar. YDÜ: 12 pt önce, 6 pt sonra boşluk. APA: Kalın + italik.</p>{renderSectionFields("heading3")}</div>)}

        {step === 5 && (<div><p className="text-sm text-gray-500 mb-4">Özet (Abstract) bölümü. Tezlerde 1 satır aralığı, 200-400 kelime arası. APA'da ayrı sayfada, "Öz" başlığı ortalanmış kalın.</p>{renderSectionFields("abstract")}</div>)}

        {step === 6 && (<div><p className="text-sm text-gray-500 mb-4">Dipnot (Footnote) formatı. YDÜ: 10 punto, 1 satır aralığı. UKÜ: 8 punto. Sayfa altında, metin sınırları içinde.</p>{renderSectionFields("footnote")}</div>)}

        {step === 7 && (<div><p className="text-sm text-gray-500 mb-4">Uzun doğrudan alıntı (Block Quote). YDÜ: 3 satırdan uzun alıntılar 10 punto, sıkıştırılmış paragraf, soldan 1 cm girintili.</p>{renderSectionFields("blockQuote")}</div>)}

        {step === 8 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Kaynakça (References / Bibliography) bölümü. APA'da asılı girinti (hanging indent). YDÜ: kaynaklar arası 12 pt boşluk.</p>
            {(() => {
              const data = form.bibliography as Record<string, unknown>;
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label-text">Yazı Tipi</label>
                    <select value={(data.fontFamily as string) ?? ""} onChange={(e) => updateSection("bibliography", "fontFamily", e.target.value || undefined)} className="input-field">
                      <option value="">Belirtilmedi</option>
                      {FONT_FAMILIES.map((f) => (<option key={f} value={f}>{f}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Yazı Boyutu (pt)</label>
                    <select value={(data.fontSize as number) ?? ""} onChange={(e) => updateSection("bibliography", "fontSize", e.target.value ? Number(e.target.value) : undefined)} className="input-field">
                      <option value="">Belirtilmedi</option>
                      {FONT_SIZES.map((s) => (<option key={s} value={s}>{s} pt</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Satır Aralığı</label>
                    <select value={(data.lineSpacing as number) ?? ""} onChange={(e) => updateSection("bibliography", "lineSpacing", e.target.value ? Number(e.target.value) : undefined)} className="input-field">
                      <option value="">Belirtilmedi</option>
                      {LINE_SPACINGS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Hizalama</label>
                    <select value={(data.alignment as string) ?? ""} onChange={(e) => updateSection("bibliography", "alignment", e.target.value || undefined)} className="input-field">
                      <option value="">Belirtilmedi</option>
                      {ALIGNMENTS.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Asılı Girinti (Hanging Indent)</label>
                    <select value={(data.hangingIndent as string) ?? ""} onChange={(e) => updateSection("bibliography", "hangingIndent", e.target.value || undefined)} className="input-field">
                      <option value="">Belirtilmedi</option>
                      {INDENT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">İlk Satır Girintisi</label>
                    <select value={(data.firstLineIndent as string) ?? ""} onChange={(e) => updateSection("bibliography", "firstLineIndent", e.target.value || undefined)} className="input-field">
                      <option value="">Belirtilmedi</option>
                      {INDENT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Önce Boşluk</label>
                    <select value={(data.paragraphSpacingBefore as number) ?? ""} onChange={(e) => updateSection("bibliography", "paragraphSpacingBefore", e.target.value ? Number(e.target.value) : undefined)} className="input-field">
                      <option value="">Belirtilmedi</option>
                      {PT_SPACING.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="label-text">Sonra Boşluk</label>
                    <select value={(data.paragraphSpacingAfter as number) ?? ""} onChange={(e) => updateSection("bibliography", "paragraphSpacingAfter", e.target.value ? Number(e.target.value) : undefined)} className="input-field">
                      <option value="">Belirtilmedi</option>
                      {PT_SPACING.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                    </select>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={(data.bold as boolean) ?? false} onChange={(e) => updateSection("bibliography", "bold", e.target.checked || undefined)} className="rounded border-gray-300" />
                      <span className="text-sm font-medium text-gray-700">Kalın</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={(data.italic as boolean) ?? false} onChange={(e) => updateSection("bibliography", "italic", e.target.checked || undefined)} className="rounded border-gray-300" />
                      <span className="text-sm font-medium text-gray-700">İtalik</span>
                    </label>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {step === 9 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Sayfa numaralandırma. Tezlerde: ön sayfalar Romen (i, ii, iii), ana metin Arap (1, 2, 3). YDÜ: üst orta, UKÜ: alt orta, APA: üst sağ.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <div>
                <label className="label-text">Konum</label>
                <select value={(form.pageNumbers.position as string) ?? ""} onChange={(e) => setForm({ ...form, pageNumbers: { ...form.pageNumbers, position: e.target.value || undefined } })} className="input-field">
                  <option value="">Belirtilmedi</option>
                  {PAGE_NUMBER_POSITIONS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                </select>
              </div>
              <div>
                <label className="label-text">Yazı Boyutu (pt)</label>
                <select value={(form.pageNumbers.fontSize as number) ?? ""} onChange={(e) => setForm({ ...form, pageNumbers: { ...form.pageNumbers, fontSize: e.target.value ? Number(e.target.value) : undefined } })} className="input-field">
                  <option value="">Belirtilmedi</option>
                  {FONT_SIZES.map((s) => (<option key={s} value={s}>{s} pt</option>))}
                </select>
              </div>
              <div>
                <label className="label-text">Numara Formatı</label>
                <select value={(form.pageNumbers.format as string) ?? ""} onChange={(e) => setForm({ ...form, pageNumbers: { ...form.pageNumbers, format: e.target.value || undefined } })} className="input-field">
                  <option value="">Belirtilmedi</option>
                  {PAGE_NUMBER_FORMATS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                </select>
              </div>
              <div className="flex items-end pb-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.pageNumbers.introRoman ?? false} onChange={(e) => setForm({ ...form, pageNumbers: { ...form.pageNumbers, introRoman: e.target.checked || undefined } })} className="rounded border-gray-300" />
                  <span className="text-sm text-gray-700">Ön sayfalarda Romen rakamı</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {step === 10 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Tablolar için format kuralları.</p>
            <div className="max-w-lg">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.tables.insideBorders ?? false} onChange={(e) => setForm({ ...form, tables: { insideBorders: e.target.checked || undefined } })} className="rounded border-gray-300" />
                <span className="text-sm text-gray-700">Tablo içi kenar çizgileri (APA'da sadece yatay çizgiler kullanılır, dikey çizgiler kullanılmaz)</span>
              </label>
            </div>
          </div>
        )}

        {step === 11 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Oluşturulacak şablonun özetini kontrol edin.</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-gray-500 font-medium">Ad:</span>
                <span className="text-gray-900">{form.name || "-"}</span>
                <span className="text-gray-500 font-medium">Açıklama:</span>
                <span className="text-gray-900">{form.description || "-"}</span>
                <span className="text-gray-500 font-medium">Herkese Açık:</span>
                <span className="text-gray-900">{form.isPublic ? "Evet" : "Hayır"}</span>
              </div>
              {(["body", "heading1", "heading2", "heading3", "abstract", "footnote", "blockQuote", "bibliography"] as const).map((s) => renderReviewSection(s))}
              {(form.pageNumbers.position || form.pageNumbers.fontSize || form.pageNumbers.format) && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <span className="text-xs font-semibold text-gray-500">Sayfa Numaraları</span>
                  <div className="text-xs text-gray-700 mt-1">
                    {form.pageNumbers.position && `${PAGE_NUMBER_POSITIONS.find((p) => p.value === form.pageNumbers.position)?.label ?? form.pageNumbers.position}`}
                    {form.pageNumbers.fontSize && ` | ${form.pageNumbers.fontSize} pt`}
                    {form.pageNumbers.format && ` | ${form.pageNumbers.format}`}
                    {form.pageNumbers.introRoman && " | Ön sayfalar Romen"}
                  </div>
                </div>
              )}
              {form.tables.insideBorders !== undefined && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <span className="text-xs font-semibold text-gray-500">Tablolar</span>
                  <div className="text-xs text-gray-700 mt-1">İç kenar çizgileri: {form.tables.insideBorders ? "Var" : "Yok (APA)"}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <button onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0} className="btn-secondary">← Geri</button>
        <div className="hidden sm:flex gap-1">
          {Array.from({ length: STEPS.length }, (_, i) => (
            <button key={i} onClick={() => { if (i === 0 || form.name.trim()) setStep(i); }}
              className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-indigo-600" : i < step ? "bg-indigo-300" : "bg-gray-300"}`}
              title={STEPS[i]} />
          ))}
        </div>
        {step < STEPS.length - 1 ? (
          <button onClick={() => { if (step === 0 && !form.name.trim()) return; setStep((s) => Math.min(s + 1, STEPS.length - 1)); }} disabled={step === 0 && !form.name.trim()} className="btn-primary">İleri →</button>
        ) : (
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="btn-primary">{saving ? "Kaydediliyor..." : "Şablonu Oluştur"}</button>
        )}
      </div>
    </div>
  );
}
