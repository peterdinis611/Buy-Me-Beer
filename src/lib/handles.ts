export const RESERVED_HANDLES = new Set([
  "login",
  "signup",
  "logout",
  "dashboard",
  "support",
  "explore",
  "api",
  "css",
  "js",
  "public",
  "admin",
  "settings",
  "health",
  "forgot-password",
  "reset-password",
  "verify-email",
])

const HANDLE_REGEX = /^[a-zA-Z0-9_-]+$/

export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 30)
}

export function isValidHandleFormat(handle: string): boolean {
  return handle.length >= 3 && handle.length <= 30 && HANDLE_REGEX.test(handle)
}

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle.toLowerCase())
}

export function isHandleAvailable(
  handle: string,
  options?: { taken?: boolean; excludeReserved?: boolean }
): boolean {
  const normalized = normalizeHandle(handle)
  if (!isValidHandleFormat(normalized)) return false
  if (options?.excludeReserved !== false && isReservedHandle(normalized)) return false
  if (options?.taken) return false
  return true
}
