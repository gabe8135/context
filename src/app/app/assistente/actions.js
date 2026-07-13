"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth-context";

const proposalSchema = z.object({ type: z.enum(["task", "note", "decision"]), title: z.string().trim().min(2).max(180), content: z.string().trim().min(2).max(5000), project_id: z.string().uuid(), status: z.string(), priority: z.enum(["low", "medium", "high", "urgent"]) });
export async function confirmAssistantProposalAction(returnQuery, formData) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  let proposal; try { proposal = proposalSchema.parse(JSON.parse(String(formData.get("proposal") || "{}"))); } catch { redirect(`/app/assistente${returnQuery}?erro=Proposta inválida`); }
  const { data: project, error } = await supabase.from("projects").select("id,client_id,slug").eq("id", proposal.project_id).eq("workspace_id", workspaceId).is("archived_at", null).single();
  if (error) redirect(`/app/assistente${returnQuery}?erro=Projeto inválido`);
  const common = { workspace_id: workspaceId, project_id: project.id, client_id: project.client_id, created_by: user.id };
  let result;
  if (proposal.type === "task") result = await supabase.from("tasks").insert({ ...common, title: proposal.title, description: proposal.content, status: proposal.status === "completed" ? "completed" : "todo", priority: proposal.priority, completed_at: proposal.status === "completed" ? new Date().toISOString() : null });
  else if (proposal.type === "decision") result = await supabase.from("decisions").insert({ ...common, title: proposal.title, content: proposal.content, status: "current", responsible_name: user.email });
  else result = await supabase.from("notes").insert({ ...common, title: proposal.title.slice(0, 100), content: proposal.content, status: "active" });
  if (result.error) throw result.error;
  await supabase.from("activities").insert({ ...common, type: "assistant_proposal_confirmed", description: `Proposta da IA confirmada: ${proposal.title}`, actor_id: user.id, actor_name: user.email });
  revalidatePath(`/app/projetos/${project.slug}`); revalidatePath("/app");
  redirect(`/app/assistente${returnQuery}${returnQuery ? "&" : "?"}sucesso=Proposta confirmada`);
}
