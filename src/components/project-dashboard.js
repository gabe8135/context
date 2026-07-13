"use client";

import Link from "next/link";
import { AlertTriangle, BookOpen, CheckCircle2, CheckSquare, Circle, CircleDollarSign, Clock3, FileText, FolderOpen, Lightbulb, PackageCheck, Pencil, Plus, Server, Video } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleTaskAction } from "@/app/app/tarefas/actions";
import { NaturalCapture } from "./natural-capture";
import { TaskDetailsModal } from "./task-details-modal";

const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(cents / 100);
const due = (date) => date ? new Date(date).toLocaleDateString("pt-BR") : "Sem prazo";

export function ProjectDashboard({ project }) {
  const [tasks, setTasks] = useState(project.tasks);
  const [selectedTask, setSelectedTask] = useState(null);
  const [busy, startTransition] = useTransition();
  const completed = tasks.filter((task) => task.status === "completed").length;
  const open = tasks.filter((task) => task.status !== "completed");
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : project.progress;

  function toggle(task) {
    const markCompleted = task.status !== "completed";
    setTasks((items) => items.map((item) => item.id === task.id ? { ...item, status: markCompleted ? "completed" : "todo" } : item));
    startTransition(() => toggleTaskAction(task.id, project.id, project.slug));
  }

  return <article className="content project-document">
    <header className="project-document-hero">
      <div><div className="eyebrow">{project.client_name} · Projeto {project.status}</div><h1 className="page-title">{project.name}</h1><p className="subtitle">Uma página viva para entender, executar e preservar este projeto.</p></div>
      <Link className="btn icon-btn" href={`/app/projetos/${project.slug}/editar`}><Pencil size={15}/> Editar</Link>
      <div className="document-progress"><span><b>{progress}%</b> concluído</span><div className="progress"><i style={{ width: `${progress}%` }}/></div></div>
    </header>

    <NaturalCapture projectSlug={project.slug}/>

    {project.alerts.length > 0 && <section className="document-callout warning"><AlertTriangle size={19}/><div><b>Precisa de atenção</b>{project.alerts.map((alert) => <p key={alert.id}>{alert.title} — {alert.recommended_action}</p>)}</div></section>}

    <section className="document-section" id="proximos-passos">
      <SectionTitle icon={CheckSquare} title="Próximos passos" action={`/app/tarefas/nova?projeto=${project.slug}`} actionLabel="Nova tarefa"/>
      <p className="section-description">O que move o projeto agora, ordenado pelo prazo mais próximo.</p>
      <div className="document-checklist">{open.length ? open.slice(0, 8).map((task) => <TaskRow key={task.id} task={task} busy={busy} onToggle={() => toggle(task)} onOpen={() => setSelectedTask(task)}/>) : <Empty text="Nada pendente. Defina o próximo passo quando precisar."/>}</div>
    </section>

    <section className="document-section" id="etapas">
      <SectionTitle icon={CheckCircle2} title="Etapas do trabalho"/>
      <div className="stage-grid"><Stage label="A fazer" count={tasks.filter((task) => task.status === "todo").length}/><Stage label="Em andamento" count={tasks.filter((task) => ["doing", "in_progress", "review"].includes(task.status)).length}/><Stage label="Concluído" count={completed}/></div>
      {completed > 0 && <details className="completed-work"><summary>Ver {completed} item(ns) concluído(s)</summary><div>{tasks.filter((task) => task.status === "completed").map((task) => <TaskRow key={task.id} task={task} busy={busy} onToggle={() => toggle(task)} onOpen={() => setSelectedTask(task)}/>)}</div></details>}
    </section>

    <section className="document-section" id="contexto">
      <SectionTitle icon={BookOpen} title="Caderno do projeto" action={`/app/notas/nova?projeto=${project.slug}`} actionLabel="Nova nota"/>
      <p className="section-description">Notas, decisões e encontros que explicam por que o projeto está assim.</p>
      <div className="knowledge-grid">
        <KnowledgeBlock icon={FileText} title="Notas" href={`/app/notas?projeto=${project.slug}`} rows={project.notes} render={(note) => ({ title: note.title, meta: note.content?.slice(0, 100), href: `/app/notas/${note.id}` })}/>
        <KnowledgeBlock icon={Lightbulb} title="Decisão atual" href={`/app/decisoes?projeto=${project.slug}`} rows={project.last_decision?.id ? [project.last_decision] : []} render={(decision) => ({ title: decision.title || "Decisão registrada", meta: decision.content, href: `/app/decisoes?projeto=${project.slug}` })}/>
        <KnowledgeBlock icon={Video} title="Reuniões" href={`/app/reunioes?projeto=${project.slug}`} rows={project.meetings} render={(meeting) => ({ title: meeting.title, meta: due(meeting.scheduled_at), href: `/app/reunioes/${meeting.id}` })}/>
      </div>
    </section>

    {(project.deliverables.length > 0 || project.files.length > 0) && <section className="document-section" id="documentos">
      <SectionTitle icon={FolderOpen} title="Documentos internos"/>
      <div className="knowledge-grid two"><KnowledgeBlock icon={PackageCheck} title="Entregáveis" href={`/app/operacao/entregaveis?projeto=${project.slug}`} rows={project.deliverables} render={(item) => ({ title: item.name, meta: item.status, href: `/app/operacao/entregaveis?projeto=${project.slug}` })}/><KnowledgeBlock icon={FileText} title="Arquivos" href={`/app/operacao/arquivos?projeto=${project.slug}`} rows={project.files} render={(file) => ({ title: file.logical_name, meta: `Versão ${file.version}`, href: `/app/operacao/arquivos?projeto=${project.slug}` })}/></div>
    </section>}

    <section className="document-section structured-summary" id="dados">
      <SectionTitle icon={Server} title="Dados estruturados"/>
      <p className="section-description">Aparecem aqui somente quando ajudam a entender este projeto.</p>
      <div className="structured-cards">
        <Link href={`/app/financeiro?projeto=${project.slug}`}><CircleDollarSign/><span>Financeiro</span><b>{money(project.financial.received_cents)} recebido</b><small>{money(project.financial.pending_cents)} pendente · {money(project.financial.expense_cents)} em despesas</small></Link>
        {project.infrastructure.length > 0 && <Link href={`/app/infraestrutura?projeto=${project.slug}`}><Server/><span>Infraestrutura</span><b>{project.infrastructure.length} item(ns)</b><small>{project.infrastructure.slice(0, 2).map((item) => item.detail).join(" · ")}</small></Link>}
        <Link href={`/app/projetos/${project.slug}/historico`}><Clock3/><span>Linha do tempo</span><b>{project.last_activity.description}</b><small>Ver histórico completo</small></Link>
      </div>
    </section>
    {selectedTask && <TaskDetailsModal task={selectedTask} projectSlug={project.slug} onClose={() => setSelectedTask(null)}/>} 
  </article>;
}

