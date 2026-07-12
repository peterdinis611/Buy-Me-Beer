import rateLimit from "express-rate-limit"

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many attempts. Try again later.",
  standardHeaders: true,
  legacyHeaders: false,
})

export const supportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: "Too many support requests. Please wait.",
})
