import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url").notNull(),
  coffeePrice: integer("coffee_price").notNull().default(500),
  beerPrice: integer("beer_price").notNull().default(800),
  coffeeLabel: text("coffee_label").notNull().default("Buy me a coffee"),
  beerLabel: text("beer_label").notNull().default("Buy me a beer"),
  theme: text("theme", { enum: ["warm", "dark", "minimal"] }).notNull().default("warm"),
  website: text("website").notNull().default(""),
  twitter: text("twitter").notNull().default(""),
  github: text("github").notNull().default(""),
  goalAmount: integer("goal_amount").notNull().default(0),
  goalTitle: text("goal_title").notNull().default(""),
  thankYouMessage: text("thank_you_message").notNull().default(""),
  primaryColor: text("primary_color").notNull().default("#F5A623"),
  coverImageUrl: text("cover_image_url").notNull().default(""),
  discordWebhookUrl: text("discord_webhook_url").notNull().default(""),
  slackWebhookUrl: text("slack_webhook_url").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const supports = sqliteTable("supports", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  supporterName: text("supporter_name").notNull(),
  supporterEmail: text("supporter_email").notNull().default(""),
  amount: integer("amount").notNull(),
  product: text("product", {
    enum: ["coffee", "beer", "custom", "membership", "shop", "commission"],
  }).notNull(),
  message: text("message").notNull().default(""),
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull().default("pending"),
  stripeSessionId: text("stripe_session_id"),
  membershipTierId: text("membership_tier_id"),
  assetId: text("asset_id").references(() => assets.id, { onDelete: "set null" }),
  isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
  isGift: integer("is_gift", { mode: "boolean" }).notNull().default(false),
  giftRecipientName: text("gift_recipient_name").notNull().default(""),
  giftMessage: text("gift_message").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const authTokens = sqliteTable("auth_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  type: text("type", { enum: ["verify_email", "reset_password"] }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const membershipTiers = sqliteTable("membership_tiers", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  description: text("description").notNull().default(""),
  billingInterval: text("billing_interval", { enum: ["one_time", "month"] })
    .notNull()
    .default("one_time"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const memberships = sqliteTable("memberships", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tierId: text("tier_id")
    .notNull()
    .references(() => membershipTiers.id, { onDelete: "cascade" }),
  supporterName: text("supporter_name").notNull(),
  supporterEmail: text("supporter_email").notNull().default(""),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status", { enum: ["active", "canceled", "past_due"] }).notNull().default("active"),
  currentPeriodEnd: integer("current_period_end", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  src: text("src").notNull(),
  price: integer("price").notNull().default(500),
  width: integer("width").notNull().default(0),
  height: integer("height").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull().default(""),
  visibility: text("visibility", { enum: ["public", "members"] }).notNull().default("public"),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const commissions = sqliteTable("commissions", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  clientName: text("client_name").notNull(),
  clientEmail: text("client_email").notNull().default(""),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull(),
  status: text("status", {
    enum: ["pending", "paid", "in_progress", "done", "canceled"],
  })
    .notNull()
    .default("pending"),
  supportId: text("support_id").references(() => supports.id, { onDelete: "set null" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Support = typeof supports.$inferSelect
export type MembershipTier = typeof membershipTiers.$inferSelect
export type Membership = typeof memberships.$inferSelect
export type Asset = typeof assets.$inferSelect
export type Post = typeof posts.$inferSelect
export type Commission = typeof commissions.$inferSelect
