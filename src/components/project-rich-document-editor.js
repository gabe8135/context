"use client";

import {
  Bold, Bot, CheckSquare, FilePlus2, Heading1, Heading2, Heading3, Italic,
  Link2, List, ListOrdered, Minus, Pilcrow, Quote, Redo2, Save, Sparkles,
  Strikethrough, Underline, Undo2, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createProjectPageAction, saveProjectDocumentationAction, saveProjectPageAction,
} from "@/app/app/projetos/actions";
import { richDocumentText, sanitizeRichDocument } from "@/lib/rich-document";

const SLASH_COMMANDS = [
  { id: "page", aliases: ["page", "pagina", "página"], label: "Página", description: "Cria uma subpágina neste local", icon: FilePlus2 },
  { id: "todo", aliases: ["todo", "to-do", "tarefa"], label: "Lista de tarefas", description: "Insere um item marcável", icon: CheckSquare },
  { id: "h1", aliases: ["h1", "titulo1"], label: "Título 1", description: "Título principal da seção", icon: Heading1 },
  { id: "h2", aliases: ["h2", "titulo2"], label: "Título 2", description: "Título de seção", icon: Heading2 },
  { id: "h3", aliases: ["h3", "titulo3"], label: "Título 3", description: "Subtítulo", icon: Heading3 },
  { id: "text", aliases: ["texto", "text", "p"], label: "Texto", description: "Parágrafo comum", icon: Pilcrow },
  { id: "bullet", aliases: ["lista", "bullet"], label: "Lista com marcadores", description: "Lista simples", icon: List },
  { id: "numbered", aliases: ["numerada", "numbered"], label: "Lista numerada", description: "Lista em ordem", icon: ListOrdered },
  { id: "quote", aliases: ["citacao", "citação", "quote"], label: "Citação", description: "Destaca uma frase", icon: Quote },
  { id: "divider", aliases: ["divisor", "divider", "linha"], label: "Divisor", description: "Separa visualmente seções", icon: Minus },
];

