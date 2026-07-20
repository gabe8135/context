import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth-context";
import { generateStructured, organizerSchema, redactSensitiveText } from "@/lib/groq-ai";
import { parseUnstructuredText } from "@/lib/import-parser";

export const runtime = "nodejs";
const inputSchema = z.object({ text: z.string().trim().min(3).max(30000), project_id: z.string().uuid().nullable().optional() });

export async function POST(request) {
  let rawText = "";
  let requestedProjectId = null;
  try {
    const body = await request.json(); rawText = String(body?.text || "");
    const values = inputSchema.parse(body); requestedProjectId = values.project_id || null;
    const { supabase, workspaceId } = await requireWorkspace();
    let context = "Agenda pessoal da área geral. Gere somente tarefas e notas pessoais; não associe a projetos por conta própria.";
    if (values.project_id) {
      const { data, error } = await supabase.from("projects").select("id,name,description,clients(name)").eq("id", values.project_id).eq("workspace_id", workspaceId).is("archived_at", null).single();
      if (error) return NextResponse.json({ error: "Projeto inválido para este workspace." }, { status: 403 });
      context = `Projeto em foco: ${data.name}. Cliente: ${data.clients?.name || "não informado"}. Descrição: ${data.description || "não informada"}.`;
    }
    const result = await generateStructured({
      name: "squire_organized_items", schema: organizerSchema,
      instructions: `Você é o organizador operacional do Squire. Interprete anotações em português e devolva poucos registros úteis, completos e não redundantes. Agrupe alterações relacionadas ao mesmo objetivo; divida apenas quando houver entidades, estados ou responsabilidades realmente diferentes. Preserve datas, valores, nomes e fatos. Uma etapa de trabalho com vários bullets normalmente vira uma tarefa consolidada e uma nota técnica. Decisões distintas podem ser agrupadas por política. Não invente informações. Valores monetários devem ser em centavos. Use confidence entre 0 e 1. Contexto atual: ${context}`,
      input: redactSensitiveText(values.text),
    });
    const permitted = values.project_id ? result.items || [] : (result.items || []).filter((item) => ["task", "note"].includes(item.type));
    const items = permitted.map((item, index) => ({ ...item, id: `ai-${index}`, selected: true }));
    return NextResponse.json({ items, summary: result.summary, mode: "ai" });
  } catch (error) {
    if (rawText.trim().length >= 3) { const parsed = parseUnstructuredText(rawText); return NextResponse.json({ items: requestedProjectId ? parsed : parsed.filter((item) => ["task", "note"].includes(item.type)), summary: "A IA ficou indisponível; aplicamos o organizador local seguro.", mode: "fallback", warning: "A análise usou o modo local. Você pode revisar e importar normalmente." }); }
    return NextResponse.json({ error: error?.issues?.[0]?.message || "Não foi possível analisar o texto." }, { status: 400 });
  }
}
