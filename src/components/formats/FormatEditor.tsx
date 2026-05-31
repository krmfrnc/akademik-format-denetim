"use client";

import { useEffect, useState } from "react";
import type { FormatRules } from "@/services/docx-analyzer/types";

interface FormatEditorProps {
  onSave: (data: { name: string; description: string; isPublic: boolean; rules: FormatRules }) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  mode?: "create" | "edit";
  initialData?: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    rules?: FormatRules;
  };
  citationStyles?: { id: string; name: string; shortName: string | null; icon: string | null }[];
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
  "Kaynakça & Atıf",
  "Sayfa Numaraları",
  "Tablolar",
  "Gözden Geçir",
];

interface SectionForm {
  fontFamily?: string; fontSize?: number; lineSpacing?: number; alignment?: string;
  marginTop?: string; marginBottom?: string; marginLeft?: string; marginRight?: string;
  firstLineIndent?: string; bold?: boolean; italic?: boolean;
  paragraphSpacing?: number; paragraphSpacingBefore?: number; paragraphSpacingAfter?: number;
}
interface BibForm extends SectionForm { hangingIndent?: string; }

interface FormState {
  name: string; description: string; isPublic: boolean;
  body: SectionForm; heading1: SectionForm; heading2: SectionForm; heading3: SectionForm;
  abstract: SectionForm; footnote: SectionForm; blockQuote: SectionForm;
  bibliography: BibForm;
  citationStyleId: string;
  pageNumbers: { position?: string; fontSize?: number; format?: string; introRoman?: boolean };
  tables: { insideBorders?: boolean };
}

const emptySection: SectionForm = {};

const sectionKeys = ["body", "heading1", "heading2", "heading3", "abstract", "footnote", "blockQuote", "bibliography"] as const;

function rulesToForm(rules?: FormatRules): Partial<FormState> {
  if (!rules) return {};
  const f: Record<string, unknown> = {};
  for (const k of sectionKeys) f[k] = (rules as Record<string, unknown>)[k] ?? { ...emptySection };
  if (rules.pageNumbers) f.pageNumbers = rules.pageNumbers;
  if (rules.tables) f.tables = rules.tables;
  return f as Partial<FormState>;
}

