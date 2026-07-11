"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";
import { encryptCredential } from "@/lib/credential-crypto";

const basePath = "/app/operacao/credenciais";

export async function createCredentialAction(formData) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const serviceName = String(formData.get("service_name") || "").trim();
  const secret = String(formData.get("secret") || "");
  const projectId = String(formData.get("project_id") || "") || null;
  if (serviceName.length < 2 || !secret) redirect(`${basePath}/novo?erro=Informe o serviço e a senha ou token`);
  let clientId = null;
  if (projectId) {
    const { data, error } = await supabase.from("projects").select("client_id").eq("id", projectId).eq("workspace_id", workspaceId).single();
    if (error) redirect(`${basePath}/novo?erro=Projeto inválido`);
    clientId = data.client_id;
  }
  let secretCiphertext;
  try { secretCiphertext = encryptCredential(secret); }
  catch { redirect(`${basePath}/novo?erro=Configure a chave de criptografia do cofre`); }
  const { error } = await supabase.from("credentials").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    client_id: clientId,
    service_name: serviceName,
    login_identifier: String(formData.get("login_identifier") || "").trim(),
    access_url: String(formData.get("access_url") || "").trim() || null,
    secret_ciphertext: secretCiphertext,
    recovery_instructions: String(formData.get("recovery_instructions") || "").trim(),
    status: "unverified",
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath(basePath);
  redirect(`${basePath}?sucesso=Credencial protegida no cofre`);
}

export async function validateCredentialAction(id) {
  const { supabase, workspaceId } = await requireWorkspace();
  const { error } = await supabase.from("credentials").update({ status: "operational", last_validated_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  revalidatePath(basePath);
  revalidatePath(`${basePath}/${id}`);
}

export async function archiveCredentialAction(id) {
  const { supabase, workspaceId } = await requireWorkspace();
  const { error } = await supabase.from("credentials").update({ archived_at: new Date().toISOString() }).eq("id", id).eq("workspace_id", workspaceId);
  if (error) throw error;
  revalidatePath(basePath);
  redirect(`${basePath}?sucesso=Credencial arquivada`);
}
