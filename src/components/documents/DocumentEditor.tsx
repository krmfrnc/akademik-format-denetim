"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useEditor, EditorContent, Extension } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import TextAlign from "@tiptap/extension-text-align";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Editor } from "@tiptap/core";

import EditorToolbar from "./EditorToolbar";
import ViolationPopover from "./ViolationPopover";

interface ViolationData {
  id: string;
  type: string;
  severity: "ERROR" | "WARNING" | "INFO";
  section: string | null;
  location: string | null;
  description: string;
  expected: string;
  found: string;
  suggestion: string | null;
}

interface DocumentEditorProps {
  documentId: string;
}

function parseParagraphIndex(location: string | null): number | null {
  if (!location) return null;
  const match = location.match(/Paragraf\s+(\d+)/i);
  if (match) return parseInt(match[1]) - 1;
  return null;
}

const violationPluginKey = new PluginKey("violation-highlights");

function createViolationPlugin(
  violationsRef: React.MutableRefObject<ViolationData[]>,
  dismissedIdsRef: React.MutableRefObject<Set<string>>,
  onViolationClickRef: React.MutableRefObject<(violation: ViolationData, rect: DOMRect) => void>,
) {
  return new Plugin({
    key: violationPluginKey,
    props: {
      decorations(state) {
        const violations = violationsRef.current;
        const dismissedIds = dismissedIdsRef.current;
        const activeViolations = violations.filter((v) => !dismissedIds.has(v.id));
        if (activeViolations.length === 0) return DecorationSet.empty;

        const violationByParaIndex = new Map<number, ViolationData[]>();
        for (const v of activeViolations) {
          const idx = parseParagraphIndex(v.location);
          if (idx === null) continue;
          if (!violationByParaIndex.has(idx)) violationByParaIndex.set(idx, []);
          violationByParaIndex.get(idx)!.push(v);
        }

        const decos: Decoration[] = [];
        let paraIdx = 0;

        state.doc.descendants((node, pos) => {
          if (node.type.name === "paragraph") {
            const paraViolations = violationByParaIndex.get(paraIdx);
            if (paraViolations && paraViolations.length > 0) {
              const primary = paraViolations[0];
              const sevClass = `violation-${primary.severity.toLowerCase()}`;
              const start = pos + 1;
              const end = pos + node.nodeSize - 1;
              if (end > start) {
                decos.push(
                  Decoration.inline(start, end, {
                    class: `violation-hl ${sevClass}`,
                    "data-violation-id": primary.id,
                  }),
                );
              }
            }
            paraIdx++;
          }
        });

        return DecorationSet.create(state.doc, decos);
      },
      handleClick(view, _pos, event) {
        const target = event.target as HTMLElement;
        const violationEl = target.closest("[data-violation-id]");
        if (!violationEl) return false;

        const vid = violationEl.getAttribute("data-violation-id");
        if (!vid) return false;

        const violations = violationsRef.current;
        const dismissedIds = dismissedIdsRef.current;
        const v = violations.find((x) => x.id === vid);
        if (!v || dismissedIds.has(v.id)) return false;

        const rect = violationEl.getBoundingClientRect();
        onViolationClickRef.current(v, rect);
        return false;
      },
    },
  });
}

const VIOLATION_TYPES_THAT_CAN_FIX = new Set([
  "FONT_FAMILY", "FONT_SIZE", "BOLD", "ITALIC", "ALIGNMENT",
]);

function selectParagraphByIndex(editor: Editor, paraIdx: number): { from: number; to: number } | null {
  let count = 0;
  let result: { from: number; to: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "paragraph") {
      if (count === paraIdx) {
        result = { from: pos + 1, to: pos + node.nodeSize - 1 };
      }
      count++;
    }
  });
  return result;
}

