"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/auth-context";
import { SMART_TEMPLATES } from "@/lib/smart-project-templates";

const text = (fd, key) => String(fd.get(key) || "").trim();

export async function createTemplateAction(fd) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const { data, error } = await supabase.from("project_templates").insert({ workspace_id: workspaceId, name: text(fd, "name"), description: text(fd, "description") || null, default_priority: text(fd, "default_priority") || "medium", default_duration_days: Number(fd.get("default_duration_days")) || null, created_by: user.id }).select("id").single();
  if (error) throw error;
  const lines = text(fd, "tasks").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  if (lines.length) {
    const { error: itemError } = await supabase.from("project_template_items").insert(lines.map((title, position) => ({ workspace_id: workspaceId, template_id: data.id, item_type: "task", title, position })));
    if (itemError) throw itemError;
  }
  revalidatePath("/app/modelos");
  redirect("/app/modelos?sucesso=Modelo criado");
}

export async function applyTemplateAction(id, fd) {
  const { supabase, user, workspaceId } = await requireWorkspace();
  const clientId = text(fd, "client_id");
  const name = text(fd, "project_name");
  const { data: template, error } = await supabase.from("project_templates").select("*,project_template_items(*)").eq("id", id).eq("workspace_id", workspaceId).single();
  if (error) throw error;
  await createProjectFromDefinition({ supabase, user, workspaceId, clientId, name, definition: { description: template.description, duration: template.default_duration_days, priority: template.default_priority, tasks: template.project_template_items.filter((item) => item.item_type === "task").sort((a, b) => a.position - b.position).map((item) => item.title) }, origin: "template" });
}

export async function applySmartTemplateAction(key, fd) {
  const definition = SMART_TEMPLATES[key];
  if (!definition) throw new Error("Modelo inteligente inválido.");
  const { supabase, user, workspaceId } = await requireWorkspace();
  await createProjectFromDefinition({ supabase, user, workspaceId, clientId: text(fd, "client_id"), name: text(fd, "project_name"), definition, origin: "smart_template" });
}

async function createProjectFromDefinition({ supabase, user, workspaceId, clientId, name, definition, origin }) {
  if (!clientId || !name) throw new Error("Informe cliente e nome do projeto.");
  const slug = `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString().slice(-5)}`;
  const due = new Date(); if (definition.duration) due.setDate(due.getDate() + Number(definition.duration));
  const { data: project, error } = await supabase.from("projects").insert({ workspace_id: workspaceId, client_id: clientId, name, slug, description: definition.description, status: "active", priority: definition.priority || "medium", due_at: definition.duration ? due.toISOString().slice(0, 10) : null, created_by: user.id }).select("id").single();
  if (error) throw error;
  const ids = definition.tasks.map(() => crypto.randomUUID());
  if (ids.length) {
    const { error: taskError } = await supabase.from("tasks").insert(definition.tasks.map((title, index) => ({ id: ids[index], workspace_id: workspaceId, project_id: project.id, client_id: clientId, title, status: "todo", priority: index < 2 ? "high" : "medium", queue_position: (index + 1) * 1000, depends_on_task_id: origin === "smart_template" && index ? ids[index - 1] : null, created_by: user.id, origin })));
    if (taskError) throw taskError;
  }
  await supabase.from("activities").insert({ workspace_id: workspaceId, project_id: project.id, client_id: clientId, type: `${origin}_applied`, description: `Projeto criado com ${definition.tasks.length} etapas estruturadas`, actor_id: user.id, actor_name: user.email });
  redirect(`/app/projetos/${slug}?sucesso=Projeto criado com etapas prontas`);
}
