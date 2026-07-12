import {
  isHandleAvailable,
  isReservedHandle,
  isValidHandleFormat,
  normalizeHandle,
  RESERVED_HANDLES,
} from "../handles.js"

describe("normalizeHandle", () => {
  it("lowercases and strips invalid characters", () => {
    expect(normalizeHandle("  Peter-Dinis!  ")).toBe("peter-dinis")
  })

  it("truncates to 30 characters", () => {
    expect(normalizeHandle("a".repeat(40))).toHaveLength(30)
  })

  it("preserves underscores and hyphens", () => {
    expect(normalizeHandle("my_cool-name")).toBe("my_cool-name")
  })
})

describe("isValidHandleFormat", () => {
  it("accepts valid handles", () => {
    expect(isValidHandleFormat("demo")).toBe(true)
    expect(isValidHandleFormat("user_123")).toBe(true)
  })

  it("rejects too short handles", () => {
    expect(isValidHandleFormat("ab")).toBe(false)
  })

  it("rejects invalid characters", () => {
    expect(isValidHandleFormat("user.name")).toBe(false)
  })
})

describe("isReservedHandle", () => {
  it("blocks system routes", () => {
    expect(isReservedHandle("login")).toBe(true)
    expect(isReservedHandle("DASHBOARD")).toBe(true)
  })

  it("allows creator handles", () => {
    expect(isReservedHandle("demo")).toBe(false)
  })
})

describe("isHandleAvailable", () => {
  it("returns false for reserved handles", () => {
    expect(isHandleAvailable("login")).toBe(false)
  })

  it("returns false when taken", () => {
    expect(isHandleAvailable("demo", { taken: true })).toBe(false)
  })

  it("returns true for valid available handles", () => {
    expect(isHandleAvailable("myname")).toBe(true)
  })
})

describe("RESERVED_HANDLES", () => {
  it("includes auth-related paths", () => {
    expect(RESERVED_HANDLES.has("forgot-password")).toBe(true)
    expect(RESERVED_HANDLES.has("verify-email")).toBe(true)
  })
})
