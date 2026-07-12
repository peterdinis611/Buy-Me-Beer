import {
  buildProfileUrl,
  normalizeGithubUsername,
  normalizeTwitterHandle,
  normalizeWebsiteUrl,
} from "../social.js"

describe("normalizeTwitterHandle", () => {
  it("strips leading @ symbols", () => {
    expect(normalizeTwitterHandle("@peter")).toBe("peter")
    expect(normalizeTwitterHandle("@@peter")).toBe("peter")
  })

  it("returns empty for missing value", () => {
    expect(normalizeTwitterHandle()).toBe("")
    expect(normalizeTwitterHandle("  ")).toBe("")
  })
})

describe("normalizeGithubUsername", () => {
  it("strips @ prefix", () => {
    expect(normalizeGithubUsername("@octocat")).toBe("octocat")
  })
})

describe("normalizeWebsiteUrl", () => {
  it("adds https when missing", () => {
    expect(normalizeWebsiteUrl("example.com")).toBe("https://example.com")
  })

  it("preserves existing protocol", () => {
    expect(normalizeWebsiteUrl("http://example.com")).toBe("http://example.com")
  })

  it("returns empty for blank input", () => {
    expect(normalizeWebsiteUrl("")).toBe("")
  })
})

describe("buildProfileUrl", () => {
  it("builds lowercase profile URL", () => {
    expect(buildProfileUrl("http://localhost:3000", "Demo")).toBe(
      "http://localhost:3000/demo"
    )
  })

  it("strips trailing slash from base URL", () => {
    expect(buildProfileUrl("http://localhost:3000/", "demo")).toBe(
      "http://localhost:3000/demo"
    )
  })
})