export function ProjectRichDocumentEditor({ project, page = null }) {
  const router = useRouter();
  const initial = sanitizeRichDocument(page?.content ?? project.documentation_content ?? "");
  const editorRef = useRef(null);
  const slashRangeRef = useRef(null);
  const slashMenuRef = useRef(null);
  const slashQueryRef = useRef(null);
  const slashIndexRef = useRef(0);
  const pageInsertionRangeRef = useRef(null);
  const [content, setContent] = useState(initial);
  const [savedContent, setSavedContent] = useState(initial);
  const [title, setTitle] = useState(page?.title || project.name);
  const [savedTitle, setSavedTitle] = useState(page?.title || project.name);
  const [feedback, setFeedback] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [aiError, setAiError] = useState("");
  const [formats, setFormats] = useState({});
  const [slashQuery, setSlashQuery] = useState(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashPosition, setSlashPosition] = useState({ left: 18, top: 70 });
  const [pageDialog, setPageDialog] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const [aiPending, setAiPending] = useState(false);

  const filteredCommands = useMemo(() => {
    const query = String(slashQuery || "").toLowerCase();
    return SLASH_COMMANDS.filter((item) => !query || item.aliases.some((alias) => alias.startsWith(query)));
  }, [slashQuery]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== initial) editorRef.current.innerHTML = initial;
  }, [initial]);

  useEffect(() => {
    slashQueryRef.current = slashQuery;
  }, [slashQuery]);

  useEffect(() => {
    slashIndexRef.current = slashIndex;
    slashMenuRef.current?.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
  }, [slashIndex]);

  useEffect(() => {
    function closeOnOutsidePointer(event) {
      if (slashQueryRef.current === null) return;
      if (slashMenuRef.current?.contains(event.target) || editorRef.current?.contains(event.target)) return;
      closeSlashMenu();
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

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

  function format(tag) { command("formatBlock", `<${tag}>`); }

  function addLink() {
    const url = window.prompt("Cole o endereço do link:");
    if (url) command("createLink", url);
  }

  function syncContent() {
    editorRef.current?.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.toggleAttribute("checked", input.checked);
    });
    setContent(sanitizeRichDocument(editorRef.current?.innerHTML || ""));
    setFeedback(null);
  }

  function detectSlashMenu() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !selection.isCollapsed) return closeSlashMenu();
    const range = selection.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE || !editorRef.current?.contains(node)) return closeSlashMenu();
    const before = node.textContent.slice(0, range.startOffset);
    const match = before.match(/(?:^|\s)\/([\p{L}\p{N}-]*)$/u);
    if (!match) return closeSlashMenu();
    const slashStart = range.startOffset - match[1].length - 1;
    const slashRange = document.createRange();
    slashRange.setStart(node, slashStart);
    slashRange.setEnd(node, range.startOffset);
    slashRangeRef.current = slashRange;
    const caret = range.getBoundingClientRect();
    const wrapper = editorRef.current.parentElement.getBoundingClientRect();
    const menuWidth = Math.min(340, Math.max(260, wrapper.width - 20));
    const left = Math.max(10, Math.min(caret.left - wrapper.left, wrapper.width - menuWidth - 10));
    const spaceBelow = window.innerHeight - caret.bottom;
    const top = spaceBelow < 330
      ? Math.max(10, caret.top - wrapper.top - 320)
      : caret.bottom - wrapper.top + 7;
    setSlashPosition({ left, top });
    const nextQuery = match[1];
    if (slashQueryRef.current !== nextQuery) {
      slashQueryRef.current = nextQuery;
      slashIndexRef.current = 0;
      setSlashIndex(0);
      setSlashQuery(nextQuery);
    }
  }

  function closeSlashMenu() {
    slashQueryRef.current = null;
    slashRangeRef.current = null;
    setSlashQuery(null);
  }

  function removeSlashText() {
    const range = slashRangeRef.current;
    if (!range) return null;
    range.deleteContents();
    range.collapse(true);
    const insertionRange = range.cloneRange();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    closeSlashMenu();
    return insertionRange;
  }

  function runSlashCommand(item) {
    const insertionRange = removeSlashText();
    if (item.id === "page") {
      pageInsertionRangeRef.current = insertionRange;
      setPageDialog(true);
      return;
    }
    if (item.id === "todo") {
      document.execCommand("insertHTML", false, '<p class="document-todo"><input type="checkbox"> <span>Nova tarefa</span></p>');
    } else if (item.id === "h1" || item.id === "h2" || item.id === "h3") {
      format(item.id);
    } else if (item.id === "text") {
      format("p");
    } else if (item.id === "bullet") {
      command("insertUnorderedList");
    } else if (item.id === "numbered") {
      command("insertOrderedList");
    } else if (item.id === "quote") {
      format("blockquote");
    } else if (item.id === "divider") {
      document.execCommand("insertHTML", false, "<hr><p><br></p>");
    }
    syncContent();
  }

  function placeCaretIn(element) {
    const range = document.createRange();
    range.setStart(element, 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function insertPlainParagraphAfterPageLink(pageLink) {
    const editor = editorRef.current;
    if (!editor || !pageLink || !editor.contains(pageLink)) return false;

    const paragraph = document.createElement("p");
    paragraph.appendChild(document.createElement("br"));
    const block = pageLink.closest("p,div,h1,h2,h3,blockquote,li");
    const insertionTarget = block && block !== editor ? block : pageLink;
    insertionTarget.after(paragraph);
    placeCaretIn(paragraph);
    return true;
  }

  function pageLinkAtCaret() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !selection.isCollapsed) return null;
    const node = selection.anchorNode;
    if (!node || !editorRef.current?.contains(node)) return null;

    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const directLink = element?.closest?.('a[data-project-page-id]');
    if (directLink) return directLink;

    if (node.nodeType === Node.ELEMENT_NODE && selection.anchorOffset > 0) {
      const previous = node.childNodes[selection.anchorOffset - 1];
      if (previous?.nodeType === Node.ELEMENT_NODE && previous.matches?.('a[data-project-page-id]')) {
        return previous;
      }
    }
    return null;
  }

  function handleEditorKeyDown(event) {
    if (slashQuery === null) {
      if (event.key === "Enter") {
        const pageLink = pageLinkAtCaret();
        if (pageLink) {
          event.preventDefault();
          insertPlainParagraphAfterPageLink(pageLink);
          syncContent();
        }
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!filteredCommands.length) return;
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (slashIndexRef.current + direction + filteredCommands.length) % filteredCommands.length;
      slashIndexRef.current = nextIndex;
      setSlashIndex(nextIndex);
    } else if (event.key === "Enter" && filteredCommands.length) {
      event.preventDefault();
      runSlashCommand(filteredCommands[slashIndexRef.current] || filteredCommands[0]);
    } else if (event.key === "Tab" && filteredCommands.length) {
      event.preventDefault();
      runSlashCommand(filteredCommands[slashIndexRef.current] || filteredCommands[0]);
    } else if (event.key === "Home" && filteredCommands.length) {
      event.preventDefault();
      slashIndexRef.current = 0;
      setSlashIndex(0);
    } else if (event.key === "End" && filteredCommands.length) {
      event.preventDefault();
      slashIndexRef.current = filteredCommands.length - 1;
      setSlashIndex(filteredCommands.length - 1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeSlashMenu();
    }
  }

  function createPage() {
    startTransition(async () => {
      const result = await createProjectPageAction(project.id, project.slug, page?.id || null, newPageTitle);
      if (!result.ok) return setFeedback(result);

      const insertionRange = pageInsertionRangeRef.current;
      const editor = editorRef.current;
      if (!editor || !insertionRange || !editor.contains(insertionRange.commonAncestorContainer)) {
        return setFeedback({
          ok: false,
          message: "A página foi criada, mas o ponto de inserção não está mais disponível. Reabra o documento para continuar.",
        });
      }

      const pageLink = document.createElement("a");
      pageLink.href = result.viewHref;
      pageLink.textContent = result.page.title;
      pageLink.setAttribute("data-project-page-id", result.page.id);
      insertionRange.insertNode(pageLink);
      insertPlainParagraphAfterPageLink(pageLink);

      const clean = sanitizeRichDocument(editor.innerHTML || "");
      const parentSave = page
        ? await saveProjectPageAction(page.id, project.id, project.slug, title, clean)
        : await saveProjectDocumentationAction(project.id, project.slug, clean);
      if (!parentSave.ok) {
        return setFeedback({
          ok: false,
          message: `A página foi criada, mas o link não pôde ser salvo no documento: ${parentSave.message}`,
        });
      }

      setContent(clean);
      setSavedContent(clean);
      pageInsertionRangeRef.current = null;
      setPageDialog(false);
      setNewPageTitle("");
      router.push(result.href);
      router.refresh();
    });
  }

  function save() {
    startTransition(async () => {
      const clean = sanitizeRichDocument(editorRef.current?.innerHTML || "");
      const result = page
        ? await saveProjectPageAction(page.id, project.id, project.slug, title, clean)
        : await saveProjectDocumentationAction(project.id, project.slug, clean);
      setFeedback(result);
      if (result.ok) {
        const persistedTitle = result.title || title.trim() || "Sem título";
        setContent(clean);
        setSavedContent(clean);
        setTitle(persistedTitle);
        setSavedTitle(persistedTitle);
        router.refresh();
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
      setAiError(/429|rate limit|limite/i.test(error.message)
        ? "A cota gratuita da IA está ocupada. Aguarde cerca de um minuto e tente novamente."
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

  const dirty = content !== savedContent || title !== savedTitle;
  return <div className="rich-document-layout">
    <section className="rich-document-shell" aria-label="Editor do documento">
      {page && <input className="rich-document-title-input" value={title} onChange={(event) => { setTitle(event.target.value); setFeedback(null); }} placeholder="Sem título" aria-label="Título da página"/>}
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
      <div className="rich-document-canvas-wrap">
        <div
          ref={editorRef}
          className="rich-document-canvas"
          contentEditable
          suppressContentEditableWarning
          onInput={() => { syncContent(); detectSlashMenu(); }}
          onClick={(event) => {
            if (event.target.matches?.('input[type="checkbox"]')) queueMicrotask(syncContent);
            detectSlashMenu();
          }}
          onKeyUp={(event) => {
            if (!["ArrowDown", "ArrowUp", "Enter", "Tab", "Home", "End", "Escape"].includes(event.key)) detectSlashMenu();
          }}
          onKeyDown={handleEditorKeyDown}
          data-placeholder="Comece a escrever ou digite / para inserir um bloco..."
        />
        {slashQuery !== null && <div ref={slashMenuRef} className="slash-command-menu" role="listbox" aria-label="Comandos de bloco" style={slashPosition}>
          <div className="slash-command-heading">Blocos básicos</div>
          {filteredCommands.length ? filteredCommands.map((item, index) => {
            const Icon = item.icon;
            return <button key={item.id} type="button" className={index === slashIndex ? "is-active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => runSlashCommand(item)}>
              <span><Icon size={17}/></span><div><b>{item.label}</b><small>{item.description}</small></div>
            </button>;
          }) : <p>Nenhum comando encontrado.</p>}
        </div>}
      </div>
      <footer className="rich-document-footer">
        <span>{richDocumentText(content).length.toLocaleString("pt-BR")} caracteres</span>
        <span aria-live="polite">{feedback?.ok ? "Documento salvo" : dirty ? "Alterações não salvas" : ""}</span>
        {feedback && !feedback.ok && <span className="documentation-error">{feedback.message}</span>}
        <button className="btn primary" type="button" disabled={pending || !dirty} onClick={save}><Save size={15}/>{pending ? "Salvando..." : "Salvar"}</button>
      </footer>
    </section>

    <aside className="document-ai-panel">
      <header><Bot size={18}/><div><b>Assistente de escrita</b><span>Usa somente o contexto deste projeto.</span></div></header>
      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ex.: crie um relatório executivo ou melhore os próximos passos"/>
      <div className="document-ai-actions">
        <button className="btn" type="button" disabled={aiPending} onClick={() => askAi("generate")}><Sparkles size={14}/>Gerar texto</button>
        <button className="btn" type="button" disabled={aiPending || !richDocumentText(content)} onClick={() => askAi("improve")}>Aprimorar atual</button>
      </div>
      {aiPending && <p className="meta">O Squire está preparando uma sugestão...</p>}
      {aiError && <p className="error">{aiError}</p>}
      {suggestion && <div className="document-ai-suggestion">
        <div dangerouslySetInnerHTML={{ __html: suggestion }}/>
        <footer><button className="btn primary" type="button" onClick={() => applySuggestion(false)}>Inserir no fim</button><button className="btn" type="button" onClick={() => applySuggestion(true)}>Substituir</button><button className="btn ghost" type="button" onClick={() => setSuggestion("")}>Descartar</button></footer>
      </div>}
    </aside>

    {pageDialog && <div className="modal-backdrop slash-page-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setPageDialog(false)}>
      <section className="app-modal slash-page-modal" role="dialog" aria-modal="true" aria-labelledby="new-page-title">
        <button className="modal-close" type="button" onClick={() => setPageDialog(false)} aria-label="Fechar"><X size={18}/></button>
        <div className="eyebrow">Nova subpágina</div>
        <h2 id="new-page-title">Como esta página vai se chamar?</h2>
        <p>Ela ficará dentro de {page ? `“${page.title}”` : "Documento"}.</p>
        <input autoFocus value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && createPage()} placeholder="Sem título"/>
        {feedback && !feedback.ok && <p className="error">{feedback.message}</p>}
        <footer><button className="btn" type="button" onClick={() => setPageDialog(false)}>Cancelar</button><button className="btn primary" type="button" disabled={pending} onClick={createPage}><FilePlus2 size={15}/>Criar página</button></footer>
      </section>
    </div>}
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
