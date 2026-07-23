"use client";

import { Bot, Check, ClipboardCheck, LoaderCircle, MessageSquare, RefreshCw, Send, Sparkles, Square, Trash2, User, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function initialMessage(context) {
  return {
    role: "assistant",
    content: context.type === "general"
      ? "Estou na visão geral. Posso organizar sua agenda, analisar projetos, estruturar orçamentos e propor registros para você revisar antes de salvar."
      : `Estou focado no ${context.type === "project" ? "projeto" : "cliente"} ${context.name}. Posso analisar o trabalho, rever propostas e ajudar com escopo, preço e orçamento sem misturar dados de outros contextos.`,
  };
}

export function AssistantChat({ context, projects, confirmAction, success, error }) {
  const storageKey = `squire-assistant:${context.type}:${context.id || "general"}`;
  const [messages, setMessages] = useState(() => [initialMessage(context)]);
  const [proposals, setProposals] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [successMessage, setSuccessMessage] = useState(success || "");
  const [refineProposalId, setRefineProposalId] = useState(null);
  const [mobilePane, setMobilePane] = useState("chat");
  const abortRef = useRef(null);
  const inputRef = useRef(null);
  const messagesRef = useRef(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
      if (Array.isArray(saved?.messages) && saved.messages.length) setMessages(saved.messages);
      if (Array.isArray(saved?.proposals)) setProposals(saved.proposals);
    } catch {
      sessionStorage.removeItem(storageKey);
    } finally { setHydrated(true); }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(storageKey, JSON.stringify({ messages, proposals }));
  }, [hydrated, messages, proposals, storageKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    const frame = window.requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, loading]);

  useEffect(() => {
    if (!success) return;
    setSuccessMessage(success);
    const url = new URL(window.location.href);
    url.searchParams.delete("sucesso");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    const timer = window.setTimeout(() => setSuccessMessage(""), 4500);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function send(event) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) return;
    const next = [...messages, { role: "user", content: message }];
    const controller = new AbortController();
    abortRef.current = controller;
    setMessages(next);
    setMobilePane("chat");
    setInput("");
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          project_slug: context.type === "project" ? context.slug : null,
          client_id: context.type === "client" ? context.id : null,
          history: messages.slice(-10).map((item) => ({ ...item, content: item.content.slice(0, 2500) })),
          pending_proposals: proposals,
          refine_proposal_id: refineProposalId,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "O assistente ficou indisponível.");
      setMessages([...next, { role: "assistant", content: result.reply }]);
      setProposals((current) => {
        if (result.proposal_action === "replace") return result.proposals || [];
        if (result.proposal_action === "append") return [...current, ...(result.proposals || [])];
        return current;
      });
      if (result.proposals?.length) setMobilePane("proposals");
      if (result.proposal_action === "replace") setNotice("Proposta anterior substituída pela versão refinada.");
    } catch (requestError) {
      const content = requestError.name === "AbortError"
        ? "Resposta interrompida. Nenhuma proposta desta solicitação foi criada."
        : `Não consegui concluir a consulta: ${requestError.message}`;
      setMessages([...next, { role: "assistant", content }]);
    } finally {
      abortRef.current = null;
      setRefineProposalId(null);
      setLoading(false);
    }
  }

  function dismissProposal(id) {
    const remaining = proposals.filter((proposal) => proposal.id !== id);
    setProposals(remaining);
    if (!remaining.length) setMobilePane("chat");
    setNotice("Proposta recusada. Nenhum dado foi alterado.");
  }

  function requestRefinement(proposal) {
    setRefineProposalId(proposal.id);
    setMobilePane("chat");
    setInput(`Refaça a proposta "${proposal.title}" considerando toda a nossa conversa. Quero uma versão mais precisa e útil. `);
    setNotice("Explique o que deve mudar e envie. A nova versão substituirá a proposta atual.");
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function discardAll() {
    if (!proposals.length || window.confirm(`Descartar as ${proposals.length} propostas pendentes? Nada será salvo.`)) {
      setProposals([]);
      setMobilePane("chat");
      setNotice("Propostas descartadas. Nenhum dado foi alterado.");
    }
  }

  function clearConversation() {
    const hasWork = messages.length > 1 || proposals.length || input.trim();
    if (hasWork && !window.confirm("Iniciar uma nova conversa? As mensagens e propostas pendentes desta sessão serão apagadas.")) return;
    abortRef.current?.abort();
    setMessages([initialMessage(context)]);
    setProposals([]);
    setRefineProposalId(null);
    setMobilePane("chat");
    setInput("");
    setNotice("Nova conversa iniciada.");
    sessionStorage.removeItem(storageKey);
  }

  const returnQuery = context.type === "project" ? `?projeto=${encodeURIComponent(context.slug)}` : context.type === "client" ? `?cliente=${encodeURIComponent(context.id)}` : "";
  const names = useMemo(() => new Map([[null, "Pessoal"], ...projects.map((project) => [project.id, project.name])]), [projects]);
  const typeNames = { task: "Tarefa", note: "Nota", decision: "Decisão" };

  return <div className={`assistant-layout assistant-pane-${mobilePane}`}>
    {proposals.length > 0 && <div className="assistant-mobile-switch" role="tablist" aria-label="Alternar entre conversa e propostas">
      <button type="button" role="tab" aria-selected={mobilePane === "chat"} className={mobilePane === "chat" ? "active" : ""} onClick={() => setMobilePane("chat")}><MessageSquare size={15}/> Conversa</button>
      <button type="button" role="tab" aria-selected={mobilePane === "proposals"} className={mobilePane === "proposals" ? "active" : ""} onClick={() => setMobilePane("proposals")}><ClipboardCheck size={15}/> Propostas <span>{proposals.length}</span></button>
    </div>}
    <section className="panel assistant-chat-panel">
      <header className="panel-head assistant-panel-head">
        <div><div className="panel-title"><Bot size={18}/> Copiloto Squire</div><div className="meta">Leitura automática · gravação somente após confirmação</div></div>
        <div className="assistant-head-actions"><span className="badge assistant-context-badge" title={context.name}>{context.name}</span><button type="button" className="btn compact assistant-new-conversation" onClick={clearConversation} title="Limpar mensagens e iniciar outra conversa" aria-label="Nova conversa"><Trash2 size={14}/><span>Nova conversa</span></button></div>
      </header>
      {successMessage && <p className="success-note temporary-notice" role="status">{successMessage}</p>}{error && <p className="error" role="alert">{error}</p>}{notice && <p className="assistant-notice temporary-notice" role="status">{notice}</p>}
      <div ref={messagesRef} className="assistant-messages" aria-live="polite">{messages.map((message, index) => <div className={`assistant-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? <Sparkles size={15}/> : <User size={15}/>}</span><p>{message.content}</p></div>)}{loading && <div className="assistant-message assistant"><span><LoaderCircle className="spin" size={15}/></span><p>Lendo o contexto e preparando a resposta…</p></div>}</div>
      <form className="assistant-composer" onSubmit={send}>
        <div className="assistant-input-shell">
          <div className="assistant-input-label"><Sparkles size={14}/><span>Converse com o Squire</span></div>
          <textarea ref={inputRef} rows="3" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Peça um resumo, refine uma proposta ou monte um orçamento…" aria-label="Mensagem para o Assistente Squire"/>
          <div className="assistant-input-footer"><span>Enter envia · Shift + Enter quebra a linha</span>{loading ? <button type="button" className="assistant-send stop" onClick={() => abortRef.current?.abort()}><Square size={14}/><span>Interromper</span></button> : <button className="assistant-send" disabled={!input.trim()}><Send size={16}/><span>Enviar</span></button>}</div>
        </div>
      </form>
      <div className="assistant-hint"><span className="assistant-safe-dot"/> Propostas só alteram seus dados depois da sua confirmação.</div>
    </section>
    <aside className="assistant-proposals">
      <div className="proposal-section-head"><div><div className="eyebrow">Propostas para confirmar</div><small>{proposals.length ? `${proposals.length} pendente(s)` : "Nenhuma pendência"}</small></div>{proposals.length > 1 && <button type="button" className="btn compact" onClick={discardAll}><X size={14}/> Descartar todas</button>}</div>
      {proposals.length ? proposals.map((proposal) => <article className="panel proposal-card" key={proposal.id}><div className="proposal-head"><span className="badge">{typeNames[proposal.type] || proposal.type}</span><small>{names.get(proposal.project_id) || "Projeto"}</small></div><h3>{proposal.title}</h3><p>{proposal.content}</p><div className="meta">{proposal.rationale}</div><div className="proposal-actions"><form action={confirmAction.bind(null, returnQuery)} onSubmit={() => setProposals((current) => current.filter((item) => item.id !== proposal.id))}><input type="hidden" name="proposal" value={JSON.stringify(proposal)}/><button className="btn primary"><Check size={14}/> Confirmar e salvar</button></form><button type="button" className="btn" onClick={() => requestRefinement(proposal)}><RefreshCw size={14}/> Refinar</button><button type="button" className="btn" onClick={() => dismissProposal(proposal.id)}><X size={14}/> Recusar</button></div></article>) : <div className="empty-state compact"><Bot size={25}/><p>As ações sugeridas aparecerão aqui. Nada é salvo automaticamente.</p></div>}
    </aside>
  </div>;
}
