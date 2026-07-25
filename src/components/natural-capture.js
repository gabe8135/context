"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Check, FileText, LoaderCircle, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { saveOrganizedItemsAction } from "@/app/app/organizar/actions";

const LABELS = { task: "Tarefa", note: "Nota", decision: "Decisão", procedure: "Procedimento", income: "Receita", expense: "Despesa", domain: "Domínio" };

export function NaturalCapture({ projectId = null, projectSlug = "" }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open) return;
    const close = (event) => event.key === "Escape" && setOpen(false);
    document.documentElement.classList.add("modal-open");
    window.addEventListener("keydown", close);
    return () => {
      document.documentElement.classList.remove("modal-open");
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  const update = (id, patch) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));

  async function organize() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/organize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), project_id: projectId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível organizar a anotação.");
      setItems(result.items || []);
      setSummary(result.summary || "");
      setOpen(true);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    const selected = items.filter((item) => item.selected);
    if (!selected.length || saving) return;
    setSaving(true);
    setError("");
    const result = await saveOrganizedItemsAction({ projectId, items: selected });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setText("");
    setItems([]);
    setSuccess(`${result.imported} ${result.imported === 1 ? "item salvo" : "itens salvos"} no ${projectSlug ? "projeto" : "seu espaço pessoal"}.`);
    router.refresh();
    window.setTimeout(() => setSuccess(""), 4500);
  }

  const modal = open ? <div className="modal-backdrop capture-review-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
    <section className="app-modal capture-review-modal" role="dialog" aria-modal="true" aria-labelledby="capture-review-title">
      <header className="modal-head capture-review-head"><span className="capture-review-head-icon"><Sparkles/></span><div><span className="eyebrow">Revisão antes de salvar</span><h2 id="capture-review-title">Sugestões organizadas</h2><p>{summary || "Confira os itens encontrados pela IA."}</p></div><button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X/></button></header>
      <div className="capture-review-summary"><span><FileText size={15}/>{items.filter((item) => item.selected).length} de {items.length} selecionado(s)</span><small>Revise, ajuste e confirme somente o que deseja guardar.</small></div>
      <div className="capture-review-list">{items.length ? items.map((item, index) => <article className={`capture-review-item ${item.selected ? "selected" : ""}`} key={item.id}>
        <header className="capture-review-item-head"><label className="capture-review-select"><input type="checkbox" checked={item.selected} onChange={(event) => update(item.id, { selected: event.target.checked })}/><span>{LABELS[item.type] || item.type}</span></label><span className="capture-review-index">Sugestão {String(index + 1).padStart(2, "0")}</span></header>
        <label className="capture-review-field"><span>Título</span><input aria-label="Título da sugestão" value={item.title || ""} onChange={(event) => update(item.id, { title: event.target.value })}/></label>
        <label className="capture-review-field"><span>Descrição e contexto</span><textarea aria-label="Detalhes da sugestão" rows="3" value={item.content || ""} onChange={(event) => update(item.id, { content: event.target.value })}/></label>
        {item.rationale && <small className="capture-review-rationale"><Sparkles size={13}/> <span><b>Por que foi classificado assim?</b>{item.rationale}</span></small>}
      </article>) : <p className="document-empty">A IA não encontrou itens úteis nesse texto. Tente acrescentar um pouco mais de contexto.</p>}</div>
      {error && <p className="error capture-review-error" role="alert">{error}</p>}
      <footer className="modal-actions"><button className="btn primary" type="button" disabled={saving || !items.some((item) => item.selected)} onClick={save}>{saving ? <><LoaderCircle className="spin" size={15}/> Salvando…</> : <><Check size={15}/> Confirmar e salvar</>}</button><button className="btn" type="button" onClick={() => setOpen(false)}>Continuar editando o texto</button></footer>
    </section>
  </div> : null;

  return <><section className="natural-capture" aria-labelledby="capture-title">
    <div className="natural-capture-copy">
      <span className="capture-icon"><Sparkles size={17}/></span>
      <div><h2 id="capture-title">O que está na sua cabeça?</h2><p>Escreva ou cole sem organizar. A IA propõe os lugares certos e você confirma.</p></div>
    </div>
    <textarea value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") organize(); }} rows="3" placeholder="Ex.: preciso enviar a proposta amanhã, o cliente aprovou o layout e pagou a entrada…"/>
    <div className="natural-capture-actions">{success ? <span className="capture-save-success" role="status"><Check size={14}/>{success}</span> : <small>Ctrl + Enter para organizar</small>}<button className="btn primary" type="button" disabled={!text.trim() || loading} onClick={organize}>{loading ? <><LoaderCircle className="spin" size={15}/> Analisando…</> : <>Organizar <ArrowRight size={15}/></>}</button></div>
    {error && !open && <p className="error capture-inline-error" role="alert">{error}</p>}
  </section>{open && createPortal(modal, document.body)}</>;
}
