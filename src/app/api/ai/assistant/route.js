import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth-context";
import { assistantSchema, generateStructured, redactSensitiveText } from "@/lib/groq-ai";

export const runtime = "nodejs";

const pendingProposalSchema = z.object({
  id: z.string().max(160).optional(),
  type: z.enum(["task", "note", "decision"]),
  title: z.string().max(180),
  content: z.string().max(4000).optional(),
  project_id: z.string().uuid().nullable().optional(),
  status: z.string().max(40).optional(),
  priority: z.string().max(40).nullable().optional(),
  due_at: z.string().max(80).nullable().optional(),
  rationale: z.string().max(600).nullable().optional(),
});

const bodySchema = z.object({
  message: z.string().trim().min(2).max(8000),
  project_slug: z.string().max(160).nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(2500),
  })).max(10).default([]),
  pending_proposals: z.array(pendingProposalSchema).max(8).default([]),
  refine_proposal_id: z.string().max(160).nullable().optional(),
});

export async function POST(request) {
  try {
    const values = bodySchema.parse(await request.json());
    const { supabase, workspaceId } = await requireWorkspace();
    const scope = await resolveScope(supabase, workspaceId, values);
    if (scope.error) return NextResponse.json({ error: scope.error }, { status: 403 });
    const context = await loadContext(supabase, workspaceId, scope);
    const history = values.history
      .slice(-6)
      .map((item) => `${item.role === "user" ? "Usuário" : "Assistente"}: ${item.content.slice(0, 800)}`)
      .join("\n");
    const compactContext = compactAssistantContext(context, scope.type);
    const pendingProposals = values.pending_proposals.map((proposal) => ({
      ...proposal,
      content: proposal.content?.slice(0, 800),
      rationale: proposal.rationale?.slice(0, 300),
    }));
    const contextPrompt = limitPromptText(JSON.stringify(compactContext), 6000);
    const proposalsPrompt = limitPromptText(JSON.stringify(pendingProposals), 1800);
    const historyPrompt = limitPromptText(history || "Sem mensagens anteriores.", 1800);
    const personalRule = scope.type === "general"
      ? "Na área geral, quando o pedido for pessoal ou não mencionar projeto/cliente, proponha somente task ou note com project_id null. Se o usuário nomear claramente um projeto existente, use o id dele."
      : "Neste contexto específico, toda proposta deve usar um dos project_id disponíveis e nunca deve ser pessoal.";
    const refinementRule = values.refine_proposal_id
      ? `O usuário acionou explicitamente a revisão da proposta ${values.refine_proposal_id}. Refaça a sugestão considerando toda a conversa e devolva proposal_action "replace". Não mantenha a versão antiga.`
      : values.pending_proposals.length
        ? `Existem propostas aguardando confirmação. Se o usuário pedir correção, mudança, refinamento ou demonstrar insatisfação, devolva somente a versão revisada e use proposal_action "replace". Use "append" apenas para uma nova ação independente. Para apenas responder ou explicar, use "keep" e proposals vazio.`
        : `Não há propostas pendentes. Use proposal_action "append" quando criar sugestões e "keep" quando apenas responder.`;
    const result = await generateStructured({
      name: "squire_assistant_response", schema: assistantSchema,
      maxCompletionTokens: 1200,
      instructions: `Você é o Squire, um copiloto de operação e negócios. Sua personalidade é serena, prática, criteriosa e direta: fale como um parceiro experiente, sem frases genéricas de assistente. Responda em português do Brasil e use exclusivamente os dados fornecidos.

O contexto ativo é ${scope.label}. ${personalRule} Nunca misture outros clientes ou projetos quando houver contexto específico.

Você domina organização de projetos, definição de escopo, prioridades, precificação de serviços e produtos e construção de orçamentos. Ao ajudar em preços, considere escopo e entregáveis, horas estimadas, valor/hora, custos diretos e de terceiros, impostos, risco, contingência, margem, forma de pagamento e validade. Diferencie faturamento, custo, margem e lucro. Nunca invente valores ausentes: peça poucos dados essenciais ou apresente cenários claramente identificados como estimativas. Você pode redigir um orçamento completo, mas não deve tratar recomendações como aconselhamento contábil ou jurídico definitivo.

Distinga com clareza fatos encontrados nos dados, cálculos, premissas e recomendações. Mostre contas de precificação de forma verificável e conclua com uma recomendação objetiva.

Você pode ler, resumir, listar pendências, encontrar atrasos, sugerir prioridades e preparar propostas. Quando o usuário pedir criação ou registro, devolva propostas; nunca alegue que salvou. Cada proposta exige confirmação humana. ${refinementRule}

Extraia datas relativas usando hoje como ${new Date().toISOString().slice(0, 10)} e grave due_at em ISO ou null. Não proponha exclusão, alteração financeira automática ou acesso a credenciais. Um orçamento pode ser sugerido como nota para revisão. Decisões exigem projeto. Seja objetivo e cite títulos e datas presentes nos dados.`,
      input: `CONTEXTO DISPONÍVEL:\n${contextPrompt}\n\nPROPOSTAS AGUARDANDO CONFIRMAÇÃO:\n${proposalsPrompt}\n\nCONVERSA RECENTE:\n${historyPrompt}\n\nSOLICITAÇÃO:\n${values.message.slice(0, 2200)}`,
    });
    const allowedProjects = new Set(context.projects.map((project) => project.id));
    const proposals = (result.proposals || []).filter((proposal) => {
      if (proposal.project_id) return allowedProjects.has(proposal.project_id);
      return scope.type === "general" && ["task", "note"].includes(proposal.type);
    }).map((proposal, index) => ({ ...proposal, id: `proposal-${Date.now()}-${index}` }));
    return NextResponse.json({
      reply: result.reply,
      proposals,
      proposal_action: result.proposal_action || (proposals.length ? "append" : "keep"),
      context: scope.public,
    });
  } catch (error) {
    return NextResponse.json({ error: error?.issues?.[0]?.message || error.message || "O assistente ficou indisponível." }, { status: 400 });
  }
}

