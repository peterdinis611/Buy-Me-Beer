import { z } from "zod"
import { MAX_TIP_CENTS, MIN_TIP_CENTS, eurosToCents } from "./money.js"

export function parseFormBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === 1 || value === "1"
}

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(80),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export const profileSchema = z.object({
  displayName: z.string().min(2).max(80),
  handle: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  coffeeLabel: z.string().max(60),
  beerLabel: z.string().max(60),
  coffeePrice: z.coerce.number().min(100).max(100000),
  beerPrice: z.coerce.number().min(100).max(100000),
  theme: z.enum(["warm", "dark", "minimal"]),
  website: z.string().max(200).optional(),
  twitter: z.string().max(50).optional(),
  github: z.string().max(50).optional(),
  goalAmount: z.coerce.number().min(0).max(10000000),
  goalTitle: z.string().max(120).optional(),
})

export const supportSchema = z
  .object({
    product: z.enum(["coffee", "beer", "custom", "membership", "shop"]),
    name: z.string().max(80).optional(),
    email: z.string().email().optional().or(z.literal("")),
    message: z.string().max(280).optional(),
    customAmount: z.coerce.number().optional(),
    tierId: z.string().optional(),
    membershipTierId: z.string().optional(),
    isPublic: z.union([z.boolean(), z.string(), z.number()]).optional(),
    isGift: z.union([z.boolean(), z.string(), z.number()]).optional(),
    giftRecipientName: z.string().max(80).optional(),
    giftMessage: z.string().max(280).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.product === "custom") {
      if (data.customAmount === undefined || Number.isNaN(data.customAmount)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a custom amount.", path: ["customAmount"] })
        return
      }
      const cents = Math.round(data.customAmount * 100)
      if (cents < MIN_TIP_CENTS) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Minimum amount is €1.", path: ["customAmount"] })
      }
      if (cents > MAX_TIP_CENTS) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Maximum amount is €1000.", path: ["customAmount"] })
      }
    }
  })
  .transform((data) => ({
    ...data,
    isPublic: data.isPublic === undefined ? true : parseFormBoolean(data.isPublic),
    isGift: parseFormBoolean(data.isGift),
    giftRecipientName: data.giftRecipientName?.trim() ?? "",
    giftMessage: data.giftMessage?.trim() ?? "",
  }))

export const profileSettingsSchema = z.object({
  displayName: z.string().min(2).max(80),
  handle: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  coffeeLabel: z.string().max(60),
  beerLabel: z.string().max(60),
  coffeePriceEuros: z.coerce.number().min(1).max(1000),
  beerPriceEuros: z.coerce.number().min(1).max(1000),
  theme: z.enum(["warm", "dark", "minimal"]),
  website: z.string().max(200).optional(),
  twitter: z.string().max(50).optional(),
  github: z.string().max(50).optional(),
  goalEuros: z.coerce.number().min(0).max(100000),
  goalTitle: z.string().max(120).optional(),
  thankYouMessage: z.string().max(500).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #F5A623")
    .optional()
    .or(z.literal("")),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
})

export function profileFromSettings(data: z.infer<typeof profileSettingsSchema>) {
  return {
    displayName: data.displayName,
    handle: data.handle,
    bio: data.bio ?? "",
    avatarUrl: data.avatarUrl ?? "",
    coffeeLabel: data.coffeeLabel,
    beerLabel: data.beerLabel,
    coffeePrice: eurosToCents(data.coffeePriceEuros),
    beerPrice: eurosToCents(data.beerPriceEuros),
    theme: data.theme,
    website: data.website ?? "",
    twitter: data.twitter ?? "",
    github: data.github ?? "",
    goalAmount: eurosToCents(data.goalEuros),
    goalTitle: data.goalTitle ?? "",
    thankYouMessage: data.thankYouMessage ?? "",
    primaryColor: data.primaryColor || "#F5A623",
    coverImageUrl: data.coverImageUrl ?? "",
  }
}

export const tierSettingsSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(80),
  priceEuros: z.coerce.number().min(1).max(500),
  description: z.string().max(200).optional(),
  billingInterval: z.enum(["one_time", "month"]).default("one_time"),
})

export const shopAssetSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  src: z.string().url(),
  priceEuros: z.coerce.number().min(1).max(500),
})

export const shopPurchaseSchema = z.object({
  name: z.string().max(80).optional(),
  email: z.string().email().optional().or(z.literal("")),
})

export const postSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(120),
  body: z.string().max(5000).optional(),
  visibility: z.enum(["public", "members"]).default("public"),
  published: z.union([z.boolean(), z.string(), z.number()]).optional(),
})

export const commissionRequestSchema = z.object({
  clientName: z.string().min(1).max(80),
  clientEmail: z.string().email().optional().or(z.literal("")),
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  priceEuros: z.coerce.number().min(5).max(5000),
})

export const commissionStatusSchema = z.object({
  status: z.enum(["pending", "paid", "in_progress", "done", "canceled"]),
})

export const integrationsSchema = z.object({
  discordWebhookUrl: z.string().url().optional().or(z.literal("")),
  slackWebhookUrl: z.string().url().optional().or(z.literal("")),
})

export const memberVerifySchema = z.object({
  email: z.string().email(),
})

export function firstValidationError(result: z.SafeParseError<unknown>): string {
  return result.error.issues[0]?.message ?? "Invalid input."
}
