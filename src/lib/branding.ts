const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

export function normalizePrimaryColor(value?: string | null): string {
  const trimmed = value?.trim()
  if (trimmed && HEX_COLOR.test(trimmed)) return trimmed.toUpperCase()
  return "#F5A623"
}

export function brandingStyle(primaryColor: string): string {
  const color = normalizePrimaryColor(primaryColor)
  return `--creator-primary:${color};--brand-beer:${color};`
}
