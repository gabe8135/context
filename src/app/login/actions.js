"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function loginMessage(error) {
  if (error?.code === "email_not_confirmed") {
    return "Seu cadastro existe, mas o e-mail ainda não foi confirmado. Abra a mensagem enviada pelo Supabase.";
  }
  if (error?.code === "invalid_credentials") {
    return "E-mail ou senha incorretos. Se acabou de criar a conta, confirme seu e-mail antes de entrar.";
  }
  return error?.message || "Não foi possível entrar. Tente novamente.";
}

export async function login(formData) {
  if (!isSupabaseConfigured()) redirect("/app/projetos/companhia-da-limpeza");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")).trim().toLowerCase(),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/login?erro=${encodeURIComponent(loginMessage(error))}`);
  redirect("/app");
}

export async function signup(formData) {
  if (!isSupabaseConfigured()) redirect("/app/projetos/companhia-da-limpeza");
  const headerStore = await headers();
  const origin = headerStore.get("origin") || "http://localhost:3000";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")).trim().toLowerCase(),
    password: String(formData.get("password")),
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  if (data.session) redirect("/app");
  redirect(`/login?mensagem=${encodeURIComponent("Conta criada. Abra o e-mail de confirmação antes de entrar.")}`);
}

export async function resendConfirmation(formData) {
  if (!isSupabaseConfigured()) redirect("/login");
  const email = String(formData.get("email")).trim().toLowerCase();
  if (!email) redirect(`/login?erro=${encodeURIComponent("Digite seu e-mail para reenviar a confirmação.")}`);
  const headerStore = await headers();
  const origin = headerStore.get("origin") || "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  redirect(`/login?mensagem=${encodeURIComponent("Novo e-mail enviado. Use somente o link mais recente.")}`);
}
