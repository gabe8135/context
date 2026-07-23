const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-20b";

export async function generateStructured({ name, instructions, input, schema, maxCompletionTokens }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY não configurada.");
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      ...(maxCompletionTokens ? { max_completion_tokens: maxCompletionTokens } : {}),
      messages: [{ role: "system", content: instructions }, { role: "user", content: input }],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema } },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Groq respondeu ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
  }
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("A IA não retornou conteúdo estruturado.");
  return JSON.parse(content);
}

export function redactSensitiveText(value) {
  return String(value || "")
    .replace(/\b(senha|password|token|api[_ -]?key|secret|chave)\s*[:=]\s*\S+/gi, "$1: [DADO SENSÍVEL OCULTADO]")
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [DADO SENSÍVEL OCULTADO]")
    .replace(/\b(?:sk|gsk)_[A-Za-z0-9_-]{16,}\b/g, "[DADO SENSÍVEL OCULTADO]");
}

export const organizerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    items: {
      type: "array", maxItems: 30,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["task", "note", "decision", "procedure", "income", "expense", "domain"] },
          title: { type: "string" }, content: { type: "string" },
          status: { type: "string", enum: ["todo", "completed", "active", "historical", "pending", "paid"] },
          amount_cents: { type: ["integer", "null"] }, confidence: { type: "number" }, rationale: { type: "string" },
        },
        required: ["type", "title", "content", "status", "amount_cents", "confidence", "rationale"],
      },
    },
  },
  required: ["summary", "items"],
};

export const assistantSchema = {
  type: "object", additionalProperties: false,
  properties: {
    reply: { type: "string" },
    proposal_action: { type: "string", enum: ["keep", "append", "replace"] },
    proposals: {
      type: "array", maxItems: 8,
      items: {
        type: "object", additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["task", "note", "decision"] }, title: { type: "string" }, content: { type: "string" },
          project_id: { type: ["string", "null"] }, status: { type: "string", enum: ["todo", "completed", "active", "current"] },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] }, due_at: { type: ["string", "null"] }, rationale: { type: "string" },
        },
        required: ["type", "title", "content", "project_id", "status", "priority", "due_at", "rationale"],
      },
    },
  },
  required: ["reply", "proposal_action", "proposals"],
};
