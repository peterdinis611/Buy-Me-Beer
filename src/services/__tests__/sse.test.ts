import { formatSseMessage, SseHub } from "../sse.js"

function createMockResponse() {
  const chunks: string[] = []
  return {
    write: (chunk: string) => {
      chunks.push(chunk)
      return true
    },
    chunks,
  }
}

describe("formatSseMessage", () => {
  it("formats event and JSON data", () => {
    const message = formatSseMessage("support_received", { amount: 500 })

    expect(message).toContain("event: support_received\n")
    expect(message).toContain('data: {"amount":500}\n\n')
  })
})

describe("SseHub", () => {
  let hub: SseHub
  let cleanups: Array<() => void>

  beforeEach(() => {
    hub = new SseHub()
    cleanups = []
  })

  afterEach(() => {
    for (const cleanup of cleanups) cleanup()
  })

  it("notifies subscribed clients", () => {
    const res = createMockResponse()

    cleanups.push(hub.subscribe("creator-1", res as never))
    hub.publish("creator-1", "support_received", { amount: 800 })

    expect(res.chunks.join("")).toContain("support_received")
    expect(hub.getSubscriberCount("creator-1")).toBe(1)
  })

  it("does not notify other creators", () => {
    const res = createMockResponse()

    cleanups.push(hub.subscribe("creator-1", res as never))
    hub.publish("creator-2", "support_received", { amount: 500 })

    expect(res.chunks).toHaveLength(0)
  })
})
