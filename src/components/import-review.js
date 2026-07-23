"use client";
import { useEffect, useState } from "react";
import { parseUnstructuredText } from "@/lib/import-parser";
import { StatusBadge } from "@/components/status-badge";

const labels = { task: "Tarefa", note: "Nota", decision: "Decisão", procedure: "Procedimento", income: "Receita", expense: "Despesa", domain: "Domínio" };
const DRAFT = "squire:organizar:draft";

export function ImportReview({ projects, action, initialProjectId = "" }) {
  const [text, setText] = useState("");
  const [items, setItems] = useState([]);
  const [projectId, setProjectId] = useState(initialProjectId);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { setText(localStorage.getItem(DRAFT) || ""); }, []);
  useEffect(() => { const timer = setTimeout(() => localStorage.setItem(DRAFT, text), 300); return () => clearTimeout(timer); }, [text]);
  const update = (id, patch) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  async function analyze() {
    if (text.trim().length < 3) return setAnalysis({ error: "Cole um texto com conteúdo suficiente." });
    setLoading(true); setAnalysis(null);
    try {
      const response = await fetch("/api/ai/organize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, project_id: projectId || null }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível analisar.");
      setItems(result.items || []); setAnalysis(result);
    } catch (error) {
      setItems(parseUnstructuredText(text)); setAnalysis({ mode: "fallback", warning: "A IA ficou indisponível. Usamos o organizador local.", error: error.message });
    } finally { setLoading(false); }
  }
  return <div>
    <section className="panel form-panel">
      <label className="field"><span>Contexto da análise</span><select value={projectId} onChange={(event) => { setProjectId(event.target.value); setItems([]); setAnalysis(null); }}><option value="">Agenda pessoal · sem projeto</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name} · {project.clients?.name}</option>)}</select><small className="meta">No contexto pessoal a IA organiza tarefas e notas. Selecione um projeto para liberar os demais tipos.</small></label>
      <label className="field"><span>Cole sua anotação</span><textarea rows="12" value={text} onChange={(event) => setText(event.target.value)}/><small className="meta">Rascunho preservado automaticamente neste dispositivo. Não cole senhas ou credenciais; padrões sensíveis são ocultados antes da análise.</small></label>
      <div className="form-actions"><button className="btn primary" type="button" disabled={loading} onClick={analyze}>{loading ? "Analisando com IA…" : "Analisar com IA"}</button><button className="btn" type="button" onClick={() => { setText(""); setItems([]); setAnalysis(null); localStorage.removeItem(DRAFT); }}>Limpar rascunho</button></div>
    </section>
    {analysis?.summary && <p className="ai-analysis-note"><b>{analysis.mode === "ai" ? "Análise da IA" : "Análise local"}</b>{analysis.summary}</p>}
    {analysis?.warning && <p className="warning-note">{analysis.warning}</p>}{analysis?.error && !items.length && <p className="error">{analysis.error}</p>}
    {items.length > 0 && <form action={action} className="panel" style={{ marginTop: 24, padding: 19 }}>
      <div className="panel-head"><div><div className="panel-title">Revisar propostas</div><div className="meta">A IA não salvou nada. Ajuste, desmarque ou confirme os itens abaixo.</div></div><span className="badge">{items.filter((item) => item.selected).length}/{items.length}</span></div>
      <label className="field"><span>Destino</span><select name="project_id" value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Agenda pessoal · sem projeto</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name} · {project.clients?.name}</option>)}</select></label>
      <input type="hidden" name="items" value={JSON.stringify(items.filter((item) => item.selected))}/>
      {items.map((item) => <div className="import-row" key={item.id}><input type="checkbox" checked={item.selected} onChange={(event) => update(item.id, { selected: event.target.checked })}/><select value={item.type} onChange={(event) => update(item.id, { type: event.target.value })}>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><div className="import-content"><input aria-label="Título do item" value={item.title || ""} onChange={(event) => update(item.id, { title: event.target.value })}/><textarea aria-label="Detalhes do item" rows="4" value={item.content} onChange={(event) => update(item.id, { content: event.target.value })}/>{item.rationale && <small className="meta">Por que foi classificado assim: {item.rationale}</small>}</div><StatusBadge status={item.status}/></div>)}
      <div className="form-actions"><button className="btn primary">Confirmar importação</button></div>
    </form>}
  </div>;
}
