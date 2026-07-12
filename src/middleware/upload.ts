import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import multer from "multer"
import { v4 as uuid } from "uuid"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const uploadsRoot = path.join(__dirname, "../../public/uploads")

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"])

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    fs.mkdirSync(uploadsRoot, { recursive: true })
    cb(null, uploadsRoot)
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg"
    cb(null, `${uuid()}${ext}`)
  },
})

export const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true)
    else cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed."))
  },
})

export function publicUploadUrl(filename: string, baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/uploads/${filename}`
}
