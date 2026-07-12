const baseUrl = () => process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`

export async function sendVerificationEmail(email: string, token: string) {
  const link = `${baseUrl()}/verify-email?token=${token}`
  if (process.env.SMTP_HOST) {
    // Production: wire nodemailer when SMTP_* env vars are set
    console.log(`[email] Verification → ${email}`)
  } else {
    console.log(`\n📧 Verify email for ${email}:\n   ${link}\n`)
  }
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const link = `${baseUrl()}/reset-password?token=${token}`
  if (process.env.SMTP_HOST) {
    console.log(`[email] Password reset → ${email}`)
  } else {
    console.log(`\n🔑 Reset password for ${email}:\n   ${link}\n`)
  }
}
