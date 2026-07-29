import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspace } from "@/lib/auth-context";
import { generateStructured, redactSensitiveText } from "@/lib/groq-ai";
import { sanitizeRichDocument } from "@/lib/rich-document";

export const runtime = "nodejs";

const bodySchema = z.object({
  project_slug: z.string().trim().min(1).max(160),
  instruction: z.string().trim().min(3).max(3000),
  mode: z.enum(["generate", "improve"]),
  current_document: z.string().max(12000).default(""),
});

const documentSchema = {
  type: "object",
  additionalProperties: false,
  properties: { content: { type: "string" } },
  required: ["content"],
};

export async function POST(request) {
  try {
    const values = bodySchema.parse(await request.json());
    const { supabase, workspaceId } = await requireWorkspace();
    const { data: project, error } = await supabase
      .from("projects")
      .select("id,name,status,priority,due_at,clients(name)")
      .eq("workspace_id", workspaceId)
      .eq("slug", values.project_slug)
      .is("archived_at", null)
      .single();
    if (error || !project) return NextResponse.json({ error: "Projeto não encontrado." }, { status: 404 });

    const [tasks, notes, decisions] = await Promise.all([
      supabase.from("tasks").select("title,status,priority,due_at").eq("workspace_id", workspaceId).eq("project_id", project.id).is("archived_at", null).limit(30),
      supabase.from("notes").select("title,content").eq("workspace_id", workspaceId).eq("project_id", project.id).is("archived_at", null).order("updated_at", { ascending: false }).limit(8),
      supabase.from("decisions").select("title,content,status").eq("workspace_id", workspaceId).eq("project_id", project.id).is("archived_at", null).order("decided_at", { ascending: false }).limit(8),
    ]);
    const failed = [tasks, notes, decisions].find((item) => item.error);
    if (failed) throw failed.error;

    const context = {
      project,
      tasks: tasks.data,
      notes: notes.data.map((item) => ({ title: item.title, content: redactSensitiveText(item.content).slice(0, 700) })),
      decisions: decisions.data.map((item) => ({ ...item, content: redactSensitiveText(item.content).slice(0, 700) })),
    };
    const result = await generateStructured({
      name: "squire_project_document",
      schema: documentSchema,
      maxCompletionTokens: 900,
      instructions: `Você é o assistente editorial do Squire. Escreva em português do Brasil, de forma profissional, clara e útil. Trabalhe exclusivamente com o projeto fornecido e não invente fatos. Quando faltarem dados, marque claramente como "A definir".

Retorne HTML semântico seguro usando somente: p, h1, h2, h3, strong, em, u, s, ul, ol, li, blockquote e br. Não use html, body, script, style, classes, imagens ou atributos. Estruture o texto como uma página de documentação moderna, com títulos, parágrafos curtos e listas quando ajudarem.

No modo generate, produza uma nova seção ou documento conforme solicitado. No modo improve, reescreva e organize o documento atual preservando todos os fatos importantes.`,
      input: `MODO: ${values.mode}\n\nPROJETO E CONTEXTO:\n${JSON.stringify(context).slice(0, 4000)}\n\nDOCUMENTO ATUAL:\n${redactSensitiveText(values.current_document).slice(0, 6000)}\n\nPEDIDO DO USUÁRIO:\n${values.instruction}`,
    });
    return NextResponse.json({ content: sanitizeRichDocument(result.content) });
  } catch (error) {
    return NextResponse.json({ error: error?.issues?.[0]?.message || error.message || "Não foi possível gerar o texto." }, { status: 400 });
  }
}
