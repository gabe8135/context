import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FinancialForm } from "@/components/financial-form";
import { requireWorkspace } from "@/lib/auth-context";
import { updateFinancialEntryAction } from "../../actions";

export default async function EditFinancialEntry({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, workspaceId } = await requireWorkspace();
  const [entryResult, projectsResult] = await Promise.all([
    supabase.from("financial_entries").select("id,project_id,description,entry_type,status,amount_cents,paid_amount_cents,category,installment_number,installment_total,occurred_at,due_at,payment_method,notes,projects(slug)").eq("id", id).eq("workspace_id", workspaceId).is("archived_at", null).single(),
    supabase.from("projects").select("id,name,slug,clients(name)").eq("workspace_id", workspaceId).is("archived_at", null).order("name"),
  ]);
  if (entryResult.error?.code === "PGRST116") notFound();
  if (entryResult.error || projectsResult.error) throw entryResult.error || projectsResult.error;
  return <AppShell><div className="content narrow"><Link className="back-link" href="/app/financeiro">← Financeiro</Link><div className="eyebrow">Correção de movimentação</div><h1 className="page-title">Editar lançamento</h1><p className="subtitle">As alterações recalculam automaticamente os totais do Financeiro e do projeto.</p><FinancialForm action={updateFinancialEntryAction.bind(null, id)} projects={projectsResult.data} selectedSlug={entryResult.data.projects?.slug} entry={entryResult.data} error={query.erro}/></div></AppShell>;
}
