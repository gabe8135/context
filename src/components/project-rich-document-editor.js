"use client";

import {
  Bold, Bot, Heading1, Heading2, Heading3, Italic, Link2, List, ListOrdered,
  Pilcrow, Quote, Redo2, Save, Sparkles, Strikethrough, Underline, Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { saveProjectDocumentationAction } from "@/app/app/projetos/actions";
import { richDocumentText, sanitizeRichDocument } from "@/lib/rich-document";

export function ProjectRichDocumentEditor({ project }) {
  const initial = sanitizeRichDocument(project.documentation_content || "");
  const editorRef = useRef(null);
  const [content, setContent] = useState(initial);
  const [savedContent, setSavedContent] = useState(initial);
  const [feedback, setFeedback] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [aiError, setAiError] = useState("");
  const [formats, setFormats] = useState({});
  const [pending, startTransition] = useTransition();
  const [aiPending, setAiPending] = useState(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initial) {
      editorRef.current.innerHTML = initial;
    }
  }, [initial]);

  useEffect(() => {
    function readFormats() {
      const selection = window.getSelection();
      const anchor = selection?.anchorNode;
      if (!anchor || !editorRef.current?.contains(anchor)) return;
      const element = anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement;
      const block = element?.closest("h1,h2,h3,blockquote,p,div")?.tagName?.toLowerCase() || "p";
      setFormats({
        block,
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
        createLink: Boolean(element?.closest("a")),
        color: normalizeCommandColor(document.queryCommandValue("foreColor")),
      });
    }
    document.addEventListener("selectionchange", readFormats);
    return () => document.removeEventListener("selectionchange", readFormats);
  }, []);

  function command(name, value = null) {
    editorRef.current?.focus();
    document.execCommand(name, false, value);
    syncContent();
    document.dispatchEvent(new Event("selectionchange"));
  }

  function format(tag) {
    command("formatBlock", `<${tag}>`);
  }

  function addLink() {
    const url = window.prompt("Cole o endereço do link:");
    if (url) command("createLink", url);
  }

  function syncContent() {
    setContent(sanitizeRichDocument(editorRef.current?.innerHTML || ""));
    setFeedback(null);
  }

  function save() {
    startTransition(async () => {
      const clean = sanitizeRichDocument(editorRef.current?.innerHTML || "");
      const result = await saveProjectDocumentationAction(project.id, project.slug, clean);
      setFeedback(result);
      if (result.ok) {
        setContent(clean);
        setSavedContent(clean);
      }
    });
  }

  async function askAi(mode) {
    const instruction = prompt.trim() || (mode === "improve"
      ? "Aprimore a clareza, a estrutura e a formatação do documento, preservando todos os fatos."
      : "");
    if (instruction.length < 3) return;
    setAiPending(true);
    setAiError("");
    try {
      const response = await fetch("/api/ai/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_slug: project.slug,
          instruction,
          mode,
          current_document: richDocumentText(editorRef.current?.innerHTML || "").slice(0, 6000),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível gerar o texto.");
      setSuggestion(sanitizeRichDocument(payload.content));
    } catch (error) {
      const rateLimited = /429|rate limit|limite/i.test(error.message);
      setAiError(rateLimited
        ? "A cota gratuita da IA está ocupada neste momento. Aguarde cerca de um minuto e tente novamente."
        : error.message);
    } finally {
      setAiPending(false);
    }
  }

  function applySuggestion(replace) {
    const next = replace ? suggestion : `${editorRef.current?.innerHTML || ""}${suggestion}`;
    const clean = sanitizeRichDocument(next);
    if (editorRef.current) editorRef.current.innerHTML = clean;
    setContent(clean);
    setSuggestion("");
    setFeedback(null);
  }

  return <div className="rich-document-layout">
    <section className="rich-document-shell" aria-label="Editor do documento">
      <div className="rich-document-toolbar" role="toolbar" aria-label="Formatação do texto">
        <Tool icon={Undo2} label="Desfazer" onClick={() => command("undo")}/>
        <Tool icon={Redo2} label="Refazer" onClick={() => command("redo")}/>
        <span className="toolbar-divider"/>
        <Tool icon={Pilcrow} label="Parágrafo" active={formats.block === "p" || formats.block === "div"} onClick={() => format("p")}/>
        <Tool icon={Heading1} label="Título 1" active={formats.block === "h1"} onClick={() => format("h1")}/>
        <Tool icon={Heading2} label="Título 2" active={formats.block === "h2"} onClick={() => format("h2")}/>
        <Tool icon={Heading3} label="Título 3" active={formats.block === "h3"} onClick={() => format("h3")}/>
        <span className="toolbar-divider"/>
        <Tool icon={Bold} label="Negrito" active={formats.bold} onClick={() => command("bold")}/>
        <Tool icon={Italic} label="Itálico" active={formats.italic} onClick={() => command("italic")}/>
        <Tool icon={Underline} label="Sublinhado" active={formats.underline} onClick={() => command("underline")}/>
        <Tool icon={Strikethrough} label="Tachado" active={formats.strikeThrough} onClick={() => command("strikeThrough")}/>
        <Tool icon={List} label="Lista" active={formats.insertUnorderedList} onClick={() => command("insertUnorderedList")}/>
        <Tool icon={ListOrdered} label="Lista numerada" active={formats.insertOrderedList} onClick={() => command("insertOrderedList")}/>
        <Tool icon={Quote} label="Citação" active={formats.block === "blockquote"} onClick={() => format("blockquote")}/>
        <Tool icon={Link2} label="Link" active={formats.createLink} onClick={addLink}/>
        <label className="rich-color-tool" title="Cor do texto"><span>Cor</span><input type="color" value={formats.color || "#357a4a"} onChange={(event) => command("foreColor", event.target.value)}/></label>
      </div>
      <div
        ref={editorRef}
        className="rich-document-canvas"
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        data-placeholder="Comece a escrever o documento deste projeto..."
      />
      <footer className="rich-document-footer">
        <span>{richDocumentText(content).length.toLocaleString("pt-BR")} caracteres</span>
        <span aria-live="polite">{feedback?.ok ? "Documento salvo" : content !== savedContent ? "Alterações não salvas" : ""}</span>
        {feedback && !feedback.ok && <span className="documentation-error">{feedback.message}</span>}
        <button className="btn primary" type="button" disabled={pending || content === savedContent} onClick={save}><Save size={15}/>{pending ? "Salvando..." : "Salvar documento"}</button>
      </footer>
    </section>

    <aside className="document-ai-panel">
      <header><Bot size={18}/><div><b>Assistente de escrita</b><span>Usa somente o contexto deste projeto.</span></div></header>
      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ex.: crie um relatório executivo do projeto ou melhore a seção de próximos passos"/>
      <div className="document-ai-actions">
        <button className="btn" type="button" disabled={aiPending} onClick={() => askAi("generate")}><Sparkles size={14}/>Gerar texto</button>
        <button className="btn" type="button" disabled={aiPending || !richDocumentText(content)} onClick={() => askAi("improve")}>Aprimorar atual</button>
      </div>
      {aiPending && <p className="meta">O Squire está preparando uma sugestão...</p>}
      {aiError && <p className="error">{aiError}</p>}
      {suggestion && <div className="document-ai-suggestion">
        <div dangerouslySetInnerHTML={{ __html: suggestion }}/>
        <footer><button className="btn primary" type="button" onClick={() => applySuggestion(false)}>Inserir no fim</button><button className="btn" type="button" onClick={() => applySuggestion(true)}>Substituir documento</button><button className="btn ghost" type="button" onClick={() => setSuggestion("")}>Descartar</button></footer>
      </div>}
    </aside>
  </div>;
}

function Tool({ icon: Icon, label, onClick, active = false }) {
  return <button className={active ? "is-active" : ""} type="button" aria-pressed={active} onMouseDown={(event) => event.preventDefault()} onClick={onClick} title={label} aria-label={label}><Icon size={16}/></button>;
}

function normalizeCommandColor(value) {
  const color = String(value || "").trim();
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const rgb = color.match(/\d+/g)?.slice(0, 3).map(Number);
  if (!rgb || rgb.length !== 3) return "";
  return `#${rgb.map((part) => Math.max(0, Math.min(255, part)).toString(16).padStart(2, "0")).join("")}`;
}
