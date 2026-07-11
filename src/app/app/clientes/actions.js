"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";
import { clientPayload } from "@/lib/validations/client";

function fail(path,error){const message=error?.issues?.[0]?.message||error?.message||"Não foi possível salvar o cliente.";redirect(`${path}?erro=${encodeURIComponent(message)}`)}

export async function createClientAction(formData){
  const {supabase,user,workspaceId}=await requireWorkspace();let values;
  try{values=clientPayload(formData)}catch(error){fail("/app/clientes/novo",error)}
  const{data,error}=await supabase.from("clients").insert({...values,workspace_id:workspaceId,created_by:user.id}).select("id").single();
  if(error)fail("/app/clientes/novo",error);revalidatePath("/app/clientes");redirect(`/app/clientes/${data.id}?sucesso=Cliente criado`);
}

export async function updateClientAction(id,formData){
  const{supabase,workspaceId}=await requireWorkspace();let values;
  try{values=clientPayload(formData)}catch(error){fail(`/app/clientes/${id}/editar`,error)}
  const{error}=await supabase.from("clients").update(values).eq("id",id).eq("workspace_id",workspaceId);
  if(error)fail(`/app/clientes/${id}/editar`,error);revalidatePath("/app/clientes");revalidatePath(`/app/clientes/${id}`);redirect(`/app/clientes/${id}?sucesso=Alterações salvas`);
}

export async function archiveClientAction(id){const{supabase,workspaceId}=await requireWorkspace();const{error}=await supabase.from("clients").update({archived_at:new Date().toISOString(),status:"inactive"}).eq("id",id).eq("workspace_id",workspaceId);if(error)throw error;revalidatePath("/app/clientes");redirect("/app/clientes?sucesso=Cliente arquivado");}
