const money = /R\$?\s*([\d.]+(?:,\d{1,2})?)|([\d.]+(?:,\d{1,2})?)\s*R\$/i;
const domain = /\b(?:[a-z0-9-]+\.)+(?:com\.br|com|net|org|br)\b/i;
const headings = {
  "JA PAGO": "paid", PAGO: "paid", FEITOS: "done", FEITO: "done",
  FAZER: "todo", "A FAZER": "todo", PENDENTES: "todo",
  "PASSO A PASSO DO QUE FOI FEITO": "procedure", "PASSO A PASSO": "procedure",
};
const groupedHeadings = {
  "TAREFAS CONCLUIDAS": "completed_bundle",
  "TRABALHO CONCLUIDO": "completed_bundle",
  "ALTERACOES REALIZADAS": "completed_bundle",
  DECISOES: "decisions_bundle",
  "NOTAS TECNICAS": "technical_bundle",
  "INFORMACOES TECNICAS": "technical_bundle",
};

export function parseUnstructuredText(text) {
  const lines = String(text).split(/\r?\n/);
  if (lines.some((line) => groupedHeadings[normalizeHeading(line)])) return parseGroupedText(lines);
  return parseLineByLine(lines);
}

function parseGroupedText(lines) {
  let section = "general";
  const groups = { completed_bundle: [], decisions_bundle: [], technical_bundle: [] };
  const residual = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const heading = normalizeHeading(line);
    if (groupedHeadings[heading]) { section = groupedHeadings[heading]; continue; }
    if (headings[heading]) { section = "general"; residual.push(raw); continue; }
    if (isStructuralHeading(line)) { section = "general"; continue; }
    const content = cleanContent(line);
    if (!content || isTableSeparator(line)) continue;
    if (groups[section]) groups[section].push(content);
    else residual.push(raw);
  }

  let id = 0;
  const items = [];
  if (groups.completed_bundle.length) items.push(make(id++, groups.completed_bundle.join("\n- "), "task", "completed", { title: "Implementar melhorias desta etapa" }));
  for (const decision of groupDecisions(groups.decisions_bundle)) items.push(make(id++, decision.content, "decision", "active", { title: decision.title }));
  if (groups.technical_bundle.length) items.push(make(id++, groups.technical_bundle.join("\n- "), "note", "active", { title: "Notas técnicas da etapa" }));
  return [...items, ...parseLineByLine(residual, id)].slice(0, 40);
}

function groupDecisions(lines) {
  const buckets = [
    { title: "Preservar a integridade do histórico financeiro", test: /(financeir|pagamento|lan[çc]amento|cont[áa]bil)/i, lines: [] },
    { title: "Definir a política de exclusão e arquivamento", test: /(exclu|arquiv|restaur|confirma|recuper)/i, lines: [] },
    { title: "Garantir isolamento e rastreabilidade", test: /(workspace|hist[óo]ric|atividade|auditoria|autentic)/i, lines: [] },
    { title: "Outras decisões da etapa", test: /.*/, lines: [] },
  ];
  for (const line of lines) (buckets.find((bucket) => bucket.test.test(line)) || buckets.at(-1)).lines.push(line);
  return buckets.filter((bucket) => bucket.lines.length).map((bucket) => ({ title: bucket.title, content: bucket.lines.join("\n- ") }));
}

function parseLineByLine(lines, initialId = 0) {
  let section = "general", id = initialId;
  const items = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const heading = normalizeHeading(line);
    if (headings[heading]) { section = headings[heading]; continue; }
    if (isStructuralHeading(line)) { if (heading !== "SITE") section = "general"; continue; }
    if (isTableSeparator(line) || /^\|?\s*(ajuste|item|descri[cç][aã]o)\b.*\|/i.test(line)) continue;
    const checked = /^[-*]?\s*\[[xX]\]\s*/.test(line), unchecked = /^[-*]?\s*\[\s]\s*/.test(line);
    const content = cleanContent(line);
    if (!content) continue;
    if (line.includes("|") && /^total$/i.test(content.split("|")[0].replaceAll("*", "").trim())) continue;
    const tableCells = content.split("|").map((value) => value.replaceAll("*", "").trim()).filter(Boolean);
    if (tableCells.length >= 2 && parseMoneyCents(tableCells[1]) > 0) { items.push(make(id++, tableCells[0], "income", section === "paid" ? "paid" : "pending", { amount_cents: parseMoneyCents(tableCells[1]) })); continue; }
    const amount = parseMoneyCents(content);
    if (section === "procedure") { items.push(make(id++, stripMoney(content), "procedure", "active")); if (amount > 0) items.push(make(id++, stripMoney(content), "income", "paid", { amount_cents: amount })); continue; }
    if (section === "paid") { items.push(make(id++, stripMoney(content), amount ? "income" : "task", amount ? "paid" : "completed", amount ? { amount_cents: amount } : {})); continue; }
    if (section === "done") { items.push(make(id++, content, "task", "completed")); continue; }
    if (section === "todo" || checked || unchecked) { items.push(make(id++, content, "task", checked ? "completed" : "todo")); continue; }
    const type = classify(content);
    items.push(make(id++, stripMoney(content), type, type === "income" || type === "expense" ? "pending" : type === "task" ? "todo" : "active", amount ? { amount_cents: amount } : {}));
  }
  return items.slice(0, 150);
}

function make(id, content, type, status, extra = {}) { return { id: `detected-${id}`, content, type, status, selected: true, ...extra }; }
function cleanContent(line) { return line.replace(/^[-*]\s*/, "").replace(/^\[[xX ]\]\s*/, "").replace(/^\|\s*|\s*\|$/g, "").trim(); }
function normalizeHeading(line) { return line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[*#:_!]/g, "").trim().toUpperCase(); }
function isStructuralHeading(line) { const cleaned = line.replace(/[*#:_!]/g, "").trim(); return cleaned.length >= 3 && cleaned === cleaned.toUpperCase() && /[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(cleaned) && !line.startsWith("-") && !line.startsWith("|"); }
function isTableSeparator(line) { return /^\|?[\s:|-]+\|?$/.test(line); }
function stripMoney(value) { return value.replace(/\(?\s*\d[\d.,]*\s*R\$\s*\)?/gi, "").replace(/\(?\s*R\$\s*\d[\d.,]*\s*\)?/gi, "").trim(); }
function classify(line) { const s = line.toLowerCase(); if (/(decidido|decis[aã]o|aprovou|definido|ficou acordado)/.test(s)) return "decision"; if (/(passo a passo|procedimento|como fazer|instru[cç][aã]o)/.test(s)) return "procedure"; if (money.test(s)) return /(paguei|despesa|compra|custo|gastei)/.test(s) ? "expense" : "income"; if (domain.test(s) && !/(migrar|migra[cç][aã]o|apontar|configurar)/.test(s)) return "domain"; if (/(fazer|ajustar|criar|configurar|validar|corrigir|pendente|resolver|alterar|questionar|migrar|migra[cç][aã]o)/.test(s)) return "task"; return "note"; }
export function parseMoneyCents(value) { const found = String(value).match(money); const raw = found?.[1] || found?.[2]; if (!raw) return 0; return Math.round(Number(raw.replaceAll(".", "").replace(",", ".")) * 100); }
export function extractDomain(value) { return String(value).match(domain)?.[0]?.toLowerCase() || ""; }
