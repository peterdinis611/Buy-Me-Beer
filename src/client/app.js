import Alpine from "alpinejs"
import { createRichPostEditor } from "./post-prosemirror.js"

const PRODUCT_EMOJI = {
  coffee: "☕",
  beer: "🍺",
  custom: "💝",
  membership: "⭐",
}

function formatMoney(cents) {
  return new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(cents / 100)
}

function productEmoji(product) {
  return PRODUCT_EMOJI[product] || "💝"
}

Alpine.data("flashMessage", () => ({
  visible: true,
  init() {
    setTimeout(() => {
      this.visible = false
    }, 6000)
  },
}))

Alpine.data("themeToggle", () => ({
  theme: "dark",
  init() {
    this.theme = document.documentElement.getAttribute("data-theme") || "dark"
  },
  toggle() {
    this.theme = this.theme === "dark" ? "light" : "dark"
    document.documentElement.setAttribute("data-theme", this.theme)
    try {
      localStorage.setItem("theme", this.theme)
    } catch {
      /* storage unavailable */
    }
  },
  get icon() {
    return this.theme === "dark" ? "☀️" : "🌙"
  },
  get label() {
    return this.theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
  },
}))

Alpine.data("dashboardShell", () => ({
  mobileOpen: false,
  desktopOpen: true,
  isDesktop: false,

  init() {
    try {
      const saved = localStorage.getItem("dashboard-sidebar")
      if (saved === "closed") this.desktopOpen = false
      if (saved === "open") this.desktopOpen = true
    } catch {
      /* storage unavailable */
    }

    this.mediaQuery = window.matchMedia("(min-width: 1024px)")
    this.syncViewport = () => {
      this.isDesktop = this.mediaQuery.matches
      if (this.isDesktop) this.mobileOpen = false
    }
    this.syncViewport()
    this.mediaQuery.addEventListener("change", this.syncViewport)

    this._onKeydown = (event) => {
      if (event.key === "Escape") this.closeSidebar()
    }
    document.addEventListener("keydown", this._onKeydown)

    this.$watch("mobileOpen", (open) => {
      if (!this.isDesktop) {
        document.body.style.overflow = open ? "hidden" : ""
      }
    })
  },

  persistDesktop() {
    try {
      localStorage.setItem("dashboard-sidebar", this.desktopOpen ? "open" : "closed")
    } catch {
      /* storage unavailable */
    }
  },

  openSidebar() {
    if (this.isDesktop) {
      this.desktopOpen = true
      this.persistDesktop()
    } else {
      this.mobileOpen = true
    }
  },

  closeSidebar() {
    if (this.isDesktop) {
      this.desktopOpen = false
      this.persistDesktop()
    } else {
      this.mobileOpen = false
    }
  },

  toggleSidebar() {
    if (this.isDesktop) {
      this.desktopOpen = !this.desktopOpen
      this.persistDesktop()
    } else {
      this.mobileOpen = !this.mobileOpen
    }
  },

  onNavClick() {
    if (!this.isDesktop) this.mobileOpen = false
  },
}))

Alpine.data("shareKit", (config) => ({
  profileUrl: config.profileUrl,
  copied: false,
  get embedCode() {
    return `<script src="${location.origin}/embed/${config.handle}.js" defer><\\/script>`
  },
  get tweetText() {
    return `Support ${config.displayName} ☕🍺 ${config.profileUrl}`
  },
  async copy(text) {
    try {
      await navigator.clipboard.writeText(text)
      this.copied = true
      setTimeout(() => {
        this.copied = false
      }, 2000)
    } catch {
      /* clipboard unavailable */
    }
  },
}))

Alpine.data("clipboard", (url) => ({
  url,
  copied: false,
  error: false,
  async copy() {
    this.error = false
    try {
      await navigator.clipboard.writeText(this.url)
      this.copied = true
      setTimeout(() => {
        this.copied = false
      }, 2000)
    } catch {
      this.error = true
      setTimeout(() => {
        this.error = false
      }, 3000)
    }
  },
}))

Alpine.data("mobileNav", () => ({
  open: false,
  toggle() {
    this.open = !this.open
  },
  close() {
    this.open = false
  },
}))

Alpine.data("supportCheckout", (config) => buildSupportCheckout(config))

Alpine.data("creatorPage", (config) => ({
  tab: "support",
  setTab(name) {
    this.tab = name
  },
  ...buildSupportCheckout(config),
}))