export default function DocumentEditor({ documentId }: DocumentEditorProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [violations, setViolations] = useState<ViolationData[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [activeViolation, setActiveViolation] = useState<ViolationData | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const violationsRef = useRef<ViolationData[]>([]);
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  const onViolationClickRef = useRef<(violation: ViolationData, rect: DOMRect) => void>(() => {});

  useEffect(() => { violationsRef.current = violations; }, [violations]);
  useEffect(() => { dismissedIdsRef.current = dismissedIds; }, [dismissedIds]);

  const closePopover = useCallback(() => {
    setActiveViolation(null);
    setPopoverPosition(null);
  }, []);

  onViolationClickRef.current = useCallback(
    (violation: ViolationData, rect: DOMRect) => {
      setActiveViolation(violation);
      setPopoverPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
      });
    },
    [],
  );

  const editorRef = useRef<Editor | null>(null);

  const violationExtension = useMemo(
    () =>
      Extension.create({
        name: "violationOverlay",
        addProseMirrorPlugins() {
          return [createViolationPlugin(violationsRef, dismissedIdsRef, onViolationClickRef)];
        },
      }),
    [],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false }),
      Underline,
      TextStyle,
      FontFamily,
      TextAlign.configure({ types: ["paragraph"] }),
      violationExtension,
    ],
    content: "",
    editable: true,
    onUpdate: ({ editor: ed }) => {
      editorRef.current = ed as Editor;
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    editorRef.current = editor as Editor;
  }, [editor]);

  useEffect(() => {
    if (editor && htmlContent) {
      editor.commands.setContent(htmlContent);
    }
  }, [editor, htmlContent]);

  useEffect(() => {
    if (editor) {
      editor.view.dispatch(editor.state.tr.setMeta("violationUpdate", Date.now()));
    }
  }, [violations, dismissedIds, editor]);

  useEffect(() => {
    const fetchHtml = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/documents/${documentId}?includeHtml=true`);
        const json = await res.json();
        if (json.success) {
          setHtmlContent(json.data.html || "");
          setViolations(json.data.analysis?.violations || []);
        } else {
          setError(json.error?.message || "Belge içeriği yüklenemedi.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Belge içeriği yüklenirken hata oluştu.");
      } finally {
        setLoading(false);
      }
    };
    fetchHtml();
  }, [documentId]);

  const handleLeave = useCallback(
    (violationId: string) => {
      setDismissedIds((prev) => new Set([...prev, violationId]));
      closePopover();
    },
    [closePopover],
  );

  const handleFix = useCallback(
    (violation: ViolationData) => {
      const ed = editorRef.current;
      if (!ed) return;
      if (!VIOLATION_TYPES_THAT_CAN_FIX.has(violation.type)) {
        handleLeave(violation.id);
        return;
      }

      const idx = parseParagraphIndex(violation.location);
      if (idx === null) { handleLeave(violation.id); return; }

      const range = selectParagraphByIndex(ed, idx);
      if (!range) { handleLeave(violation.id); return; }

      ed.chain().focus().setTextSelection(range).run();

      switch (violation.type) {
        case "FONT_FAMILY":
          ed.chain().setFontFamily(violation.expected).run();
          break;
        case "FONT_SIZE": {
          const pts = violation.expected.replace(/[^0-9.]/g, "");
          ed.chain().setFontSize(`${pts}pt`).run();
          break;
        }
        case "BOLD":
          if (violation.expected.toLowerCase().includes("kalın") || violation.expected.toLowerCase().includes("bold")) {
            ed.chain().setBold().run();
          } else {
            ed.chain().unsetBold().run();
          }
          break;
        case "ITALIC":
          if (violation.expected.toLowerCase().includes("italik") || violation.expected.toLowerCase().includes("italic")) {
            ed.chain().setItalic().run();
          } else {
            ed.chain().unsetItalic().run();
          }
          break;
        case "ALIGNMENT": {
          const align = violation.expected.toLowerCase();
          if (align.includes("justify") || align.includes("iki yana")) {
            ed.chain().setTextAlign("justify").run();
          } else if (align.includes("center") || align.includes("orta")) {
            ed.chain().setTextAlign("center").run();
          } else if (align.includes("right") || align.includes("sağ")) {
            ed.chain().setTextAlign("right").run();
          } else {
            ed.chain().setTextAlign("left").run();
          }
          break;
        }
      }

      handleLeave(violation.id);
    },
    [handleLeave],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <EditorToolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>

      <ViolationPopover
        violation={activeViolation}
        position={popoverPosition}
        onFix={handleFix}
        onLeave={handleLeave}
        onClose={closePopover}
      />
    </div>
  );
}
