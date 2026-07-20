"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updatePassword(formData) {
  const password = String(formData.get("password") || "");
  if (password.length < 8) redirect("/atualizar-senha?erro=A senha precisa ter pelo menos 8 caracteres");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/atualizar-senha?erro=${encodeURIComponent(error.message)}`);
  redirect("/app");
}