function buildSupportCheckout(config) {
  return {
  product: "",
  membershipTierId: "",
  customAmount: "",
  name: "",
  email: "",
  message: "",
  isPublic: true,
  isGift: false,
  giftRecipientName: "",
  giftMessage: "",
  submitting: false,
  config,

  selectCoffee() {
    this.product = "coffee"
    this.membershipTierId = ""
  },

  selectBeer() {
    this.product = "beer"
    this.membershipTierId = ""
  },

  selectCustom() {
    this.product = "custom"
    this.membershipTierId = ""
  },

  selectTier(tierId) {
    this.product = "membership"
    this.membershipTierId = tierId
  },

  get hasSelection() {
    return Boolean(this.product)
  },

  get summaryLabel() {
    if (this.product === "coffee") return this.config.coffee.label
    if (this.product === "beer") return this.config.beer.label
    if (this.product === "custom") return "Custom amount"
    if (this.product === "membership") {
      const tier = this.config.tiers.find((t) => t.id === this.membershipTierId)
      return tier?.name ?? "Support tier"
    }
    return ""
  },

  get summaryAmount() {
    if (this.product === "coffee") return this.config.coffee.formatted
    if (this.product === "beer") return this.config.beer.formatted
    if (this.product === "custom") {
      const euros = Number(this.customAmount)
      if (!euros || euros < 1) return "—"
      return formatMoney(Math.round(euros * 100))
    }
    if (this.product === "membership") {
      const tier = this.config.tiers.find((t) => t.id === this.membershipTierId)
      return tier?.priceLabel ?? tier?.formatted ?? "—"
    }
    return "—"
  },

  get canSubmit() {
    if (!this.product || this.submitting) return false
    if (this.product === "custom") {
      const euros = Number(this.customAmount)
      return euros >= 1 && euros <= 1000
    }
    if (this.product === "membership") return Boolean(this.membershipTierId)
    return true
  },

  get submitLabel() {
    if (this.submitting) return "Processing…"
    if (!this.canSubmit) return "Choose an amount to continue"
    return `Support ${this.summaryAmount}`
  },

  onSubmit() {
    if (!this.canSubmit) return
    this.submitting = true
  },
  }
}

Alpine.data("settingsForm", (initial) => ({
  bio: initial.bio || "",
  displayName: initial.displayName || "",
  handle: initial.handle || "",
  avatarUrl: initial.avatarUrl || "",
  coffeePriceEuros: initial.coffeePriceEuros ?? 5,
  beerPriceEuros: initial.beerPriceEuros ?? 8,
  goalEuros: initial.goalEuros ?? 0,
  primaryColor: initial.primaryColor || "#F5A623",
  get bioRemaining() {
    return 500 - (this.bio?.length ?? 0)
  },
  coffeePreview() {
    return formatMoney(Math.round(this.coffeePriceEuros * 100))
  },
  beerPreview() {
    return formatMoney(Math.round(this.beerPriceEuros * 100))
  },
  goalPreview() {
    return this.goalEuros > 0 ? formatMoney(Math.round(this.goalEuros * 100)) : "Off"
  },
  onColorPick(event) {
    this.primaryColor = event.target.value.toUpperCase()
  },
}))

Alpine.data("imageUploadField", (config) => ({
  variant: config.variant || "avatar",
  hint: config.hint || "JPEG, PNG, WebP, GIF · max 5 MB",
  preview: config.currentUrl || "",
  fileName: "",
  fileSize: "",
  dragging: false,
  objectUrl: null,

  get hasSelection() {
    return Boolean(this.fileName)
  },

  get canSubmit() {
    return this.hasSelection
  },

  pick() {
    this.$refs.fileInput?.click()
  },

  applyFile(file) {
    if (!file) return
    if (!file.type.startsWith("image/")) return

    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
    this.objectUrl = URL.createObjectURL(file)
    this.preview = this.objectUrl
    this.fileName = file.name
    this.fileSize = this.formatSize(file.size)

    const dt = new DataTransfer()
    dt.items.add(file)
    this.$refs.fileInput.files = dt.files
  },

  onFileChange(event) {
    this.applyFile(event.target.files?.[0])
  },

  onDrop(event) {
    this.dragging = false
    this.applyFile(event.dataTransfer?.files?.[0])
  },

  clear() {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl)
    this.objectUrl = null
    this.preview = config.currentUrl || ""
    this.fileName = ""
    this.fileSize = ""
    if (this.$refs.fileInput) this.$refs.fileInput.value = ""
  },

  formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  },
}))

Alpine.data("postEditor", () => ({
  title: "",
  body: "",
  textLength: 0,
  visibility: "public",
  published: true,
  editor: null,
  active: {
    bold: false,
    italic: false,
    strike: false,
    code: false,
    link: false,
    heading1: false,
    heading2: false,
    heading3: false,
    paragraph: false,
    codeBlock: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
  },
  headingMenuOpen: false,

  init() {
    this.$nextTick(() => {
      const mount = this.$refs.editorMount
      if (!mount) return

      this.editor = createRichPostEditor(mount, {
        onUpdate: ({ html, textLength }) => {
          this.body = html
          this.textLength = textLength
          this.refreshActive()
        },
      })

      this.$el.addEventListener("submit", () => {
        if (this.editor) this.body = this.editor.getHtml()
      })
    })
  },

  get titleRemaining() {
    return 120 - this.title.length
  },

  get bodyRemaining() {
    return 5000 - this.textLength
  },

  refreshActive() {
    if (!this.editor) return
    this.active = {
      bold: this.editor.isActive("bold"),
      italic: this.editor.isActive("italic"),
      strike: this.editor.isActive("strike"),
      code: this.editor.isActive("code"),
      link: this.editor.isActive("link"),
      heading1: this.editor.isActive("heading1"),
      heading2: this.editor.isActive("heading2"),
      heading3: this.editor.isActive("heading3"),
      paragraph: this.editor.isActive("paragraph"),
      codeBlock: this.editor.isActive("codeBlock"),
      blockquote: this.editor.isActive("blockquote"),
      bulletList: this.editor.isActive("bulletList"),
      orderedList: this.editor.isActive("orderedList"),
    }
  },

  cmd(method) {
    if (!this.editor || typeof this.editor[method] !== "function") return
    this.editor[method]()
    this.refreshActive()
  },

  headingCmd(method) {
    this.headingMenuOpen = false
    this.cmd(method)
  },
}))