function SectionTitle({ icon: Icon, title, action, actionLabel }) { return <header className="document-section-title"><div><Icon size={19}/><h2>{title}</h2></div>{action && <Link className="btn" href={action}><Plus size={14}/>{actionLabel}</Link>}</header>; }
function TaskRow({ task, busy, onToggle, onOpen }) { return <div className="document-task"><button className="task-state" disabled={busy} onClick={onToggle} aria-label={task.status === "completed" ? "Reabrir tarefa" : "Concluir tarefa"}>{task.status === "completed" ? <CheckCircle2/> : <Circle/>}</button><button className="task-content" onClick={onOpen}><b className={task.status === "completed" ? "done" : ""}>{task.title}</b><span>{task.priority} · {due(task.due_at)}</span></button></div>; }
function Stage({ label, count }) { return <div className="stage"><span>{label}</span><b>{count}</b></div>; }
function KnowledgeBlock({ icon: Icon, title, href, rows = [], render }) { return <div className="knowledge-block"><header><div><Icon size={16}/><b>{title}</b></div><Link href={href}>Abrir tudo</Link></header>{rows.length ? rows.slice(0, 4).map((row) => { const item = render(row); return <Link className="knowledge-row" href={item.href} key={row.id}><b>{item.title}</b><span>{item.meta || "Sem detalhes"}</span></Link>; }) : <Empty text={`Nenhum item em ${title.toLowerCase()}.`}/>}</div>; }
function Empty({ text }) { return <div className="document-empty">{text}</div>; }
