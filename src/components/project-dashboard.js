"use client";

import Link from "next/link";
import { AlertTriangle, CheckSquare, CircleDollarSign, Clock3, Lightbulb, Plus, Server } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleTaskAction } from "@/app/app/tarefas/actions";
import { TaskDetailsModal } from "./task-details-modal";

const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100);
const ago = (date) => { const days = Math.max(0, Math.round((Date.now() - new Date(date)) / 86400000)); return days ? `Há ${days} dia${days > 1 ? "s" : ""}` : "Hoje"; };
const due = (date) => date ? new Date(date).toLocaleDateString("pt-BR") : "Sem prazo";

export function ProjectDashboard({ project }) {
  const [tasks, setTasks] = useState(project.tasks);
  const [selectedTask, setSelectedTask] = useState(null);
  const [busy, startTransition] = useTransition();
  const completed = tasks.filter((task) => task.status === "completed").length;
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : project.progress;

  function toggle(task) {
    const markCompleted = task.status !== "completed";
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status: markCompleted ? "completed" : "todo" } : item));
    startTransition(() => toggleTaskAction(task.id, project.id, project.slug));
  }

  return <div className="content">
    <div className="project-head"><div><div className="eyebrow">{project.client_name} · Projeto {project.status}</div><h1 className="page-title">{project.name}</h1><p className="subtitle">Seu contexto operacional, sem caça ao tesouro.</p></div><div style={{ width: 220 }}><div className="meta" style={{ display: "flex", justifyContent: "space-between" }}><span>Progresso</span><b>{progress}%</b></div><div className="progress"><i style={{ width: `${progress}%` }}/></div></div></div>
    <div className="actions project-quick-actions"><Link className="btn primary project-quick-action" href={`/app/tarefas/nova?projeto=${project.slug}`} aria-label="Nova tarefa" title="Nova tarefa"><span className="quick-action-icons"><Plus/><CheckSquare/></span><span className="quick-action-label">Nova tarefa</span></Link><Link className="btn project-quick-action" href={`/app/financeiro/novo?projeto=${project.slug}`} aria-label="Novo pagamento" title="Novo pagamento"><span className="quick-action-icons"><Plus/><CircleDollarSign/></span><span className="quick-action-label">Novo pagamento</span></Link><Link className="btn project-quick-action" href={`/app/decisoes/nova?projeto=${project.slug}`} aria-label="Nova decisão" title="Nova decisão"><span className="quick-action-icons"><Plus/><Lightbulb/></span><span className="quick-action-label">Nova decisão</span></Link><Link className="btn" href={`/app/projetos/${project.slug}/editar`}>Editar</Link></div>
    <section className="metrics"><Metric label="Recebido" value={money(project.financial.received_cents)} green/><Metric label="Pendente" value={money(project.financial.pending_cents)}/><Metric label="Despesas" value={money(project.financial.expense_cents)}/><Metric label="Última atividade" value={ago(project.last_activity_at)}/></section>
    <div className="dashboard-grid"><div style={{ display: "grid", gap: 20 }}><Panel icon={AlertTriangle} title="Atenção" count={project.alerts.length}>{project.alerts.length ? project.alerts.map((alert) => <Row key={alert.id} title={alert.title} meta={alert.recommended_action}/>) : <Empty text="Nenhum item exige atenção."/>}</Panel><Panel icon={CheckSquare} title="Tarefas" count={`${completed}/${tasks.length}`} subtitle="Prazo mais próximo primeiro">{tasks.length ? tasks.map((task) => <div className="item task-preview" key={task.id} role="button" tabIndex="0" onClick={() => setSelectedTask(task)} onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setSelectedTask(task)}><input className="task-check" aria-label={`Concluir ${task.title}`} disabled={busy} type="checkbox" checked={task.status === "completed"} onClick={(event) => event.stopPropagation()} onChange={() => toggle(task)}/><div className="item-main"><div className="item-title" style={{ textDecoration: task.status === "completed" ? "line-through" : "none" }}>{task.title}</div><div className="meta">{task.status.replaceAll("_", " ")} · {task.priority} · {due(task.due_at)}</div></div></div>) : <Empty text="Crie a primeira tarefa para calcular o progresso."/>}</Panel></div><div style={{ display: "grid", gap: 20, alignContent: "start" }}><Panel icon={Server} title="Infraestrutura">{project.infrastructure.length ? <div className="infra">{project.infrastructure.map((item, index) => <div className="infra-item" key={index}><div className="item-title">{item.name}</div><div className="meta">{item.detail}</div></div>)}</div> : <Empty text="Nenhum item técnico registrado."/>}</Panel><Panel icon={Lightbulb} title="Última decisão"><div className="quote">“{project.last_decision.content}”</div><div className="meta">{project.last_decision.responsible}</div></Panel><Panel icon={Clock3} title="Última atividade"><Row title={project.last_activity.description} meta={`${project.last_activity.actor_name} · ${ago(project.last_activity.created_at)}`}/></Panel></div></div>
    {selectedTask && <TaskDetailsModal task={selectedTask} projectSlug={project.slug} onClose={() => setSelectedTask(null)}/>}
  </div>;
}

function Metric({ label, value, green }) { return <div className="metric"><div className="metric-label">{label}</div><div className="metric-value mono" style={green ? { color: "var(--success)" } : undefined}>{value}</div></div>; }
function Panel({ icon: Icon, title, count, subtitle, children }) { return <section className="panel"><header className="panel-head"><div><div className="panel-title"><Icon size={17}/>{title}</div>{subtitle && <div className="meta">{subtitle}</div>}</div>{count !== undefined && <span className="badge">{count}</span>}</header><div className="panel-body">{children}</div></section>; }
function Row({ title, meta }) { return <div className="item"><div className="item-main"><div className="item-title">{title}</div><div className="meta">{meta}</div></div></div>; }
function Empty({ text }) { return <p className="meta" style={{ padding: "16px 0" }}>{text}</p>; }
