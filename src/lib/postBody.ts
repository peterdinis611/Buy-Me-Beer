import sanitizeHtml from "sanitize-html"

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "s",
    "del",
    "code",
    "pre",
    "h1",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
    "hr",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (_tag, attribs) => ({
      tagName: "a",
      attribs: {
        ...attribs,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    }),
  },
}

export function isPostBodyHtml(body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body.trim())
}

export function sanitizePostBody(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ""

  if (!isPostBodyHtml(trimmed)) {
    return trimmed
  }

  return sanitizeHtml(trimmed, SANITIZE_OPTIONS).trim()
}

export function postBodyPlainText(body: string): string {
  if (!body) return ""

  if (!isPostBodyHtml(body)) {
    return body.trim()
  }

  return sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
}

export function postBodyPreview(body: string, maxLength = 160): string {
  const plain = postBodyPlainText(body)
  if (plain.length <= maxLength) return plain
  return `${plain.slice(0, maxLength).trim()}…`
}
