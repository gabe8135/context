import Link from "next/link";
import { Archive, BookOpen, BrainCircuit, CheckSquare, CircleHelp, FolderKanban, Inbox, LayoutDashboard, Lightbulb, Plus, Search, Server, Users, Video, Wallet } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/app/app/auth-actions";

const groups = [
  { label: "Trabalho", items: [[LayoutDashboard,"Visão geral","/app"],[Inbox,"Entrada e agenda","/app/entrada"],[Users,"Clientes","/app/clientes"],[FolderKanban,"Projetos","/app/projetos"],[CheckSquare,"Tarefas","/app/tarefas"],[Wallet,"Financeiro","/app/financeiro"]] },
  { label: "Contexto", items: [[Lightbulb,"Decisões","/app/decisoes"],[Video,"Reuniões","/app/reunioes"],[BookOpen,"Notas","/app/notas"],[Server,"Infraestrutura","/app/infraestrutura"],[Archive,"Arquivados","/app/arquivados"]] },
  { label: "Operação", items: [[BrainCircuit,"Organizar anotações","/app/organizar"],[Inbox,"Caixa de entrada","/app/operacao/entrada"],[BookOpen,"Procedimentos","/app/operacao/procedimentos"],[CheckSquare,"Entregáveis","/app/operacao/entregaveis"],[Server,"Credenciais","/app/operacao/credenciais"],[Archive,"Arquivos","/app/operacao/arquivos"],[CircleHelp,"Manual","/app/ajuda"]] },
];

export function AppShell({ children, preview = false }) {
  return <div className="shell"><aside className="sidebar"><div className="brand"><span className="brand-mark"><BrainCircuit size={17}/></span>Contexto</div>{groups.map((group) => <div key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(([Icon,label,href]) => <Link className="nav-link" href={href} key={label}><Icon size={16}/>{label}</Link>)}</div>)}<div className="sidebar-foot">Workspace pessoal<form action={logoutAction}><button className="nav-link" type="submit">Sair</button></form></div></aside><main className="main">{preview && <div className="preview">Modo de demonstração</div>}<header className="topbar"><form className="search" action="/app/busca"><Search size={14}/><input name="q" aria-label="Busca global" placeholder="Buscar projetos, clientes, tarefas..." required/></form><div className="top-actions"><Link className="btn" href="/app/tarefas/nova"><Plus size={14}/> Tarefa</Link><Link className="btn" href="/app/financeiro/novo"><Plus size={14}/> Lançamento</Link><ThemeToggle/></div></header>{children}<nav className="mobile-nav"><Link href="/app/entrada"><Inbox size={18}/>Entrada</Link><Link href="/app/projetos"><FolderKanban size={18}/>Projetos</Link><Link href="/app/tarefas"><CheckSquare size={18}/>Tarefas</Link><Link href="/app/financeiro"><Wallet size={18}/>Financeiro</Link></nav></main></div>;
}
