import { BellRing, Clock3, Globe2, Plus, SlidersHorizontal, WalletCards } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/status-badge";
import { requireWorkspace } from "@/lib/auth-context";
import { createAlertRuleAction, savePreferencesAction, toggleAlertRuleAction } from "./actions";

const EVENT_LABELS = {
  task_due: "Prazo de tarefa",
  payment_due: "Vencimento financeiro",
  domain_expiry: "Vencimento de domínio",
  meeting: "Reunião"
};

const SEVERITY_LABELS = { low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica" };

export default async function Settings({ searchParams }) {
  const query = await searchParams;
  const { supabase, user, workspaceId } = await requireWorkspace();
  const [{ data: preferences }, { data: rules, error }] = await Promise.all([
    supabase.from("user_preferences").select("*").eq("workspace_id", workspaceId).eq("user_id", user.id).maybeSingle(),
    supabase.from("alert_rules").select("*").eq("workspace_id", workspaceId).order("created_at")
  ]);
  if (error) throw error;

  return <AppShell><div className="content settings-page">
    <header className="settings-hero">
      <div className="settings-hero-icon"><SlidersHorizontal size={24}/></div>
      <div><div className="eyebrow">Seu espaço</div><h1 className="page-title">Configurações</h1><p className="subtitle">Ajuste como o Squire apresenta datas, valores e alertas para você.</p></div>
    </header>
    {query.sucesso && <p className="success-note">{query.sucesso}</p>}

    <div className="settings-grid">
      <form action={savePreferencesAction} className="panel settings-panel">
        <header className="settings-panel-head"><div className="settings-panel-icon"><Globe2 size={19}/></div><div><h2>Preferências</h2><p>Definições usadas em todo o seu espaço.</p></div></header>
        <div className="settings-form-grid">
          <label className="field"><span>Idioma</span><select name="locale" defaultValue={preferences?.locale || "pt-BR"}><option value="pt-BR">Português (Brasil)</option></select></label>
          <label className="field"><span>Fuso horário</span><input name="timezone" defaultValue={preferences?.timezone || "America/Sao_Paulo"}/><small><Clock3 size={13}/> Horários da agenda e dos lembretes.</small></label>
          <label className="field"><span>Moeda</span><select name="currency" defaultValue={preferences?.currency || "BRL"}><option value="BRL">Real (BRL)</option><option value="USD">Dólar (USD)</option></select><small><WalletCards size={13}/> Formatação do financeiro.</small></label>
          <label className="field"><span>Início da semana</span><select name="week_starts_on" defaultValue={preferences?.week_starts_on ?? 1}><option value="0">Domingo</option><option value="1">Segunda-feira</option></select></label>
          <label className="field full"><span>Visualização inicial de projetos</span><select name="default_project_view" defaultValue={preferences?.default_project_view || "list"}><option value="list">Lista</option><option value="board">Quadro</option></select></label>
        </div>
        <footer className="settings-panel-actions"><button className="btn primary">Salvar preferências</button></footer>
      </form>

      <section className="panel settings-panel alerts-settings-panel">
        <header className="settings-panel-head"><div className="settings-panel-icon"><BellRing size={19}/></div><div><h2>Alertas configuráveis</h2><p>Escolha com quanto tempo deseja ser avisado.</p></div></header>
        <form action={createAlertRuleAction} className="settings-rule-form">
          <label className="field rule-name"><span>Nome da regra</span><input name="name" required placeholder="Ex.: Cobrança próxima"/></label>
          <label className="field"><span>Evento</span><select name="event_type">{Object.entries(EVENT_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label className="field"><span>Antecedência</span><div className="input-with-suffix"><input name="days_before" type="number" min="0" defaultValue="3"/><span>dias</span></div></label>
          <label className="field"><span>Severidade</span><select name="severity">{Object.entries(SEVERITY_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <button className="btn primary settings-add-rule"><Plus size={15}/> Adicionar regra</button>
        </form>
        <div className="settings-rule-list">
          {rules?.map((rule) => <article className="settings-rule-card" key={rule.id}>
            <div className="settings-rule-main"><div className="settings-rule-title"><b>{rule.name}</b><StatusBadge status={rule.enabled ? "active" : "inactive"}/></div><p>{EVENT_LABELS[rule.event_type] || rule.event_type} · {rule.days_before} {rule.days_before === 1 ? "dia" : "dias"} antes · {SEVERITY_LABELS[rule.severity] || rule.severity}</p></div>
            <form action={toggleAlertRuleAction.bind(null, rule.id, rule.enabled)}><button className="btn">{rule.enabled ? "Desativar" : "Ativar"}</button></form>
          </article>)}
          {!rules?.length && <div className="settings-empty"><BellRing size={22}/><div><b>Nenhuma regra personalizada</b><p>Crie a primeira regra acima quando precisar de um aviso específico.</p></div></div>}
        </div>
      </section>
    </div>
  </div></AppShell>;
}
