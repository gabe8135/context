const allowedTags = new Set([
  "p", "div", "br", "h1", "h2", "h3", "h4", "strong", "b", "em", "i",
  "u", "s", "strike", "ul", "ol", "li", "blockquote", "a", "span", "font", "hr", "input",
]);

const safeColor = /^(#[0-9a-f]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|[a-z]{3,20})$/i;

export function sanitizeRichDocument(input) {
  const source = String(input || "").slice(0, 120000);
  if (!source.includes("<")) return escapeHtml(source).replace(/\n/g, "<br>");

  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math|form)[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (match, rawTag, rawAttributes) => {
      const tag = rawTag.toLowerCase();
      if (!allowedTags.has(tag)) return "";
      if (match.startsWith("</")) return tag === "font" ? "</span>" : `</${tag}>`;
      if (tag === "br" || tag === "hr") return `<${tag}>`;
      if (tag === "input") {
        const checkbox = /\btype\s*=\s*["']checkbox["']/i.test(rawAttributes);
        if (!checkbox) return "";
        const checked = /\bchecked(?:\s*=\s*["'][^"']*["'])?/i.test(rawAttributes);
        return `<input type="checkbox"${checked ? " checked" : ""}>`;
      }

      if (tag === "a") {
        const href = rawAttributes.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] || "";
        const safeHref = /^(https?:|mailto:|\/|#)/i.test(href) ? escapeAttribute(href) : "";
        if (!safeHref) return "<a>";
        const pageId = rawAttributes.match(/\bdata-project-page-id\s*=\s*["']([0-9a-f-]+)["']/i)?.[1] || "";
        const pageAttribute = pageId ? ` data-project-page-id="${escapeAttribute(pageId)}"` : "";
        const external = /^(https?:|mailto:)/i.test(safeHref);
        return external
          ? `<a href="${safeHref}"${pageAttribute} target="_blank" rel="noopener noreferrer">`
          : `<a href="${safeHref}"${pageAttribute}>`;
      }

      if (tag === "font") {
        const color = rawAttributes.match(/\bcolor\s*=\s*["']([^"']+)["']/i)?.[1]?.trim() || "";
        return safeColor.test(color) ? `<span style="color:${escapeAttribute(color)}">` : "<span>";
      }

      if (tag === "span") {
        const color = rawAttributes.match(/\bcolor\s*:\s*([^;"']+)/i)?.[1]?.trim() || "";
        return safeColor.test(color) ? `<span style="color:${escapeAttribute(color)}">` : "<span>";
      }
      return `<${tag}>`;
    })
    .replace(/\s(on\w+|srcdoc)\s*=\s*["'][^"']*["']/gi, "");
}

export function richDocumentText(input) {
  return String(input || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-4]|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
