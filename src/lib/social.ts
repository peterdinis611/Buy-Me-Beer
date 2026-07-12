export function normalizeTwitterHandle(handle?: string | null): string {
  if (!handle) return ""
  return handle.trim().replace(/^@+/, "")
}

export function normalizeGithubUsername(username?: string | null): string {
  if (!username) return ""
  return username.trim().replace(/^@+/, "")
}

export function normalizeWebsiteUrl(url?: string | null): string {
  if (!url) return ""
  const trimmed = url.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export function buildProfileUrl(baseUrl: string, handle: string): string {
  const base = baseUrl.replace(/\/$/, "")
  return `${base}/${handle.toLowerCase()}`
}
