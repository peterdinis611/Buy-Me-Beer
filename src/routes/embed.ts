import { Router } from "express"
import { findUserByHandle } from "../db/queries.js"
import { buildProfileUrl } from "../lib/social.js"

const router = Router()

router.get("/:handle.js", async (req, res) => {
  const handle = String(req.params.handle).toLowerCase()
  const creator = await findUserByHandle(handle)
  if (!creator) {
    res.type("application/javascript").send("console.warn('Buy Me Beer: creator not found');")
    return
  }

  const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
  const profileUrl = buildProfileUrl(baseUrl, creator.handle)
  const label = `Support ${creator.displayName}`

  res.type("application/javascript").send(`
(function () {
  var s = document.currentScript;
  if (!s) return;
  var btn = document.createElement("a");
  btn.href = ${JSON.stringify(profileUrl)};
  btn.target = "_blank";
  btn.rel = "noopener";
  btn.textContent = ${JSON.stringify(label)};
  btn.style.cssText = "display:inline-flex;align-items:center;gap:8px;padding:12px 20px;border-radius:12px;background:#F5A623;color:#140e0a;font-family:system-ui,sans-serif;font-weight:600;font-size:14px;text-decoration:none;box-shadow:0 4px 14px rgba(245,166,35,.35);transition:transform .15s,box-shadow .15s;";
  btn.onmouseover = function () { btn.style.transform = "translateY(-2px)"; };
  btn.onmouseout = function () { btn.style.transform = ""; };
  s.parentNode.insertBefore(btn, s.nextSibling);
})();
`)
})

router.get("/widget/:handle", async (req, res) => {
  const handle = String(req.params.handle).toLowerCase()
  const creator = await findUserByHandle(handle)
  if (!creator) return res.status(404).send("Not found")

  const baseUrl = process.env.BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`

  res.render("pages/widget", {
    layout: false,
    creator,
    profileUrl: buildProfileUrl(baseUrl, creator.handle),
  })
})

export default router
