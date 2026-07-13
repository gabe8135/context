import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth-context";
import { assistantSchema, generateStructured, redactSensitiveText } from "@/lib/groq-ai";

export const runtime = "nodejs";
const bodySchema = z.object({ message: z.string().trim().min(2).max(5000), project_slug: z.string().max(160).nullable().optional(), client_id: z.string().uuid().nullable().optional(), history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(3000) })).max(8).default([]) });

export async function POST(request) {
  try {
    const values = bodySchema.parse(await request.json());
    const { supabase, workspaceId } = await requireWorkspace();
    const scope = await resolveScope(supabase, workspaceId, values);
    if (scope.error) return NextResponse.json({ error: scope.error }, { status: 403 });
    const context = await loadContext(supabase, workspaceId, scope);
    const history = values.history.map((item) => `${item.role === "user" ? "Usuário" : "Assistente"}: ${item.content}`).join("\n");
    const result = await generateStructured({
      name: "squire_assistant_response", schema: assistantSchema,
      instructions: `Você é o copiloto do Squire, um sistema de organização profissional. Responda em português do Brasil. Use exclusivamente os dados fornecidos. O contexto ativo é ${scope.label}. Nunca misture outros clientes/projetos quando houver contexto específico. Você pode ler e resumir. Quando o usuário pedir criação ou registro, devolva propostas; nunca alegue que salvou algo. Cada proposta precisa de confirmação humana. Não proponha exclusão, alteração financeira ou acesso a credenciais. Seja objetivo e cite títulos/datas presentes nos dados.`,
      input: `CONTEXTO DISPONÍVEL:\n${JSON.stringify(context)}\n\nCONVERSA RECENTE:\n${history || "Sem mensagens anteriores."}\n\nSOLICITAÇÃO:\n${values.message}`,
    });
    const allowedProjects = new Set(context.projects.map((project) => project.id));
    const proposals = (result.proposals || []).filter((proposal) => proposal.project_id && allowedProjects.has(proposal.project_id)).map((proposal, index) => ({ ...proposal, id: `proposal-${index}` }));
    return NextResponse.json({ reply: result.reply, proposals, context: scope.public });
  } catch (error) {
    return NextResponse.json({ error: error?.issues?.[0]?.message || error.message || "O assistente ficou indisponível." }, { status: 400 });
  }
}

async function resolveScope(supabase, workspaceId, values) {
  if (values.project_slug) {
    const { data, error } = await supabase.from("projects").select("id,name,slug,client_id,clients(name)").eq("workspace_id", workspaceId).eq("slug", values.project_slug).is("archived_at", null).maybeSingle();
    if (error || !data) return { error: "Projeto não encontrado neste workspace." };
    return { type: "project", projectId: data.id, clientId: data.client_id, label: `projeto ${data.name}`, public: { type: "project", name: data.name, slug: data.slug } };
  }
  if (values.client_id) {
    const { data, error } = await supabase.from("clients").select("id,name").eq("workspace_id", workspaceId).eq("id", values.client_id).is("archived_at", null).maybeSingle();
    if (error || !data) return { error: "Cliente não encontrado neste workspace." };
    return { type: "client", clientId: data.id, label: `cliente ${data.name}`, public: { type: "client", name: data.name, id: data.id } };
  }
  return { type: "general", label: "área geral do workspace", public: { type: "general", name: "Visão geral" } };
}

async function loadContext(supabase, workspaceId, scope) {
  let projectsQuery = supabase.from("projects").select("id,name,slug,status,priority,progress,due_at,agreed_value_cents,client_id,clients(name)").eq("workspace_id", workspaceId).is("archived_at", null).limit(40);
  if (scope.type === "project") projectsQuery = projectsQuery.eq("id", scope.projectId); else if (scope.type === "client") projectsQuery = projectsQuery.eq("client_id", scope.clientId);
  const { data: projects, error } = await projectsQuery;
  if (error) throw error;
  const projectIds = projects.map((project) => project.id);
  if (!projectIds.length) return { projects: [], tasks: [], notes: [], decisions: [], meetings: [], financial_summary: [] };
  const [tasks, notes, decisions, meetings, finances] = await Promise.all([
    supabase.from("tasks").select("id,project_id,title,status,priority,due_at,next_action").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).order("due_at", { ascending: true, nullsFirst: false }).limit(80),
    supabase.from("notes").select("id,project_id,title,content,status,updated_at").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).order("updated_at", { ascending: false }).limit(40),
    supabase.from("decisions").select("id,project_id,title,content,status,decided_at").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).order("decided_at", { ascending: false }).limit(40),
    supabase.from("meetings").select("id,project_id,title,scheduled_at,agenda,summary").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).order("scheduled_at", { ascending: false }).limit(30),
    supabase.from("financial_entries").select("project_id,description,entry_type,status,amount_cents,paid_amount_cents,due_at").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).neq("status", "cancelled").limit(80),
  ]);
  const failed = [tasks, notes, decisions, meetings, finances].find((result) => result.error); if (failed) throw failed.error;
  return { projects, tasks: tasks.data, notes: notes.data.map((note) => ({ ...note, content: redactSensitiveText(note.content?.slice(0, 1200)) })), decisions: decisions.data.map((decision) => ({ ...decision, content: redactSensitiveText(decision.content) })), meetings: meetings.data.map((meeting) => ({ ...meeting, agenda: redactSensitiveText(meeting.agenda), summary: redactSensitiveText(meeting.summary) })), financial_summary: summarizeFinances(finances.data) };
}

function summarizeFinances(entries) {
  const map = new Map();
  for (const entry of entries) { const row = map.get(entry.project_id) || { project_id: entry.project_id, received_cents: 0, pending_cents: 0, expenses_cents: 0 }; const paid = Number(entry.paid_amount_cents || (entry.status === "paid" ? entry.amount_cents : 0)); if (entry.entry_type === "income") { row.received_cents += paid; row.pending_cents += Math.max(0, Number(entry.amount_cents) - paid); } else if (["expense", "tax", "service_cost", "refund"].includes(entry.entry_type)) row.expenses_cents += Number(entry.amount_cents); map.set(entry.project_id, row); }
  return [...map.values()];
}