Alpine.data("postDelete", () => ({
  confirmId: "",
  ask(id) {
    this.confirmId = id
  },
  cancel() {
    this.confirmId = ""
  },
  submit(id) {
    document.getElementById(`delete-post-${id}`)?.submit()
  },
}))

Alpine.data("revenueChart", (initial) => ({
  chart: initial.chart,
  chartMax: initial.chartMax || 1,
  days: initial.days,
  barHeight(total) {
    if (!this.chartMax) return 4
    return Math.max(4, Math.round((total / this.chartMax) * 100))
  },
}))

Alpine.data("exploreSearch", () => ({
  query: "",
  matches(name, handle, bio = "") {
    if (!this.query.trim()) return true
    const q = this.query.trim().toLowerCase()
    return (
      name.toLowerCase().includes(q) ||
      handle.toLowerCase().includes(q) ||
      bio.toLowerCase().includes(q)
    )
  },
}))

Alpine.data("confirmDelete", () => ({
  open: false,
  tierName: "",
  tierId: "",
  ask(id, name) {
    this.tierId = id
    this.tierName = name
    this.open = true
  },
  cancel() {
    this.open = false
    this.tierName = ""
    this.tierId = ""
  },
  submit() {
    const form = document.getElementById(`delete-tier-${this.tierId}`)
    form?.submit()
  },
}))

Alpine.data("dashboardLive", (initial) => ({
  totalCents: initial.totalCents,
  count: initial.count,
  coffeeCount: initial.coffeeCount,
  beerCount: initial.beerCount,
  membershipCount: initial.membershipCount ?? 0,
  customCount: initial.customCount ?? 0,
  goalAmount: initial.goalAmount,
  toasts: [],
  recentSupport: initial.recentSupport,
  showEmpty: initial.recentSupport.length === 0,
  totalPulse: false,
  countPulse: false,
  coffeePulse: false,
  beerPulse: false,
  goalPulse: false,

  get totalFormatted() {
    return formatMoney(this.totalCents)
  },

  get goalProgress() {
    if (this.goalAmount <= 0) return 0
    return Math.min(100, (this.totalCents / this.goalAmount) * 100)
  },

  init() {
    this.connectSse()
  },

  bump(field) {
    this[`${field}Pulse`] = true
    setTimeout(() => {
      this[`${field}Pulse`] = false
    }, 500)
  },

  connectSse() {
    const source = new EventSource("/dashboard/events")

    source.addEventListener("support_received", (event) => {
      try {
        this.handleSupport(JSON.parse(event.data))
      } catch {
        /* ignore malformed payload */
      }
    })

    source.onerror = () => {
      source.close()
      setTimeout(() => this.connectSse(), 5000)
    }
  },

  handleSupport(payload) {
    this.totalCents += payload.amount
    this.count += 1
    this.bump("total")
    this.bump("count")
    this.bump("goal")

    if (payload.product === "coffee") {
      this.coffeeCount += 1
      this.bump("coffee")
    } else if (payload.product === "beer") {
      this.beerCount += 1
      this.bump("beer")
    } else if (payload.product === "membership") {
      this.membershipCount += 1
    } else if (payload.product === "custom") {
      this.customCount += 1
    }

    this.showEmpty = false
    this.recentSupport.unshift({
      ...payload,
      id: payload.id,
      emoji: productEmoji(payload.product),
      isNew: true,
    })

    const id = Date.now()
    this.toasts.push({ ...payload, id, visible: true, emoji: productEmoji(payload.product) })

    setTimeout(() => {
      const toast = this.toasts.find((t) => t.id === id)
      if (toast) toast.visible = false
    }, 7500)

    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id)
    }, 8200)
  },
}))

function hidePagePreload() {
  const el = document.getElementById("page-preload")
  if (!el || el.dataset.done === "1") return
  el.dataset.done = "1"
  el.classList.add("page-preload-done")
  document.body.classList.remove("page-is-loading")
  window.setTimeout(() => el.remove(), 320)
}

function scheduleHidePagePreload() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const minMs = reduceMotion ? 0 : 380
  const started = performance.now()

  const finish = () => {
    const wait = Math.max(0, minMs - (performance.now() - started))
    window.setTimeout(hidePagePreload, wait)
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(finish)
  })
}

window.Alpine = Alpine
Alpine.start()
scheduleHidePagePreload()
