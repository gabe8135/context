import { demoProject } from "@/data/demo-project";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { calculateFinancialSummary } from "@/lib/business";

const problem = new Set(["attention", "error", "pending"]);

export async function getProjectDashboard(slug) {
  if (!isSupabaseConfigured()) return { project: demoProject, preview: true };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { project: demoProject, preview: true };
  const { data: project, error } = await supabase.from("projects").select("id,slug,name,status,priority,agreed_value_cents,last_activity_at,clients(name)").eq("slug", slug).single();
  if (error?.code === "PGRST116") return { project: demoProject, preview: true };
  if (error) throw error;

  const requests = [
    supabase.from("alerts").select("id,title,severity,recommended_action").eq("project_id", project.id).eq("status", "open").limit(5),
    supabase.from("tasks").select("id,title,description,status,priority,starts_at,due_at,next_action,completed_at,created_at").eq("project_id", project.id).is("archived_at", null).not("status", "in", "(cancelled,archived)").order("due_at", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true }),
    supabase.from("financial_entries").select("entry_type,status,amount_cents,paid_amount_cents,due_at,description").eq("project_id", project.id).is("archived_at", null),
    supabase.from("domains").select("domain,status,expires_at").eq("project_id", project.id),
    supabase.from("hosting_accounts").select("provider,status,renews_at").eq("project_id", project.id),
    supabase.from("integrations").select("name,status").eq("project_id", project.id),
    supabase.from("dns_records").select("name,record_type,status").eq("project_id", project.id),
    supabase.from("ssl_certificates").select("issuer,status,expires_at").eq("project_id", project.id),
    supabase.from("email_services").select("provider,status").eq("project_id", project.id),
    supabase.from("decisions").select("id,title,content,decided_at,responsible_name").eq("project_id", project.id).eq("status", "current").is("archived_at",null).order("decided_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("activities").select("description,created_at,actor_name,type").eq("project_id", project.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("notes").select("id,title,content,status,updated_at").eq("project_id", project.id).is("archived_at", null).order("updated_at", { ascending: false }).limit(5),
    supabase.from("meetings").select("id,title,scheduled_at,summary").eq("project_id", project.id).is("archived_at", null).order("scheduled_at", { ascending: false }).limit(4),
    supabase.from("deliverables").select("id,name,status,due_at").eq("project_id", project.id).is("archived_at", null).order("due_at", { ascending: true, nullsFirst: false }).limit(5),
    supabase.from("files").select("id,logical_name,version,created_at").eq("project_id", project.id).eq("is_current", true).is("archived_at", null).order("created_at", { ascending: false }).limit(5),
  ];
  const results = await Promise.all(requests);
  const failed = results.find(result => result.error);
  if (failed) throw failed.error;
  const [storedAlerts, tasks, entries, domains, hosting, integrations, dns, ssl, email, decision, activity, notes, meetings, deliverables, files] = results.map(result => result.data || (result.data === null ? null : []));
  const rows = entries || [];
  const financial = calculateFinancialSummary(rows, project.agreed_value_cents);
  financial.overdue_cents = rows.filter(x => x.status !== "cancelled" && x.entry_type === "income" && (x.status === "overdue" || isPast(x.due_at) && x.status !== "paid")).reduce((total, item) => total + item.amount_cents, 0);
  const automaticAlerts = buildAlerts({ tasks, entries: rows, domains, hosting, integrations, dns, ssl, email });
  const timestamp = project.last_activity_at || new Date().toISOString();

  return { preview: false, project: {
    ...project,
    client_name: project.clients?.name,
    alerts: [...(storedAlerts || []), ...automaticAlerts].slice(0, 8),
    tasks: tasks || [],
    notes: notes || [],
    meetings: meetings || [],
    deliverables: deliverables || [],
    files: files || [],
    financial,
    infrastructure: [
      ...(domains || []).map(x => ({ name: "Domínio", detail: x.domain, status: x.status })),
      ...(hosting || []).map(x => ({ name: "Hospedagem", detail: x.provider, status: x.status })),
      ...(dns || []).map(x => ({ name: `DNS ${x.record_type}`, detail: x.name, status: x.status })),
      ...(ssl || []).map(x => ({ name: "Certificado SSL", detail: x.issuer || "Emissor não informado", status: x.status })),
      ...(email || []).map(x => ({ name: "E-mail", detail: x.provider || "Provedor não informado", status: x.status })),
      ...(integrations || []).map(x => ({ name: "Integração", detail: x.name, status: x.status })),
    ],
    last_decision: decision ? { ...decision, responsible: decision.responsible_name } : { content: "Nenhuma decisão registrada ainda.", responsible: "—", decided_at: timestamp },
    last_activity: activity || { description: "Projeto criado. Adicione a primeira atividade.", actor_name: "Você", created_at: timestamp },
  }};
}

function buildAlerts({ tasks = [], entries = [], domains = [], hosting = [], integrations = [], dns = [], ssl = [], email = [] }) {
  const alerts = [];
  tasks.filter(x => x.status !== "completed" && isPast(x.due_at)).forEach(x => alerts.push(alert(`Tarefa atrasada: ${x.title}`, "Concluir ou reagendar a tarefa.")));
  entries.filter(x => x.entry_type === "income" && x.status !== "paid" && isPast(x.due_at)).forEach(x => alerts.push(alert(`Pagamento vencido: ${x.description || "receita pendente"}`, "Confirmar o recebimento ou cobrar o cliente.")));
  domains.filter(x => expiresWithin(x.expires_at, 30)).forEach(x => alerts.push(alert(`Domínio próximo do vencimento: ${x.domain}`, "Verificar e renovar o domínio.")));
  hosting.filter(x => expiresWithin(x.renews_at, 30)).forEach(x => alerts.push(alert(`Hospedagem próxima da renovação: ${x.provider}`, "Conferir cobrança, backup e renovação.")));
  ssl.filter(x => expiresWithin(x.expires_at, 30)).forEach(x => alerts.push(alert("Certificado SSL próximo do vencimento", "Renovar ou validar a renovação automática.")));
  [...domains, ...hosting, ...integrations, ...dns, ...ssl, ...email].filter(x => problem.has(x.status)).forEach(x => alerts.push(alert(`Infraestrutura exige atenção: ${x.domain || x.provider || x.name || x.record_type || "item técnico"}`, "Abrir Infraestrutura e corrigir o status.")));
  return alerts;
}

function alert(title, recommended_action) { return { id: `auto-${title}`, title, severity: "warning", recommended_action } }
function isPast(date) { return Boolean(date) && new Date(date) < new Date() }
function expiresWithin(date, days) { if (!date) return false; const remaining = (new Date(date) - new Date()) / 86400000; return remaining <= days; }