function limitPromptText(value, maxChars) {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n[trecho reduzido automaticamente para respeitar o limite da IA]`;
}

function compactAssistantContext(context, scopeType) {
  const limits = scopeType === "general"
    ? { projects: 10, tasks: 16, notes: 6, decisions: 5, meetings: 5, finances: 10 }
    : { projects: 5, tasks: 20, notes: 8, decisions: 6, meetings: 6, finances: 10 };
  const clip = (value, size = 500) => value ? String(value).slice(0, size) : value;
  return {
    projects: context.projects.slice(0, limits.projects).map((item) => ({
      id: item.id, name: item.name, status: item.status, priority: item.priority,
      progress: item.progress, due_at: item.due_at, agreed_value_cents: item.agreed_value_cents,
      client_id: item.client_id,
    })),
    personal_agenda: context.personal_agenda ? {
      tasks: context.personal_agenda.tasks.slice(0, 12),
      notes: context.personal_agenda.notes.slice(0, 5).map((item) => ({ ...item, content: clip(item.content, 280) })),
    } : undefined,
    tasks: context.tasks.slice(0, limits.tasks),
    notes: context.notes.slice(0, limits.notes).map((item) => ({ ...item, content: clip(item.content, 320) })),
    decisions: context.decisions.slice(0, limits.decisions).map((item) => ({ ...item, content: clip(item.content, 300) })),
    meetings: context.meetings.slice(0, limits.meetings).map((item) => ({
      ...item, agenda: clip(item.agenda, 240), summary: clip(item.summary, 300),
    })),
    financial_summary: context.financial_summary.slice(0, limits.finances),
  };
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
  return { type: "general", label: "área geral e agenda pessoal do workspace", public: { type: "general", name: "Visão geral" } };
}

async function loadContext(supabase, workspaceId, scope) {
  let projectsQuery = supabase.from("projects").select("id,name,slug,status,priority,progress,due_at,agreed_value_cents,client_id,clients(name)").eq("workspace_id", workspaceId).is("archived_at", null).limit(40);
  if (scope.type === "project") projectsQuery = projectsQuery.eq("id", scope.projectId);
  else if (scope.type === "client") projectsQuery = projectsQuery.eq("client_id", scope.clientId);
  const { data: projects, error } = await projectsQuery;
  if (error) throw error;
  const projectIds = projects.map((project) => project.id);
  let tasksQuery = supabase.from("tasks").select("id,project_id,title,status,priority,due_at,next_action").eq("workspace_id", workspaceId).is("archived_at", null).order("due_at", { ascending: true, nullsFirst: false }).limit(80);
  let notesQuery = supabase.from("notes").select("id,project_id,title,content,status,updated_at").eq("workspace_id", workspaceId).is("archived_at", null).order("updated_at", { ascending: false }).limit(40);
  if (scope.type === "general") {
    if (projectIds.length) { const list = projectIds.join(","); tasksQuery = tasksQuery.or(`project_id.is.null,project_id.in.(${list})`); notesQuery = notesQuery.or(`project_id.is.null,project_id.in.(${list})`); }
    else { tasksQuery = tasksQuery.is("project_id", null); notesQuery = notesQuery.is("project_id", null); }
  } else if (projectIds.length) { tasksQuery = tasksQuery.in("project_id", projectIds); notesQuery = notesQuery.in("project_id", projectIds); }
  else return { projects: [], personal_agenda: { tasks: [], notes: [] }, tasks: [], notes: [], decisions: [], meetings: [], financial_summary: [] };
  const noProjects = Promise.resolve({ data: [], error: null });
  const [tasks, notes, decisions, meetings, finances] = await Promise.all([
    tasksQuery, notesQuery,
    projectIds.length ? supabase.from("decisions").select("id,project_id,title,content,status,decided_at").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).order("decided_at", { ascending: false }).limit(40) : noProjects,
    projectIds.length ? supabase.from("meetings").select("id,project_id,title,scheduled_at,agenda,summary").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).order("scheduled_at", { ascending: false }).limit(30) : noProjects,
    projectIds.length ? supabase.from("financial_entries").select("project_id,description,entry_type,status,amount_cents,paid_amount_cents,due_at").eq("workspace_id", workspaceId).in("project_id", projectIds).is("archived_at", null).neq("status", "cancelled").limit(80) : noProjects,
  ]);
  const failed = [tasks, notes, decisions, meetings, finances].find((item) => item.error); if (failed) throw failed.error;
  const safeNotes = notes.data.map((note) => ({ ...note, content: redactSensitiveText(note.content?.slice(0, 1200)) }));
  return { projects, personal_agenda: scope.type === "general" ? { tasks: tasks.data.filter((item) => !item.project_id), notes: safeNotes.filter((item) => !item.project_id) } : undefined, tasks: tasks.data, notes: safeNotes, decisions: decisions.data.map((item) => ({ ...item, content: redactSensitiveText(item.content) })), meetings: meetings.data.map((item) => ({ ...item, agenda: redactSensitiveText(item.agenda), summary: redactSensitiveText(item.summary) })), financial_summary: summarizeFinances(finances.data) };
}

function summarizeFinances(entries) {
  const map = new Map();
  for (const entry of entries) { const row = map.get(entry.project_id) || { project_id: entry.project_id, received_cents: 0, pending_cents: 0, expenses_cents: 0 }; const paid = Number(entry.paid_amount_cents || (entry.status === "paid" ? entry.amount_cents : 0)); if (entry.entry_type === "income") { row.received_cents += paid; row.pending_cents += Math.max(0, Number(entry.amount_cents) - paid); } else if (["expense", "tax", "service_cost", "refund"].includes(entry.entry_type)) row.expenses_cents += Number(entry.amount_cents); map.set(entry.project_id, row); }
  return [...map.values()];
}
