import { and, desc, eq, sql } from "drizzle-orm"
import { v4 as uuid } from "uuid"
import { RESERVED_HANDLES } from "../lib/handles.js"
import { formatMoney } from "../lib/money.js"
import { aggregateSupportStats } from "../lib/stats.js"
import { db } from "./index.js"
import {
  authTokens,
  membershipTiers,
  supports,
  users,
  type MembershipTier,
  type NewUser,
  type Support,
  type User,
} from "./schema.js"

export { RESERVED_HANDLES, formatMoney }

export async function findUserByEmail(email: string) {
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
  return rows[0]
}

export async function findUserByHandle(handle: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.handle, handle.toLowerCase()))
    .limit(1)
  return rows[0]
}

export async function findUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return rows[0]
}

export async function isHandleTaken(handle: string, excludeId?: string) {
  const row = await findUserByHandle(handle)
  return Boolean(row && row.id !== excludeId)
}

export async function createUser(data: Omit<NewUser, "id" | "createdAt" | "updatedAt">) {
  const now = new Date()
  const id = uuid()
  await db.insert(users).values({
    ...data,
    id,
    email: data.email.toLowerCase(),
    handle: data.handle.toLowerCase(),
    createdAt: now,
    updatedAt: now,
  })
  return (await findUserById(id))!
}

export async function updateUser(id: string, patch: Partial<User>) {
  const now = new Date()
  await db
    .update(users)
    .set({ ...patch, updatedAt: now })
    .where(eq(users.id, id))
  return findUserById(id)
}

export async function listCreators(limit = 24) {
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit)
}

export async function createSupport(
  data: Omit<Support, "id" | "createdAt"> & { id?: string }
) {
  const id = data.id ?? uuid()
  await db.insert(supports).values({ ...data, id, createdAt: new Date() })
  return (await findSupportById(id))!
}

export async function findSupportById(id: string) {
  const rows = await db.select().from(supports).where(eq(supports.id, id)).limit(1)
  return rows[0]
}

export async function updateSupport(id: string, patch: Partial<Support>) {
  await db.update(supports).set(patch).where(eq(supports.id, id))
  return findSupportById(id)
}

export async function getSupportsForCreator(creatorId: string, publicOnly = false) {
  const conditions = [eq(supports.creatorId, creatorId), eq(supports.status, "completed")]
  if (publicOnly) conditions.push(eq(supports.isPublic, true))

  return db
    .select()
    .from(supports)
    .where(and(...conditions))
    .orderBy(desc(supports.createdAt))
}

export async function getCreatorStats(creatorId: string) {
  const rows = await getSupportsForCreator(creatorId)
  const summary = aggregateSupportStats(rows)
  return { ...summary, supports: rows }
}

export async function createAuthToken(userId: string, type: "verify_email" | "reset_password") {
  const token = uuid().replace(/-/g, "") + uuid().replace(/-/g, "")
  const expiresAt = new Date(Date.now() + (type === "reset_password" ? 3600 : 86400) * 1000)
  const id = uuid()
  await db.insert(authTokens).values({ id, userId, token, type, expiresAt, createdAt: new Date() })
  return { id, token, expiresAt }
}

export async function consumeAuthToken(token: string, type: "verify_email" | "reset_password") {
  const rows = await db
    .select()
    .from(authTokens)
    .where(and(eq(authTokens.token, token), eq(authTokens.type, type)))
    .limit(1)

  const row = rows[0]
  if (!row || row.expiresAt.getTime() < Date.now()) return null

  await db.delete(authTokens).where(eq(authTokens.id, row.id))
  return row
}

export async function getMembershipTiers(userId: string) {
  return db
    .select()
    .from(membershipTiers)
    .where(and(eq(membershipTiers.userId, userId), eq(membershipTiers.active, true)))
    .orderBy(membershipTiers.sortOrder)
}

export async function findMembershipTier(id: string) {
  const rows = await db.select().from(membershipTiers).where(eq(membershipTiers.id, id)).limit(1)
  return rows[0]
}

export async function upsertMembershipTier(
  userId: string,
  data: { id?: string; name: string; price: number; description: string }
) {
  if (data.id) {
    await db
      .update(membershipTiers)
      .set({ name: data.name, price: data.price, description: data.description })
      .where(and(eq(membershipTiers.id, data.id), eq(membershipTiers.userId, userId)))
    return findMembershipTier(data.id)
  }
  const id = uuid()
  const count = await db
    .select({ c: sql<number>`count(*)` })
    .from(membershipTiers)
    .where(eq(membershipTiers.userId, userId))
  await db.insert(membershipTiers).values({
    id,
    userId,
    name: data.name,
    price: data.price,
    description: data.description,
    sortOrder: Number(count[0]?.c ?? 0),
    createdAt: new Date(),
  })
  return findMembershipTier(id)
}

export async function deleteMembershipTier(userId: string, tierId: string) {
  await db
    .delete(membershipTiers)
    .where(and(eq(membershipTiers.id, tierId), eq(membershipTiers.userId, userId)))
}

export async function countUsers() {
  const rows = await db.select({ c: sql<number>`count(*)` }).from(users)
  return Number(rows[0]?.c ?? 0)
}