export default function FormatEditor({ onSave, onCancel, saving, mode = "create", initialData, citationStyles }: FormatEditorProps) {
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<FormState>({
    name: "", description: "", isPublic: false,
    body: { ...emptySection },
    heading1: { ...emptySection }, heading2: { ...emptySection }, heading3: { ...emptySection },
    abstract: { ...emptySection }, footnote: { ...emptySection },
    blockQuote: { ...emptySection },
    bibliography: { ...emptySection },
    citationStyleId: "",
    pageNumbers: {}, tables: {},
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name ?? "",
        description: initialData.description ?? "",
        isPublic: initialData.isPublic ?? false,
        body: { ...emptySection, ...(initialData.rules?.body ?? {}) },
        heading1: { ...emptySection, ...(initialData.rules?.heading1 ?? {}) },
        heading2: { ...emptySection, ...(initialData.rules?.heading2 ?? {}) },
        heading3: { ...emptySection, ...(initialData.rules?.heading3 ?? {}) },
        abstract: { ...emptySection, ...(initialData.rules?.abstract ?? {}) },
        footnote: { ...emptySection, ...(initialData.rules?.footnote ?? {}) },
        blockQuote: { ...emptySection, ...(initialData.rules?.blockQuote ?? {}) },
        bibliography: { ...emptySection, ...(initialData.rules?.bibliography ?? {}) },
        citationStyleId: (initialData.rules as Record<string, unknown>)?.citationStyleId as string ?? "",
        pageNumbers: { ...(initialData.rules?.pageNumbers ?? {}) },
        tables: { ...(initialData.rules?.tables ?? {}) },
      });
    }
  }, [initialData]);

  const updateSection = (section: keyof FormState, field: string, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      [section]: { ...(prev[section] as Record<string, unknown>), [field]: value === "" ? undefined : value },
    }));
  };

  const buildRules = (): FormatRules => {
    const r: FormatRules = {};
    const allKeys = [...sectionKeys, "pageNumbers", "tables"] as const;
    for (const s of allKeys) {
      const val = form[s as keyof FormState] as Record<string, unknown>;
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val)) {
        if (v !== undefined && v !== "") cleaned[k] = v;
      }
      if (Object.keys(cleaned).length > 0) (r as Record<string, unknown>)[s] = cleaned;
    }
    if (form.citationStyleId) (r as Record<string, unknown>).citationStyleId = form.citationStyleId;
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

  const renderReviewSection = (section: string) => {
    const data = (form as unknown as Record<string, unknown>)[section] as Record<string, unknown>;
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
        <h2 className="text-lg font-semibold text-gray-900">
          {mode === "edit" ? "Şablonu Düzenle" : "Yeni Format Şablonu"}
        </h2>
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
          </div>
        )}

        {step === 1 && (<div><p className="text-sm text-gray-500 mb-4">Ana gövde metni (paragraflar) formatı. Tezlerde genelde 1.5 satır aralığı, iki yana yaslı. Sol kenar cilt payı için daha geniş bırakılır (3-4 cm).</p>{renderSectionFields("body")}</div>)}
        {step === 2 && (<div><p className="text-sm text-gray-500 mb-4">1. düzey başlıklar (Ana bölüm başlıkları). Genelde büyük punto, koyu ve ortalanır. Önce 72 pt sonra 18 pt boşluk yaygındır.</p>{renderSectionFields("heading1")}</div>)}
        {step === 3 && (<div><p className="text-sm text-gray-500 mb-4">2. düzey başlıklar (Alt bölüm başlıkları). Önce 18 pt sonra 12 pt boşluk.</p>{renderSectionFields("heading2")}</div>)}
        {step === 4 && (<div><p className="text-sm text-gray-500 mb-4">3. düzey başlıklar. Önce 12 pt sonra 6 pt boşluk. APA'da kalın + italik.</p>{renderSectionFields("heading3")}</div>)}
        {step === 5 && (<div><p className="text-sm text-gray-500 mb-4">Özet (Abstract) bölümü. Tezlerde 1 satır aralığı, 200-400 kelime arası.</p>{renderSectionFields("abstract")}</div>)}
        {step === 6 && (<div><p className="text-sm text-gray-500 mb-4">Dipnot (Footnote) formatı. Genelde 8-10 punto, 1 satır aralığı. Sayfa altında metin sınırları içinde.</p>{renderSectionFields("footnote")}</div>)}
        {step === 7 && (<div><p className="text-sm text-gray-500 mb-4">Uzun doğrudan alıntı (Block Quote). 3 satırdan uzun alıntılar genelde daha küçük punto, soldan girintili, sıkıştırılmış paragraf.</p>{renderSectionFields("blockQuote")}</div>)}
        {step === 8 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Kaynakça (References) bölümü formatı ve kullanılacak atıf stili. APA'da asılı girinti kullanılır.</p>
            {(() => {
              const data = form.bibliography as Record<string, unknown>;
              return (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div><label className="label-text">Yazı Tipi</label><select value={(data.fontFamily as string) ?? ""} onChange={(e) => updateSection("bibliography", "fontFamily", e.target.value || undefined)} className="input-field"><option value="">Belirtilmedi</option>{FONT_FAMILIES.map((f) => (<option key={f} value={f}>{f}</option>))}</select></div>
                    <div><label className="label-text">Yazı Boyutu (pt)</label><select value={(data.fontSize as number) ?? ""} onChange={(e) => updateSection("bibliography", "fontSize", e.target.value ? Number(e.target.value) : undefined)} className="input-field"><option value="">Belirtilmedi</option>{FONT_SIZES.map((s) => (<option key={s} value={s}>{s} pt</option>))}</select></div>
                    <div><label className="label-text">Satır Aralığı</label><select value={(data.lineSpacing as number) ?? ""} onChange={(e) => updateSection("bibliography", "lineSpacing", e.target.value ? Number(e.target.value) : undefined)} className="input-field"><option value="">Belirtilmedi</option>{LINE_SPACINGS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}</select></div>
                    <div><label className="label-text">Hizalama</label><select value={(data.alignment as string) ?? ""} onChange={(e) => updateSection("bibliography", "alignment", e.target.value || undefined)} className="input-field"><option value="">Belirtilmedi</option>{ALIGNMENTS.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}</select></div>
                    <div><label className="label-text">Asılı Girinti</label><select value={(data.hangingIndent as string) ?? ""} onChange={(e) => updateSection("bibliography", "hangingIndent", e.target.value || undefined)} className="input-field"><option value="">Belirtilmedi</option>{INDENT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select></div>
                    <div><label className="label-text">İlk Satır Girintisi</label><select value={(data.firstLineIndent as string) ?? ""} onChange={(e) => updateSection("bibliography", "firstLineIndent", e.target.value || undefined)} className="input-field"><option value="">Belirtilmedi</option>{INDENT_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}</select></div>
                    <div><label className="label-text">Önce Boşluk</label><select value={(data.paragraphSpacingBefore as number) ?? ""} onChange={(e) => updateSection("bibliography", "paragraphSpacingBefore", e.target.value ? Number(e.target.value) : undefined)} className="input-field"><option value="">Belirtilmedi</option>{PT_SPACING.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}</select></div>
                    <div><label className="label-text">Sonra Boşluk</label><select value={(data.paragraphSpacingAfter as number) ?? ""} onChange={(e) => updateSection("bibliography", "paragraphSpacingAfter", e.target.value ? Number(e.target.value) : undefined)} className="input-field"><option value="">Belirtilmedi</option>{PT_SPACING.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}</select></div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={(data.bold as boolean) ?? false} onChange={(e) => updateSection("bibliography", "bold", e.target.checked || undefined)} className="rounded border-gray-300" /><span className="text-sm font-medium text-gray-700">Kalın</span></label>
                      <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={(data.italic as boolean) ?? false} onChange={(e) => updateSection("bibliography", "italic", e.target.checked || undefined)} className="rounded border-gray-300" /><span className="text-sm font-medium text-gray-700">İtalik</span></label>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <label className="label-text">Atıf Stili (metin içi ve kaynakça formatı)</label>
                    <p className="text-xs text-gray-400 mb-2">Bu şablonda kullanılacak atıf stilini seçin. Boş bırakılırsa belge analizi sırasında ayrıca seçilir.</p>
                    <select value={form.citationStyleId} onChange={(e) => setForm({ ...form, citationStyleId: e.target.value })} className="input-field max-w-lg">
                      <option value="">Seçilmedi</option>
                      {citationStyles?.map((cs) => (
                        <option key={cs.id} value={cs.id}>{cs.icon ? `${cs.icon} ` : ""}{cs.name}{cs.shortName ? ` (${cs.shortName})` : ""}</option>
                      ))}
                    </select>
                    {form.citationStyleId && (
                      <p className="text-xs text-indigo-600 mt-1">Seçili: {citationStyles?.find((cs) => cs.id === form.citationStyleId)?.name}</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        {step === 9 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Sayfa numaralandırma. Tezlerde: ön sayfalar Romen (i, ii, iii), ana metin Arap (1, 2, 3).</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <div><label className="label-text">Konum</label><select value={(form.pageNumbers.position as string) ?? ""} onChange={(e) => setForm({ ...form, pageNumbers: { ...form.pageNumbers, position: e.target.value || undefined } })} className="input-field"><option value="">Belirtilmedi</option>{PAGE_NUMBER_POSITIONS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}</select></div>
              <div><label className="label-text">Yazı Boyutu (pt)</label><select value={(form.pageNumbers.fontSize as number) ?? ""} onChange={(e) => setForm({ ...form, pageNumbers: { ...form.pageNumbers, fontSize: e.target.value ? Number(e.target.value) : undefined } })} className="input-field"><option value="">Belirtilmedi</option>{FONT_SIZES.map((s) => (<option key={s} value={s}>{s} pt</option>))}</select></div>
              <div><label className="label-text">Numara Formatı</label><select value={(form.pageNumbers.format as string) ?? ""} onChange={(e) => setForm({ ...form, pageNumbers: { ...form.pageNumbers, format: e.target.value || undefined } })} className="input-field"><option value="">Belirtilmedi</option>{PAGE_NUMBER_FORMATS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}</select></div>
              <div className="flex items-end pb-2.5"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.pageNumbers.introRoman ?? false} onChange={(e) => setForm({ ...form, pageNumbers: { ...form.pageNumbers, introRoman: e.target.checked || undefined } })} className="rounded border-gray-300" /><span className="text-sm text-gray-700">Ön sayfalarda Romen rakamı</span></label></div>
            </div>
          </div>
        )}
        {step === 10 && (<div><p className="text-sm text-gray-500 mb-4">Tablolar için format kuralları.</p><div className="max-w-lg"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.tables.insideBorders ?? false} onChange={(e) => setForm({ ...form, tables: { insideBorders: e.target.checked || undefined } })} className="rounded border-gray-300" /><span className="text-sm text-gray-700">Tablo içi kenar çizgileri (APA'da sadece yatay çizgiler)</span></label></div></div>)}
        {step === 11 && (
          <div>
            <p className="text-sm text-gray-500 mb-4">Oluşturulacak şablonun özetini kontrol edin.</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto">
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-gray-500 font-medium">Ad:</span><span className="text-gray-900">{form.name || "-"}</span>
                <span className="text-gray-500 font-medium">Açıklama:</span><span className="text-gray-900">{form.description || "-"}</span>
                <span className="text-gray-500 font-medium">Herkese Açık:</span><span className="text-gray-900">{form.isPublic ? "Evet" : "Hayır"}</span>
              </div>
              {form.citationStyleId && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <span className="text-xs font-semibold text-gray-500">Atıf Stili</span>
                  <div className="text-xs text-gray-700 mt-1">{citationStyles?.find((cs) => cs.id === form.citationStyleId)?.name ?? form.citationStyleId}</div>
                </div>
              )}
              {Object.keys(reviewSectionLabel).map((s) => renderReviewSection(s as keyof typeof reviewSectionLabel))}
              {(form.pageNumbers.position || form.pageNumbers.fontSize || form.pageNumbers.format) && (
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <span className="text-xs font-semibold text-gray-500">Sayfa Numaraları</span>
                  <div className="text-xs text-gray-700 mt-1">{form.pageNumbers.position && `${PAGE_NUMBER_POSITIONS.find((p) => p.value === form.pageNumbers.position)?.label ?? form.pageNumbers.position}`}{form.pageNumbers.fontSize && ` | ${form.pageNumbers.fontSize} pt`}{form.pageNumbers.format && ` | ${form.pageNumbers.format}`}{form.pageNumbers.introRoman && " | Ön sayfalar Romen"}</div>
                </div>
              )}
              {form.tables.insideBorders !== undefined && (<div className="border-t border-gray-200 pt-2 mt-2"><span className="text-xs font-semibold text-gray-500">Tablolar</span><div className="text-xs text-gray-700 mt-1">İç kenar çizgileri: {form.tables.insideBorders ? "Var" : "Yok (APA)"}</div></div>)}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
        <button onClick={() => setStep((s) => Math.max(s - 1, 0))} disabled={step === 0} className="btn-secondary">← Geri</button>
        <div className="hidden sm:flex gap-1">
          {Array.from({ length: STEPS.length }, (_, i) => (
            <button key={i} onClick={() => { if (i === 0 || form.name.trim()) setStep(i); }} className={`w-2 h-2 rounded-full transition-colors ${i === step ? "bg-indigo-600" : i < step ? "bg-indigo-300" : "bg-gray-300"}`} title={STEPS[i]} />
          ))}
        </div>
        {step < STEPS.length - 1 ? (
          <button onClick={() => { if (step === 0 && !form.name.trim()) return; setStep((s) => Math.min(s + 1, STEPS.length - 1)); }} disabled={step === 0 && !form.name.trim()} className="btn-primary">İleri →</button>
        ) : (
          <button onClick={handleSubmit} disabled={saving || !form.name.trim()} className="btn-primary">{saving ? "Kaydediliyor..." : mode === "edit" ? "Güncelle" : "Şablonu Oluştur"}</button>
        )}
      </div>
    </div>
  );
}
