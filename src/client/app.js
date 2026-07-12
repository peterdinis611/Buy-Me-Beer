import Alpine from "alpinejs"

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

Alpine.data("supportCheckout", (config) => ({
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
}))

Alpine.data("settingsForm", (initial) => ({
  bio: initial.bio || "",
  coffeePriceEuros: initial.coffeePriceEuros ?? 5,
  beerPriceEuros: initial.beerPriceEuros ?? 8,
  goalEuros: initial.goalEuros ?? 0,
  primaryColor: initial.primaryColor || "#F5A623",
  get bioRemaining() {
    return 500 - this.bio.length
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
