import { describe, expect, it } from "@jest/globals"
import {
  isPostBodyHtml,
  postBodyPlainText,
  postBodyPreview,
  sanitizePostBody,
} from "../postBody.js"

describe("postBody", () => {
  it("detects html bodies", () => {
    expect(isPostBodyHtml("<p>Hi</p>")).toBe(true)
    expect(isPostBodyHtml("Plain text")).toBe(false)
  })

  it("sanitizes html and strips scripts", () => {
    const result = sanitizePostBody('<p>Hello</p><script>alert(1)</script><a href="https://x.com">Link</a>')
    expect(result).toContain("<p>Hello</p>")
    expect(result).not.toContain("script")
    expect(result).toContain('href="https://x.com"')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it("keeps legacy plain text unchanged", () => {
    expect(sanitizePostBody("Still **markdown** plain")).toBe("Still **markdown** plain")
  })

  it("extracts plain text length for limits", () => {
    expect(postBodyPlainText("<p>Hello <strong>world</strong></p>")).toBe("Hello world")
  })

  it("builds previews from html", () => {
    expect(postBodyPreview("<p>Short</p>")).toBe("Short")
    expect(postBodyPreview("x".repeat(200), 50).endsWith("…")).toBe(true)
  })
})
