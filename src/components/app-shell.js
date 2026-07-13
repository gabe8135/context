import Link from "next/link";
import { Archive, ArrowLeft, BookOpen, Bot, BrainCircuit, CalendarDays, CheckSquare, CircleHelp, FileDown, FolderKanban, History, Inbox, KeyRound, Landmark, LayoutDashboard, LayoutTemplate, Lightbulb, Network, PackageCheck, Paperclip, Server, Settings, Users, Video, Wallet } from "lucide-react";
import { logoutAction } from "@/app/app/auth-actions";
import { GlobalSearch } from "./global-search";
import { MobileSidebarController } from "./mobile-sidebar-controller";
import { RouteAwareLink } from "./route-aware-link";
import { ResponsiveTables } from "./responsive-tables";
import { CalendarQuickView } from "./calendar-quick-view";
import { ThemeToggle } from "./theme-toggle";
import { ActiveNavLink } from "./active-nav-link";

const general = [
  { label: "Trabalho", items: [[LayoutDashboard, "Visão geral", "/app"], [Inbox, "Entrada", "/app/entrada"], [CalendarDays, "Agenda", "/app/agenda"], [Users, "Clientes", "/app/clientes"], [FolderKanban, "Projetos", "/app/projetos"], [CheckSquare, "Tarefas", "/app/tarefas"], [Wallet, "Financeiro", "/app/financeiro"]] },
  { label: "Conhecimento", items: [[Lightbulb, "Decisões", "/app/decisoes"], [Video, "Reuniões", "/app/reunioes"], [BookOpen, "Notas", "/app/notas"], [Server, "Infraestrutura", "/app/infraestrutura"], [Archive, "Arquivados", "/app/arquivados"]] },
  { label: "Operação", items: [[Bot, "Assistente Squire", "/app/assistente"], [BrainCircuit, "Organizar anotações", "/app/organizar"], [Inbox, "Caixa de entrada", "/app/operacao/entrada"], [BookOpen, "Procedimentos", "/app/operacao/procedimentos"], [PackageCheck, "Entregáveis", "/app/operacao/entregaveis"], [KeyRound, "Credenciais", "/app/operacao/credenciais"], [Paperclip, "Arquivos", "/app/operacao/arquivos"], [LayoutTemplate, "Modelos", "/app/modelos"], [Settings, "Configurações", "/app/configuracoes"], [CircleHelp, "Manual", "/app/ajuda"]] }
];

function projectGroups(project) {
  const query = `?projeto=${project.slug}`;
  return [
    { label: "Projeto em foco", items: [[LayoutDashboard, "Resumo", `/app/projetos/${project.slug}`], [Bot, "Assistente", `/app/assistente${query}`], [CheckSquare, "Tarefas", `/app/tarefas${query}`], [Landmark, "Financeiro", `/app/financeiro${query}`], [Lightbulb, "Decisões", `/app/decisoes${query}`], [Video, "Reuniões", `/app/reunioes${query}`], [BookOpen, "Notas", `/app/notas${query}`]] },
    { label: "Materiais do projeto", items: [[PackageCheck, "Entregáveis", `/app/operacao/entregaveis${query}`], [BookOpen, "Procedimentos", `/app/operacao/procedimentos${query}`], [KeyRound, "Credenciais", `/app/operacao/credenciais${query}`], [Paperclip, "Arquivos", `/app/operacao/arquivos${query}`], [Server, "Infraestrutura", `/app/infraestrutura${query}`], [Network, "Relações", `/app/projetos/${project.slug}/relacoes`], [History, "Histórico", `/app/projetos/${project.slug}/historico`], [FileDown, "Exportar", `/app/projetos/${project.slug}/exportar`]] }
  ];
}

function clientGroups(client) {
  return [
    { label: "Cliente em foco", items: [[LayoutDashboard, "Resumo do cliente", `/app/clientes/${client.id}`], [Bot, "Assistente", `/app/assistente?cliente=${client.id}`], [Users, "Editar cliente", `/app/clientes/${client.id}/editar`]] },
    { label: "Projetos do cliente", items: (client.projects || []).map((project) => [FolderKanban, project.name, `/app/projetos/${project.slug}`]) }
  ];
}

export function AppShell({ children, preview = false, context = null }) {
  const groups = context?.type === "project" ? projectGroups(context) : context?.type === "client" ? clientGroups(context) : general;
  const focusHref = context?.type === "project" ? `/app/projetos/${context.slug}` : context?.type === "client" ? `/app/clientes/${context.id}` : null;
  return <div className="shell">
    <aside className="sidebar" id="app-sidebar" aria-label="Menu principal">
      <div className="brand"><span className="brand-mark"><BrainCircuit size={18}/></span><span>Squire</span></div>
      {context?.type === "project" && <div className="focus-card"><small>PROJETO EM FOCO</small><b>{context.name}</b><span>{context.clients?.name || ""}</span><Link className="focus-back-button" href="/app"><span className="focus-back-icon"><ArrowLeft size={14}/></span><span>Voltar à visão geral</span></Link></div>}
      {context?.type === "client" && <div className="focus-card"><small>CLIENTE EM FOCO</small><b>{context.name}</b><span>{context.projects?.length || 0} projeto(s)</span><Link className="focus-back-button" href="/app"><span className="focus-back-icon"><ArrowLeft size={14}/></span><span>Voltar à visão geral</span></Link></div>}
      {groups.map((group) => <div key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(([Icon, label, href]) => <ActiveNavLink href={href} key={label}><Icon size={16}/><span>{label}</span></ActiveNavLink>)}</div>)}
      <div className="sidebar-foot">Workspace pessoal<form action={logoutAction}><button className="nav-link" type="submit">Sair</button></form></div>
    </aside>
    <main className="main">
      <ResponsiveTables/>
      {preview && <div className="preview">Modo de demonstração</div>}
      <header className="topbar">
        <MobileSidebarController/>
        <GlobalSearch/>
        <div className="top-actions">
          <RouteAwareLink className="btn" href={focusHref || "/app/entrada"}>{context?.type === "project" ? <FolderKanban size={14}/> : context?.type === "client" ? <Users size={14}/> : <Inbox size={14}/>} {context?.type === "project" ? "Projeto" : context?.type === "client" ? "Cliente" : "Entrada"}</RouteAwareLink>
          <CalendarQuickView/>
          <ThemeToggle/>
        </div>
      </header>
      {context && <div className="context-strip" role="status"><div className="context-mobile-card"><small>{context.type === "project" ? "PROJETO" : "CLIENTE"} EM FOCO</small><b>{context.name}</b><span>{context.type === "project" ? context.clients?.name ? `Cliente: ${context.clients.name}` : "Projeto selecionado" : `${context.projects?.length || 0} projeto(s)`}</span><Link className="focus-back-button" href="/app"><span className="focus-back-icon"><ArrowLeft size={14}/></span><span>Voltar à visão geral</span></Link></div></div>}
      {children}
    </main>
  </div>;
}
