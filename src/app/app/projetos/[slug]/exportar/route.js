import { requireWorkspace } from "@/lib/auth-context";
import { calculateProjectProgress } from "@/lib/project-progress";

export async function GET(_request, { params }) {
  const { slug } = await params;
  const { supabase, workspaceId } = await requireWorkspace();
  const { data: project, error } = await supabase
    .from("projects")
    .select("id,name,status,priority,description,agreed_value_cents,clients(name,email,phone)")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .single();
  if (error) return new Response("Projeto não encontrado", { status: 404 });

  const [tasks, decisions, meetings, finance, domains, deliverables, procedures] = await Promise.all([
    supabase.from("tasks").select("title,status,priority,due_at").eq("project_id", project.id).is("archived_at", null),
    supabase.from("decisions").select("title,content,status,decided_at").eq("project_id", project.id).is("archived_at", null),
    supabase.from("meetings").select("title,scheduled_at,summary").eq("project_id", project.id).is("archived_at", null),
    supabase.from("financial_entries").select("description,entry_type,status,amount_cents").eq("project_id", project.id).is("archived_at", null),
    supabase.from("domains").select("domain,status,expires_at").eq("project_id", project.id),
    supabase.from("deliverables").select("name,status,due_at,version").eq("project_id", project.id).is("archived_at", null),
    supabase.from("procedures").select("title,category,version").eq("project_id", project.id).is("archived_at", null),
  ]);
  const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  const rows = finance.data || [];
  const received = rows.filter((x) => x.entry_type === "income" && x.status === "paid").reduce((sum, x) => sum + x.amount_cents, 0);
  const expenses = rows.filter((x) => x.entry_type === "expense" && x.status === "paid").reduce((sum, x) => sum + x.amount_cents, 0);
  project.progress = calculateProjectProgress(tasks.data || [], project.status);
  const section = (title, items, render) => `\n## ${title}\n${items.length ? items.map(render).join("\n") : "- Nenhum registro"}\n`;
  const report = `# Relatório do projeto: ${project.name}\n\nGerado em ${new Date().toLocaleString("pt-BR")}\n\n## Resumo\n- Cliente: ${project.clients?.name || "—"}\n- Status: ${project.status}\n- Prioridade: ${project.priority}\n- Progresso: ${project.progress}%\n- Valor combinado: ${money(project.agreed_value_cents)}\n- Recebido: ${money(received)}\n- Pendente: ${money(Math.max(project.agreed_value_cents - received, 0))}\n- Despesas pagas: ${money(expenses)}\n${section("Tarefas", tasks.data || [], (x) => `- [${x.status === "completed" ? "x" : " "}] ${x.title} · ${x.status} · ${x.priority}`)}${section("Decisões", decisions.data || [], (x) => `- ${x.title}: ${x.content} (${x.status})`)}${section("Reuniões", meetings.data || [], (x) => `- ${x.title} · ${new Date(x.scheduled_at).toLocaleString("pt-BR")} · ${x.summary || "Sem resumo"}`)}${section("Financeiro", rows, (x) => `- ${x.description} · ${x.entry_type} · ${x.status} · ${money(x.amount_cents)}`)}${section("Domínios", domains.data || [], (x) => `- ${x.domain} · ${x.status} · vencimento ${x.expires_at || "não informado"}`)}${section("Entregáveis", deliverables.data || [], (x) => `- ${x.name} · ${x.status} · v${x.version}`)}${section("Procedimentos", procedures.data || [], (x) => `- ${x.title} · ${x.category || "sem categoria"} · v${x.version}`)}`;
  return new Response(report, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="relatorio-${slug}.txt"`,
      "Cache-Control": "private, no-store",
    },
  });
}
