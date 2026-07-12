import type { Response } from "express"
import { randomUUID } from "node:crypto"

export type SupportReceivedPayload = {
  id: string
  supporterName: string
  amount: number
  product: string
  message: string
  formattedAmount: string
}

type SseClient = {
  id: string
  res: Response
  heartbeat: ReturnType<typeof setInterval>
}

const HEARTBEAT_MS = 30_000

export function formatSseMessage(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export class SseHub {
  private clients = new Map<string, Set<SseClient>>()

  subscribe(creatorId: string, res: Response): () => void {
    const client: SseClient = {
      id: randomUUID(),
      res,
      heartbeat: setInterval(() => {
        this.safeWrite(client, "ping", { t: Date.now() })
      }, HEARTBEAT_MS),
    }
    client.heartbeat.unref()

    if (!this.clients.has(creatorId)) {
      this.clients.set(creatorId, new Set())
    }
    this.clients.get(creatorId)!.add(client)

    return () => {
      clearInterval(client.heartbeat)
      const set = this.clients.get(creatorId)
      if (!set) return
      set.delete(client)
      if (set.size === 0) this.clients.delete(creatorId)
    }
  }

  publish(creatorId: string, event: string, data: unknown): void {
    const set = this.clients.get(creatorId)
    if (!set) return

    for (const client of set) {
      this.safeWrite(client, event, data)
    }
  }

  getSubscriberCount(creatorId: string): number {
    return this.clients.get(creatorId)?.size ?? 0
  }

  private safeWrite(client: SseClient, event: string, data: unknown): void {
    try {
      client.res.write(formatSseMessage(event, data))
    } catch {
      clearInterval(client.heartbeat)
    }
  }
}

export const sseHub = new SseHub()
