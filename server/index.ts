import express from "express"
import cors from "cors"
import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "path"

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db")
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

function calcAIU(totalCost: number, adminPct = 15, utilityPct = 10, ivaPct = 19) {
  const adminCost = totalCost * adminPct / 100
  const utilityCost = totalCost * utilityPct / 100
  const ivaCost = utilityCost * ivaPct / 100
  return {
    adminPct, utilityPct, ivaPct,
    adminCost: Math.round(adminCost),
    utilityCost: Math.round(utilityCost),
    ivaCost: Math.round(ivaCost),
    totalPrice: Math.round(totalCost + adminCost + utilityCost + ivaCost),
  }
}

app.get("/api/units", async (_, res) => {
  const units = await prisma.unit.findMany()
  res.json(units)
})

app.get("/api/chapters", async (_, res) => {
  const chapters = await prisma.chapter.findMany({ orderBy: { sortOrder: "asc" } })
  res.json(chapters)
})

app.post("/api/chapters", async (req, res) => {
  const { code, title, icon, sortOrder } = req.body
  if (!code || !title) { res.status(400).json({ error: "code and title are required" }); return }
  const existing = await prisma.chapter.findUnique({ where: { code } })
  if (existing) { res.status(409).json({ error: "Chapter code already exists" }); return }
  const maxSort = await prisma.chapter.aggregate({ _max: { sortOrder: true } })
  const chapter = await prisma.chapter.create({
    data: { code, title, icon: icon || "📋", sortOrder: sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1 },
  })
  res.status(201).json(chapter)
})

app.put("/api/chapters/:code", async (req, res) => {
  const { code } = req.params
  const { title, icon, sortOrder } = req.body
  const existing = await prisma.chapter.findUnique({ where: { code } })
  if (!existing) { res.status(404).json({ error: "Chapter not found" }); return }
  const chapter = await prisma.chapter.update({
    where: { code },
    data: { ...(title !== undefined && { title }), ...(icon !== undefined && { icon }), ...(sortOrder !== undefined && { sortOrder }) },
  })
  res.json(chapter)
})

app.delete("/api/chapters/:code", async (req, res) => {
  const { code } = req.params
  const existing = await prisma.chapter.findUnique({ where: { code } })
  if (!existing) { res.status(404).json({ error: "Chapter not found" }); return }
  const itemCount = await prisma.item.count({ where: { chapterId: existing.id } })
  if (itemCount > 0) { res.status(409).json({ error: `Cannot delete chapter with ${itemCount} items. Remove items first.` }); return }
  await prisma.chapter.delete({ where: { code } })
  res.json({ success: true })
})

app.get("/api/rooms", async (_, res) => {
  const rooms = await prisma.room.findMany()
  res.json(rooms)
})

app.get("/api/items", async (_, res) => {
  const items = await prisma.item.findMany({
    include: {
      unit: true,
      chapter: true,
      itemQuantities: { include: { room: true } },
      apu: { include: { components: { include: { unit: true } }, unit: true } },
    },
    orderBy: { code: "asc" },
  })
  res.json(items)
})

app.get("/api/chapters/:code/items", async (req, res) => {
  const items = await prisma.item.findMany({
    where: { chapter: { code: req.params.code } },
    include: {
      unit: true,
      itemQuantities: { include: { room: true } },
      apu: { include: { components: { include: { unit: true } }, unit: true } },
    },
    orderBy: { code: "asc" },
  })
  res.json(items)
})

app.get("/api/apus", async (_, res) => {
  const apus = await prisma.aPU.findMany({
    include: {
      unit: true,
      components: { include: { unit: true } },
    },
    orderBy: { code: "asc" },
  })
  res.json(apus)
})

app.get("/api/budget/summary", async (_, res) => {
  const items = await prisma.item.findMany({
    include: {
      itemQuantities: true,
      chapter: true,
      apu: { include: { components: true } },
    },
  })
  const chaptersData = await prisma.chapter.findMany({ orderBy: { sortOrder: "asc" } })
  const chapters: Record<string, { title: string; icon: string; subtotal: number }> = {}
  for (const ch of chaptersData) chapters[ch.code] = { title: ch.title, icon: ch.icon, subtotal: 0 }

  let totalGeneral = 0, totalMO = 0, totalMat = 0, totalEquipo = 0, totalTransp = 0
  let totalPrice = 0, totalAdmin = 0, totalUtility = 0, totalIVA = 0
  for (const item of items) {
    const totalQty = item.itemQuantities.reduce((s, q) => s + q.quantity, 0)
    if (!item.apu) continue
    const apuTotal = item.apu.totalCost
    const apuPrice = item.apu.totalPrice
    const subtotal = apuTotal * totalQty
    const priceSubtotal = apuPrice * totalQty
    const chCode = item.chapter.code
    if (chapters[chCode]) {
      chapters[chCode].subtotal += priceSubtotal
    }
    totalGeneral += subtotal
    totalPrice += priceSubtotal
    totalAdmin += (item.apu.adminCost || 0) * totalQty
    totalUtility += (item.apu.utilityCost || 0) * totalQty
    totalIVA += (item.apu.ivaCost || 0) * totalQty
    for (const c of item.apu.components) {
      const cost = c.totalCost * totalQty
      if (c.category === "MO") totalMO += cost
      else if (c.category === "EQUIPO") totalEquipo += cost
      else if (c.category === "TRANSPORT") totalTransp += cost
      else totalMat += cost
    }
  }

  res.json({
    totalGeneral: Math.round(totalGeneral),
    totalPrice: Math.round(totalPrice),
    totalAdmin: Math.round(totalAdmin),
    totalUtility: Math.round(totalUtility),
    totalIVA: Math.round(totalIVA),
    totalMO: Math.round(totalMO),
    totalMat: Math.round(totalMat),
    totalEquipo: Math.round(totalEquipo),
    totalTransp: Math.round(totalTransp),
    chapters: Object.entries(chapters).map(([code, data]) => ({ code, ...data })),
  })
})

app.get("/api/units", async (_, res) => {
  const units = await prisma.unit.findMany()
  res.json(units)
})

app.post("/api/items", async (req, res) => {
  const { code, description, chapterCode, unitCode, apuCode, quantities } = req.body
  const chapter = await prisma.chapter.findUnique({ where: { code: chapterCode } })
  if (!chapter) { res.status(404).json({ error: "Chapter not found" }); return }
  const unit = await prisma.unit.findUnique({ where: { code: unitCode } })
  if (!unit) { res.status(404).json({ error: "Unit not found" }); return }
  let apuConn = {}
  if (apuCode) {
    const apu = await prisma.aPU.findUnique({ where: { code: apuCode } })
    if (apu) apuConn = { connect: { id: apu.id } }
  }
  const item = await prisma.item.create({
    data: {
      code,
      description,
      chapter: { connect: { id: chapter.id } },
      unit: { connect: { id: unit.id } },
      ...(apuConn ? { apu: apuConn } : {}),
      itemQuantities: {
        create: Array.isArray(quantities) ? quantities.map((q: { roomId: number; quantity: number }) => ({
          roomId: q.roomId,
          quantity: q.quantity,
        })) : [],
      },
    },
    include: { unit: true, chapter: true, itemQuantities: { include: { room: true } }, apu: { include: { components: { include: { unit: true } }, unit: true } } },
  })
  res.status(201).json(item)
})

app.put("/api/items/:id", async (req, res) => {
  const { id } = req.params
  const existing = await prisma.item.findUnique({ where: { id: Number(id) } })
  if (!existing) { res.status(404).json({ error: "Item not found" }); return }
  const { description, unitCode, apuCode, quantities } = req.body
  const data: any = {}
  if (description !== undefined) data.description = description
  if (unitCode) {
    const unit = await prisma.unit.findUnique({ where: { code: unitCode } })
    if (unit) data.unit = { connect: { id: unit.id } }
  }
  if (apuCode !== undefined) {
    if (apuCode) {
      const apu = await prisma.aPU.findUnique({ where: { code: apuCode } })
      if (apu) data.apu = { connect: { id: apu.id } }
    } else {
      data.apu = { disconnect: true }
    }
  }
  if (Array.isArray(quantities)) {
    await prisma.itemQuantity.deleteMany({ where: { itemId: Number(id) } })
    data.itemQuantities = {
      create: quantities.map((q: { roomId: number; quantity: number }) => ({ roomId: q.roomId, quantity: q.quantity })),
    }
  }
  const item = await prisma.item.update({
    where: { id: Number(id) },
    data,
    include: { unit: true, chapter: true, itemQuantities: { include: { room: true } }, apu: { include: { components: { include: { unit: true } }, unit: true } } },
  })
  res.json(item)
})

app.delete("/api/items/:id", async (req, res) => {
  const { id } = req.params
  const existing = await prisma.item.findUnique({ where: { id: Number(id) } })
  if (!existing) { res.status(404).json({ error: "Item not found" }); return }
  await prisma.item.delete({ where: { id: Number(id) } })
  res.json({ success: true })
})

app.post("/api/apus", async (req, res) => {
  const { code, title, unitCode, components } = req.body
  if (!code || !title || !unitCode) { res.status(400).json({ error: "code, title and unitCode are required" }); return }
  const unit = await prisma.unit.findUnique({ where: { code: unitCode } })
  if (!unit) { res.status(404).json({ error: "Unit not found" }); return }
  const comps = (components ?? []) as any[]

  // Find existing codes for same description+category across all APUs
  const existingCodes = new Map<string, string>()
  const existing = await prisma.aPUComponent.findMany({ select: { description: true, category: true, code: true } })
  for (const c of existing) existingCodes.set(`${c.description}|${c.category}`, c.code)

  // Find max code per category for new entries
  const maxCodes: Record<string, number> = {}
  for (const c of existing) {
    const m = c.code.match(/^(MO|MA|EQ|TR)-(\d+)$/)
    if (m) maxCodes[m[1]] = Math.max(maxCodes[m[1]] || 0, Number(m[2]))
  }

  const totalCost = comps.reduce((s: number, c: any) => s + (c.quantity || 0) * (c.unitPrice || 0), 0)
  const counters: Record<string, number> = { ...maxCodes }
  const PREFIX: Record<string, string> = { MO: "MO", MATERIAL: "MA", EQUIPO: "EQ", TRANSPORT: "TR" }
  const aiu = calcAIU(totalCost)
  const apu = await prisma.aPU.create({
    data: {
      code, title, unitId: unit.id, totalCost, ...aiu,
      components: {
        create: comps.map((c: any) => {
          const key = `${c.description}|${c.category}`
          let compCode = existingCodes.get(key)
          if (!compCode) {
            counters[c.category] = (counters[c.category] || 0) + 1
            compCode = `${PREFIX[c.category] || "MA"}-${String(counters[c.category]).padStart(2, "0")}`
            existingCodes.set(key, compCode)
          }
          return {
            code: compCode,
            description: c.description || "",
            unitId: c.unitId || unit.id,
            quantity: c.quantity || 0,
            unitPrice: c.unitPrice || 0,
            totalCost: (c.quantity || 0) * (c.unitPrice || 0),
            category: c.category || "MATERIAL",
          }
        }),
      },
    },
    include: { unit: true, components: { include: { unit: true } } },
  })
  res.status(201).json(apu)
})

app.put("/api/apus/:id", async (req, res) => {
  const { id } = req.params
  const existing = await prisma.aPU.findUnique({ where: { id: Number(id) } })
  if (!existing) { res.status(404).json({ error: "APU not found" }); return }
  const { title, unitCode, components } = req.body
  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (unitCode) {
    const unit = await prisma.unit.findUnique({ where: { code: unitCode } })
    if (unit) updateData.unit = { connect: { id: unit.id } }
  }
  if (Array.isArray(components)) {
    // Find existing codes for same description+category (excluding current APU)
    const existingCodes = new Map<string, string>()
    const allExisting = await prisma.aPUComponent.findMany({
      where: { apuId: { not: Number(id) } },
      select: { description: true, category: true, code: true },
    })
    for (const c of allExisting) existingCodes.set(`${c.description}|${c.category}`, c.code)

    // Find max code per category
    const maxCodes: Record<string, number> = {}
    const allComps = await prisma.aPUComponent.findMany({
      where: { apuId: { not: Number(id) } },
      select: { code: true },
    })
    for (const c of allComps) {
      const m = c.code.match(/^(MO|MA|EQ|TR)-(\d+)$/)
      if (m) maxCodes[m[1]] = Math.max(maxCodes[m[1]] || 0, Number(m[2]))
    }

    const totalCost = components.reduce((s: number, c: any) => s + (c.quantity || 0) * (c.unitPrice || 0), 0)
    updateData.totalCost = totalCost
    const aiu = calcAIU(totalCost)
    Object.assign(updateData, aiu)
    await prisma.aPUComponent.deleteMany({ where: { apuId: Number(id) } })
    const counters: Record<string, number> = { ...maxCodes }
    const PREFIX: Record<string, string> = { MO: "MO", MATERIAL: "MA", EQUIPO: "EQ", TRANSPORT: "TR" }
    updateData.components = {
      create: components.map((c: any) => {
        const key = `${c.description}|${c.category}`
        let compCode = existingCodes.get(key)
        if (!compCode) {
          counters[c.category] = (counters[c.category] || 0) + 1
          compCode = `${PREFIX[c.category] || "MA"}-${String(counters[c.category]).padStart(2, "0")}`
          existingCodes.set(key, compCode)
        }
        return {
          code: compCode,
          description: c.description || "",
          unitId: c.unitId || existing.unitId,
          quantity: c.quantity || 0,
          unitPrice: c.unitPrice || 0,
          totalCost: (c.quantity || 0) * (c.unitPrice || 0),
          category: c.category || "MATERIAL",
        }
      }),
    }
  }
  const apu = await prisma.aPU.update({
    where: { id: Number(id) },
    data: updateData,
    include: { unit: true, components: { include: { unit: true } } },
  })
  res.json(apu)
})

app.delete("/api/apus/:id", async (req, res) => {
  const { id } = req.params
  const existing = await prisma.aPU.findUnique({ where: { id: Number(id) } })
  if (!existing) { res.status(404).json({ error: "APU not found" }); return }
  await prisma.aPU.delete({ where: { id: Number(id) } })
  res.json({ success: true })
})

// ── APU Component CRUD ──

app.post("/api/apus/:apuId/components", async (req, res) => {
  const { apuId } = req.params
  const apu = await prisma.aPU.findUnique({ where: { id: Number(apuId) } })
  if (!apu) { res.status(404).json({ error: "APU not found" }); return }
  const { code, description, unitId, quantity, unitPrice, category } = req.body
  const totalCost = (quantity || 0) * (unitPrice || 0)
  const comp = await prisma.aPUComponent.create({
    data: {
      code: code || "MA-00", description: description || "", unitId: unitId || apu.unitId,
      quantity: quantity || 0, unitPrice: unitPrice || 0, totalCost, category: category || "MATERIAL",
      apu: { connect: { id: Number(apuId) } },
    },
    include: { unit: true },
  })
  // Update APU total cost and AIU
  const all = await prisma.aPUComponent.findMany({ where: { apuId: Number(apuId) } })
  const newTotal = all.reduce((s, c) => s + c.totalCost, 0)
  const aiu = calcAIU(newTotal)
  await prisma.aPU.update({ where: { id: Number(apuId) }, data: { totalCost: newTotal, ...aiu } })
  res.status(201).json(comp)
})

app.put("/api/apus/:apuId/components/:compId", async (req, res) => {
  try {
    const { apuId, compId } = req.params
    const existing = await prisma.aPUComponent.findUnique({ where: { id: Number(compId) } })
    if (!existing) { res.status(404).json({ error: "Component not found" }); return }
    const { code, description, unitId, quantity, unitPrice, category } = req.body
    const comp = await prisma.aPUComponent.update({
      where: { id: Number(compId) },
      data: {
        ...(code !== undefined && { code }),
        ...(description !== undefined && { description }),
        ...(unitId !== undefined && { unitId }),
        ...(quantity !== undefined && { quantity, totalCost: Number(quantity) * (unitPrice ?? existing.unitPrice) }),
        ...(unitPrice !== undefined && { unitPrice, totalCost: Number(unitPrice) * (quantity ?? existing.quantity) }),
        ...(category !== undefined && { category }),
      },
      include: { unit: true },
    })
    const all = await prisma.aPUComponent.findMany({ where: { apuId: Number(apuId) } })
    const newTotal = all.reduce((s, c) => s + c.totalCost, 0)
    const aiu = calcAIU(newTotal)
    await prisma.aPU.update({ where: { id: Number(apuId) }, data: { totalCost: newTotal, ...aiu } })
    res.json(comp)
  } catch (e: any) { console.error("PUT component error:", e); res.status(500).json({ error: e.message }) }
})

app.delete("/api/apus/:apuId/components/:compId", async (req, res) => {
  const { apuId, compId } = req.params
  const existing = await prisma.aPUComponent.findUnique({ where: { id: Number(compId) } })
  if (!existing) { res.status(404).json({ error: "Component not found" }); return }
  await prisma.aPUComponent.delete({ where: { id: Number(compId) } })
  const all = await prisma.aPUComponent.findMany({ where: { apuId: Number(apuId) } })
  const newTotal = all.reduce((s, c) => s + c.totalCost, 0)
  const aiu = calcAIU(newTotal)
  await prisma.aPU.update({ where: { id: Number(apuId) }, data: { totalCost: newTotal, ...aiu } })
  res.json({ success: true })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err)
  res.status(500).json({ error: "Internal server error" })
})

// ── Reports endpoint ──

app.get("/api/reports/:type", async (req, res) => {
  const { type } = req.params
  const chapters = await prisma.chapter.findMany({ orderBy: { sortOrder: "asc" } })
  const items = await prisma.item.findMany({
    include: { unit: true, chapter: true, itemQuantities: { include: { room: true } }, apu: { include: { unit: true, components: true } } },
    orderBy: { code: "asc" },
  })
  const rooms = await prisma.room.findMany()
  let moTotal = 0, matTotal = 0, eqTotal = 0, trTotal = 0, cdTotal = 0
  let admin = 0, util = 0, iva = 0, pv = 0
  for (const item of items) {
    const totalQty = item.itemQuantities.reduce((s, q) => s + q.quantity, 0)
    if (!item.apu) continue
    cdTotal += item.apu.totalCost * totalQty
    admin += (item.apu.adminCost || 0) * totalQty
    util += (item.apu.utilityCost || 0) * totalQty
    iva += (item.apu.ivaCost || 0) * totalQty
    pv += (item.apu.totalPrice || 0) * totalQty
    for (const c of item.apu.components) {
      const cost = c.totalCost * totalQty
      if (c.category === "MO") moTotal += cost
      else if (c.category === "EQUIPO") eqTotal += cost
      else if (c.category === "TRANSPORT") trTotal += cost
      else matTotal += cost
    }
  }

  const fmt = (req.query.format as string) || "md"
  const isHtml = fmt === "html"

  function cop(n: number) { return "$ " + Math.round(n).toLocaleString("es-CO") }
  function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") }
  function inline(s: string) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
  }
  function h(md: string) {
    const lines = md.split("\n")
    let out = ""
    let inTable = false
    let inCode = false
    let inOl = false
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i]
      if (/^# /.test(l)) { out += `<h1>${inline(l.slice(2))}</h1>\n`; continue }
      if (/^## /.test(l)) { out += `<h2>${inline(l.slice(3))}</h2>\n`; continue }
      if (/^#### /.test(l)) { out += `<h4>${inline(l.slice(5))}</h4>\n`; continue }
      if (/^### /.test(l)) { out += `<h3>${inline(l.slice(4))}</h3>\n`; continue }
      if (/^---/.test(l)) { out += `<hr>\n`; continue }
      if (/^```/.test(l)) {
        if (inCode) { out += `</code></pre>\n`; inCode = false }
        else { out += `<pre><code>\n`; inCode = true }
        continue
      }
      if (inCode) { out += esc(l) + "\n"; continue }
      if (l.startsWith("|")) {
        if (!inTable) { out += `<table>\n`; inTable = true }
        if (/---/.test(l)) continue
        const isH = i + 1 < lines.length && /---/.test(lines[i + 1])
        if (isH && !out.includes("<thead")) out += `<thead>\n`
        const cells = l.split("|").filter(Boolean).map((c) => c.trim())
        out += `<tr>`
        const firstBold = cells.length > 0 && /^\*\*/.test(cells[0]) && /\*\*$/.test(cells[0])
        const secondBold = cells.length > 1 && /^\*\*/.test(cells[1]) && /\*\*$/.test(cells[1])
        const lastBold = cells.length > 1 && /^\*\*/.test(cells[cells.length - 1]) && /\*\*$/.test(cells[cells.length - 1])
        const midEmpty = cells.length >= 7 && cells.slice(2, cells.length - 1).every((c) => !c || c.trim() === "")
        const isChapterRow = firstBold && secondBold && midEmpty
        const isTotalRow = firstBold && !secondBold && lastBold && midEmpty
        for (let ci = 0; ci < cells.length; ci++) {
          if (isChapterRow && ci >= 2 && ci < cells.length - 1) continue
          if (isTotalRow && ci > 0 && ci < cells.length - 1) continue
          const bold = /^\*\*/.test(cells[ci]) && /\*\*$/.test(cells[ci])
          const v = bold ? cells[ci].slice(2, -2) : cells[ci]
          const tag = isH ? "th" : "td"
          let colspan = ""
          if (isChapterRow && ci === 1) colspan = ` colspan="${cells.length - 2}"`
          if (isTotalRow && ci === 0) colspan = ` colspan="${cells.length - 1}"`
          out += `<${tag}${colspan}>${bold ? "<strong>" : ""}${inline(v)}${bold ? "</strong>" : ""}</${tag}>`
        }
        out += `</tr>\n`
        if (isH) { out += `</thead>\n<tbody>\n`; i++ }
        continue
      }
      if (inTable && /^<tr/i.test(l.trim())) { out += l + "\n"; continue }
      if (inTable) { out += `</table>\n`; inTable = false }
      if (/^\d+\.\s/.test(l)) {
        if (!inOl) { out += "<ol>\n"; inOl = true }
        out += `<li>${inline(l.replace(/^\d+\.\s/, ""))}</li>\n`
        continue
      }
      if (inOl) { out += `</ol>\n`; inOl = false }
      if (l.trim() === "") { out += `<br>\n`; continue }
      if (/^</.test(l.trim())) { out += l + "\n"; continue }
      out += `<p>${inline(l)}</p>\n`
    }
    if (inTable) out += `</tbody>\n</table>\n`
    if (inOl) out += `</ol>\n`
    if (inCode) out += `</code></pre>\n`
    return out
  }

  let md = ""
  if (type === "presupuesto-general") {
    md += `<div class="rheader">
  <div class="rheader-inner">
    <div class="rheader-top">
      <div class="rheader-top-left">
        <h1 class="rheader-title"><span class="dc">P</span>RESUPUESTO <span class="dc">G</span>ENERAL</h1>
      </div>
    </div>
    <div class="rheader-divider"></div>
    <div class="rheader-meta">
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Propietario</span>
          <span class="rheader-meta-value">Francisco Javier Rondon Lagos</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">CC</span>
          <span class="rheader-meta-value">4.251.576</span>
        </div>
      </div>
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Direcci\u00f3n</span>
          <span class="rheader-meta-value">Calle 78 B No. 120-49 Bloque 1 Apto 401</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Conjunto</span>
          <span class="rheader-meta-value">Reserva de Granada 3</span>
        </div>
      </div>
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Ubicaci\u00f3n</span>
          <span class="rheader-meta-value">Bogot\u00e1</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Fecha</span>
          <span class="rheader-meta-value">Junio 2026</span>
        </div>
      </div>
    </div>
  </div>
</div>\n\n`
    md += `| Ítem | Actividad | Und | Cant | Vr/Unit | Vr/Total | TOTAL |\n`
    md += `|---|---|---|---|---|---|---|\n`
    for (const ch of chapters) {
      const chItems = items.filter((it) => it.chapter.code === ch.code)
      if (chItems.length === 0) continue
      let chTotal = 0
      for (const it of chItems) {
        const totalQty = it.itemQuantities.reduce((s, q) => s + q.quantity, 0)
        chTotal += (it.apu?.totalPrice ?? 0) * totalQty
      }
      const num = ch.code.replace(/\D/g, "")
      md += `| **C${num.padStart(2, "0")}** | **${ch.title.toUpperCase()}** | | | | | **${cop(chTotal)}** |\n`
      for (const it of chItems) {
        const totalQty = it.itemQuantities.reduce((s, q) => s + q.quantity, 0)
        const apuPrice = it.apu?.totalPrice ?? 0
        const subtotal = apuPrice * totalQty
        md += `| ${it.code} | ${it.description} | ${it.unit.code} | ${Math.round(totalQty * 100) / 100} | ${apuPrice > 0 ? cop(apuPrice) : "-"} | ${subtotal > 0 ? cop(subtotal) : "-"} | |\n`
      }
    }
    md += `<tr class="rtotal"><td></td><td colspan="5"><strong>TOTAL GENERAL</strong></td><td><strong>${cop(pv)}</strong></td></tr>\n`
  } else if (type === "cantidades") {
    md += `<div class="rheader">
  <div class="rheader-inner">
    <div class="rheader-top">
      <div class="rheader-top-left">
        <h1 class="rheader-title"><span class="dc">M</span>EMORIA <span class="dc">D</span>E <span class="dc">C</span>ANTIDADES</h1>
      </div>
    </div>
    <div class="rheader-divider"></div>
    <div class="rheader-meta">
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Propietario</span>
          <span class="rheader-meta-value">Francisco Javier Rondon Lagos</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">CC</span>
          <span class="rheader-meta-value">4.251.576</span>
        </div>
      </div>
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Direcci\u00f3n</span>
          <span class="rheader-meta-value">Calle 78 B No. 120-49 Bloque 1 Apto 401</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Conjunto</span>
          <span class="rheader-meta-value">Reserva de Granada 3</span>
        </div>
      </div>
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Ubicaci\u00f3n</span>
          <span class="rheader-meta-value">Bogot\u00e1</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Fecha</span>
          <span class="rheader-meta-value">Junio 2026</span>
        </div>
      </div>
    </div>
  </div>
</div>\n\n`
    md += `### Dimensiones de Ba\u00f1os\n\n`
    md += `| Ba\u00f1o | Ancho | Largo | \u00c1rea | Per\u00edmetro | Aparatos |\n|---|---|---|---|---|---|\n`
    md += `| Ba\u00f1o 1 | 1.20 | 1.50 | 1.80 m\u00b2 | 5.40 m | Lavamanos + Sanitario |\n`
    md += `| Ba\u00f1o 2 | 1.25 | 2.15 | 2.69 m\u00b2 | 6.80 m | Lavamanos + Sanitario + Ducha |\n`
    md += `| Ba\u00f1o 3 | 1.25 | 2.15 | 2.69 m\u00b2 | 6.80 m | Lavamanos + Sanitario + Ducha |\n\n`
    md += `### C\u00e1lculo de \u00c1reas de Muros\n\n`
    md += `*\u00c1rea neta = (Per\u00edmetro \u00d7 Altura) \u2212 Puerta (0.65\u00d72.00) \u2212 Ventana (0.40\u00d70.40)*\n\n`
    md += `| Ba\u00f1o | Per\u00edmetro | Bruta | \u2212 Puerta | \u2212 Ventana | Neta |\n|---|---|---|---|---|---|\n`
    md += `| Ba\u00f1o 1 | 5.40 m | 11.88 m\u00b2 | 1.30 m\u00b2 | 0.16 m\u00b2 | **10.42 m\u00b2** |\n`
    md += `| Ba\u00f1o 2 | 6.80 m | 14.96 m\u00b2 | 1.30 m\u00b2 | 0.16 m\u00b2 | **13.50 m\u00b2** |\n`
    md += `| Ba\u00f1o 3 | 6.80 m | 14.96 m\u00b2 | 1.30 m\u00b2 | 0.16 m\u00b2 | **13.50 m\u00b2** |\n`
    md += `<tr><td colspan="5"><strong>Total</strong></td><td><strong>37.42 m\u00b2</strong></td></tr>\n\n`
    md += `### Cantidades por Actividad\n\n`
    const cantItems = await prisma.item.findMany({
      include: {
        unit: true,
        itemQuantities: { include: { room: true } },
      },
      orderBy: { code: "asc" },
    })
    const rooms = await prisma.room.findMany({ orderBy: { name: "asc" } })
    md += `<table class="tbl-cant">\n<tr><th>Concepto</th><th>Und</th>`
    for (const room of rooms) md += `<th>${room.name}</th>`
    md += `<th>Total</th></tr>\n`
    for (const it of cantItems) {
      const qs = rooms.map((room) => {
        const q = it.itemQuantities.find((iq) => iq.roomId === room.id)
        return q ? q.quantity : 0
      })
      const total = qs.reduce((s, q) => s + q, 0)
      md += `<tr><td>${it.description}</td><td class="num">${it.unit.code}</td>`
      for (const q of qs) md += `<td class="num">${Number.isInteger(q) ? q : q.toFixed(2)}</td>`
      md += `<td class="num"><strong>${Number.isInteger(total) ? total : total.toFixed(2)}</strong></td></tr>\n`
    }
    md += `</table>\n`
    md += `\n---\n\n`
    md += `### Notas T\u00e9cnicas\n\n`
    md += `1. **Altura de entrepiso:** 2.20 m, est\u00e1ndar en edificaciones de Bogot\u00e1. Todos los c\u00e1lculos de \u00e1rea de muros parten de esta altura.\n`
    md += `2. **Descuentos por vanos:** Puertas (0.65\u00d72.00 m = 1.30 m\u00b2) y ventanas (0.40\u00d70.40 m = 0.16 m\u00b2) descontadas del \u00e1rea bruta de muros para obtener el \u00e1rea neta a enchapar.\n`
    md += `3. **Desperdicio de materiales:** No incluido en los APU. Se recomienda agregar 5\u20138% adicional al comprar porcelanato, pegantes y boquillas para cubrir cortes, roturas y ajustes en obra.\n`
    md += `4. **Grifer\u00eda mezcladora:** Todos los aparatos sanitarios cuentan con suministro de agua fr\u00eda y caliente mediante grifer\u00eda mezcladora. Los ba\u00f1os 2 y 3 incluyen ducha con mezclador y v\u00e1lvula empotrada.\n`
    md += `5. **Cieloraso en drywall:** El techo existente en placa de concreto se reemplaza por cieloraso en drywall con perfiler\u00eda met\u00e1lica galvanizada (canal + omega), placa de yeso de 12.7 mm, masilla en juntas y pintura vinilo tipo 1 anti-hongos (2 manos sobre imprimante).\n`
    md += `6. **Red hidr\u00e1ulica:** Tuber\u00eda PVC para agua fr\u00eda y CPVC para agua caliente, con sus respectivos accesorios, llaves de corte individuales por aparato y prueba de estanquidad obligatoria antes de cerrar muros.\n`
    md += `7. **Red el\u00e9ctrica:** Tuber\u00eda conduit PVC empotrada, cable THHN #12 para circuitos de alumbrado y tomas. Todos los tomas en \u00e1reas h\u00famedas deben ser GFCI (interruptor de falla a tierra). Se incluyen puntos para luminaria LED, aplique sobre espejo y extractor mec\u00e1nico.\n`
    md += `8. **Impermeabilizaci\u00f3n:** Membrana acr\u00edlica en toda la superficie de piso (1.2 kg/m\u00b2) con fieltro geotextil separador. Banda el\u00e1stica impermeabilizante en encuentros muro-piso y sello el\u00e1stico de poliuretano en esquinas y paso de tuber\u00edas.\n`
    md += `9. **Enchapes en porcelanato:** Formato 30\u00d760 cm en muros y 60\u00d760 cm en pisos, instalados con pegante cementoso tipo 1, niveladores de pisos y crucecitas para separaci\u00f3n uniforme. Boquilla ep\u00f3xica en toda la superficie para resistencia a la humedad y hongos.\n`
    md += `10. **Aparatos sanitarios:** Sanitarios tanque bajo (Corona / Sensi Dacqua), lavamanos sobreponer con pedestal (Corona Milano), grifer\u00eda cromada l\u00ednea media. Divisiones de ducha en vidrio templado de 6 mm con perfiler\u00eda de aluminio anodizado.\n`
    md += `11. **Protecci\u00f3n de acabados:** Durante la ejecuci\u00f3n de obras posteriores, los pisos y muros terminados deben protegerse con cart\u00f3n corrugado, pl\u00e1stico o mantas protectoras para evitar da\u00f1os por golpes o derrames.\n`
    md += `12. **Limpieza final:** Incluye retiro de escombros, limpieza general de todos los ba\u00f1os, pulida de grifer\u00eda y accesorios, y revisi\u00f3n final de funcionamiento de todos los aparatos, grifer\u00edas, descargas y puntos el\u00e9ctricos.\n\n`
  } else if (type === "apus") {
    md += `<div class="rheader">
  <div class="rheader-inner">
    <div class="rheader-top">
      <div class="rheader-top-left">
        <h1 class="rheader-title"><span class="dc">A</span>PUS <span class="dc">D</span>ETALLADOS</h1>
      </div>
    </div>
    <div class="rheader-divider"></div>
    <div class="rheader-meta">
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Propietario</span>
          <span class="rheader-meta-value">Francisco Javier Rondon Lagos</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">CC</span>
          <span class="rheader-meta-value">4.251.576</span>
        </div>
      </div>
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Direcci\u00f3n</span>
          <span class="rheader-meta-value">Calle 78 B No. 120-49 Bloque 1 Apto 401</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Conjunto</span>
          <span class="rheader-meta-value">Reserva de Granada 3</span>
        </div>
      </div>
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Ubicaci\u00f3n</span>
          <span class="rheader-meta-value">Bogot\u00e1</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Fecha</span>
          <span class="rheader-meta-value">Junio 2026</span>
        </div>
      </div>
    </div>
  </div>
</div>\n\n`
    md += `---\n\n`

    const chaptersWithItems = await prisma.chapter.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          include: {
            unit: true,
            itemQuantities: { include: { room: true } },
            apu: { include: { unit: true, components: { include: { unit: true } } } },
          },
          orderBy: { code: "asc" },
        },
      },
    })

    const filtered = chaptersWithItems.filter((ch) => ch.items.some((it) => it.apu))

    for (const ch of filtered) {
      const apuItems = ch.items.filter((it) => it.apu)
      const num = ch.code.replace(/\D/g, "")
      md += `## C${num.padStart(2, "0")} — ${ch.title}\n\n`
      for (const it of apuItems) {
        const apu = it.apu!
        const totalQty = it.itemQuantities.reduce((s, q) => s + q.quantity, 0)
        if (isHtml) {
          md += `<div class="apu-card">
  <div class="apu-card-item">
    <span class="apu-card-label">CAP\u00cdTULO</span>
    <span class="apu-card-value">C${num.padStart(2, "0")}</span>
  </div>
  <div class="apu-card-item apu-card-code">
    <span class="apu-card-label">C\u00d3DIGO</span>
    <span class="apu-card-value">${apu.code}</span>
  </div>
  <div class="apu-card-item apu-card-name">
    <span class="apu-card-label">APU</span>
    <span class="apu-card-value">${apu.title}</span>
  </div>
  <div class="apu-card-item apu-card-unit">
    <span class="apu-card-label">UND</span>
    <span class="apu-card-value">${apu.unit.code}</span>
  </div>
  <div class="apu-card-item apu-card-total">
    <span class="apu-card-label">VALOR TOTAL</span>
    <span class="apu-card-value">${cop(apu.totalPrice)}</span>
  </div>
</div>\n\n`
        } else {
          md += `| Cap\u00edtulo | C\u00f3digo | APU | Und | Valor Total |\n|---|---|---|---|---|\n`
          md += `| C${num.padStart(2, "0")} | ${apu.code} | ${apu.title} | ${apu.unit.code} | ${cop(apu.totalPrice)} |\n\n`
        }
        md += `| C\u00f3digo | Insumo | Und | Cant | Vr/Unit | Subtotal | Total |\n|---|---|---|---|---|---|---|\n`
        const catNames: Record<string, string> = { MO: "MANO DE OBRA", MATERIAL: "MATERIALES", EQUIPO: "EQUIPO", TRANSPORT: "TRANSPORTE" }
        for (const cat of ["MO", "MATERIAL", "EQUIPO", "TRANSPORT"] as const) {
          const comps = apu.components.filter((c) => c.category === cat)
          if (comps.length === 0) continue
          const catTotal = comps.reduce((s, c) => s + c.totalCost, 0)
          md += `|  | **${catNames[cat]}** | | | | | **${cop(catTotal)}** |\n`
          for (const c of comps) {
            md += `| ${c.code} | ${c.description} | ${c.unit.code} | ${c.quantity} | ${cop(c.unitPrice || 0)} | ${cop(c.totalCost)} | |\n`
          }
        }
        md += `|  | **TOTAL COSTO DIRECTO** | | | | | **${cop(apu.totalCost)}** |\n`
        md += `|  | **COSTOS INDIRECTOS** | | | | | **${cop(apu.totalPrice - apu.totalCost)}** |\n`
        md += `|  | Administraci\u00f3n (${apu.adminPct}%) | | | | ${cop(apu.adminCost)} | |\n`
        md += `|  | Utilidad (${apu.utilityPct}%) | | | | ${cop(apu.utilityCost)} | |\n`
        md += `|  | IVA (${apu.ivaPct}% s/Utilidad) | | | | ${cop(apu.ivaCost)} | |\n`
        md += `|  | **VALOR TOTAL APU** | | | | | **${cop(apu.totalPrice)}** |\n\n`
        md += `---\n\n`
      }
    }
  } else if (type === "insumos") {
    md += `<div class="rheader">
  <div class="rheader-inner">
    <div class="rheader-top">
      <div class="rheader-top-left">
        <h1 class="rheader-title"><span class="dc">C</span>AT\u00c1LOGO <span class="dc">D</span>E <span class="dc">I</span>NSUMOS</h1>
      </div>
    </div>
    <div class="rheader-divider"></div>
    <div class="rheader-meta">
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Propietario</span>
          <span class="rheader-meta-value">Francisco Javier Rondon Lagos</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">CC</span>
          <span class="rheader-meta-value">4.251.576</span>
        </div>
      </div>
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Direcci\u00f3n</span>
          <span class="rheader-meta-value">Calle 78 B No. 120-49 Bloque 1 Apto 401</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Conjunto</span>
          <span class="rheader-meta-value">Reserva de Granada 3</span>
        </div>
      </div>
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Ubicaci\u00f3n</span>
          <span class="rheader-meta-value">Bogot\u00e1</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Fecha</span>
          <span class="rheader-meta-value">Junio 2026</span>
        </div>
      </div>
    </div>
  </div>
</div>\n\n`
    const allApus = await prisma.aPU.findMany({
      include: {
        components: { include: { unit: true } },
        items: { include: { itemQuantities: true } },
      },
    })
    const compQtyMap = new Map<string, { code: string; description: string; unitCode: string; unitPrice: number; totalQty: number; totalCost: number; totalPrice: number }>()
    for (const apu of allApus) {
      const aiuMult = apu.totalCost > 0 ? apu.totalPrice / apu.totalCost : 1
      const apuTotalQty = apu.items.reduce((s, it) => s + it.itemQuantities.reduce((s2, q) => s2 + q.quantity, 0), 0)
      for (const c of apu.components) {
        const key = `${c.description}|${c.category}`
        const totalCompQty = c.quantity * apuTotalQty
        const totalCompCost = totalCompQty * c.unitPrice
        const totalCompPrice = totalCompCost * aiuMult
        const existing = compQtyMap.get(key)
        if (existing) {
          existing.totalQty += totalCompQty
          existing.totalCost += totalCompCost
          existing.totalPrice += totalCompPrice
        } else {
          compQtyMap.set(key, { code: c.code, description: c.description, unitCode: c.unit.code, unitPrice: c.unitPrice, totalQty: totalCompQty, totalCost: totalCompCost, totalPrice: totalCompPrice })
        }
      }
    }
    const catNames2: Record<string, string> = { MO: "MANO DE OBRA", MATERIAL: "MATERIALES", EQUIPO: "EQUIPO", TRANSPORT: "TRANSPORTE" }
    let grandCD = 0, grandPV = 0
    for (const cat of ["MO", "MATERIAL", "EQUIPO", "TRANSPORT"] as const) {
      const comps = Array.from(compQtyMap.entries())
        .filter(([key]) => key.endsWith(`|${cat}`))
        .map(([, v]) => v)
        .sort((a, b) => a.code.localeCompare(b.code))
      if (comps.length === 0) continue
      const catCD = comps.reduce((s, c) => s + c.totalCost, 0)
      const catPV = comps.reduce((s, c) => s + c.totalPrice, 0)
      grandCD += catCD; grandPV += catPV
      md += `## ${catNames2[cat]}\n\n`
      md += `| C\u00f3digo | Insumo | Und | Cant Total | Vr/Unit | Costo Directo | AIU | Vr/Total |\n|---|---|---|---|---|---|---|---|\n`
      for (const c of comps) {
        md += `| ${c.code} | ${c.description} | ${c.unitCode} | ${Math.round(c.totalQty * 100) / 100} | ${cop(c.unitPrice)} | ${cop(c.totalCost)} | ${cop(c.totalPrice - c.totalCost)} | ${cop(c.totalPrice)} |\n`
      }
      md += `|  | **TOTAL ${catNames2[cat]}** | | | | **${cop(catCD)}** | **${cop(catPV - catCD)}** | **${cop(catPV)}** |\n\n`
    }
    if (isHtml) {
      md += `<table>\n<tr class="rtotal"><td></td><td><strong>TOTAL OBRA</strong></td><td></td><td></td><td></td><td><strong>${cop(grandCD)}</strong></td><td><strong>${cop(grandPV - grandCD)}</strong></td><td><strong>${cop(grandPV)}</strong></td></tr>\n`
    } else {
      md += `|  | **TOTAL OBRA** | | | | **${cop(grandCD)}** | **${cop(grandPV - grandCD)}** | **${cop(grandPV)}** |\n`
    }
  } else if (type === "especificaciones") {
    md += `<div class="rheader">
  <div class="rheader-inner">
    <div class="rheader-top">
      <div class="rheader-top-left">
        <h1 class="rheader-title"><span class="dc">E</span>SPECIFICACIONES <span class="dc">T</span>\u00c9CNICAS</h1>
      </div>
    </div>
    <div class="rheader-divider"></div>
    <div class="rheader-meta">
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Propietario</span>
          <span class="rheader-meta-value">Francisco Javier Rondon Lagos</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">CC</span>
          <span class="rheader-meta-value">4.251.576</span>
        </div>
      </div>
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Direcci\u00f3n</span>
          <span class="rheader-meta-value">Calle 78 B No. 120-49 Bloque 1 Apto 401</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Conjunto</span>
          <span class="rheader-meta-value">Reserva de Granada 3</span>
        </div>
      </div>
      <div class="rheader-meta-group">
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Ubicaci\u00f3n</span>
          <span class="rheader-meta-value">Bogot\u00e1</span>
        </div>
        <div class="rheader-meta-row">
          <span class="rheader-meta-label">Fecha</span>
          <span class="rheader-meta-value">Junio 2026</span>
        </div>
      </div>
    </div>
  </div>
</div>\n\n`

    const specsChapters = await prisma.chapter.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        items: {
          include: { unit: true, apu: { include: { unit: true } } },
          orderBy: { code: "asc" },
        },
      },
    })
    const allUnits = await prisma.unit.findMany()
    const unitMap = Object.fromEntries(allUnits.map(u_ => [u_.id, u_]))

    // ── Detailed specs per APU code ──
    const apuSpecs: Record<string, { norm: string; specs: string[]; medition: string }> = {
      "01.01": {
        norm: "NSR-10 T\u00edtulo I (Supervisi\u00f3n T\u00e9cnica), NTC 1500 (C\u00f3digo de Construcci\u00f3n)",
        specs: [
          "Demolici\u00f3n manual de enchape cer\u00e1mico o porcelanato existente en muros, retirando pieza por pieza desde la parte superior hacia abajo.",
          "No se permite el uso de martillo demoledor el\u00e9ctrico que pueda afectar la estructura del muro. Solo herramienta manual: combo, cortafr\u00edo, pala y cincel.",
          "Eliminar completamente la capa de pegante adherida al muro usando cortafr\u00edo y maceta, hasta dejar la superficie base (ladrillo o bloque) limpia y libre de residuos.",
          "Los escombros se recogen diariamente en bolsas o botes y se transportan al sitio de acopio temporal.",
          "Verificar que no se hayan afectado instalaciones el\u00e9ctricas o hidr\u00e1ulicas empotradas durante el proceso de demolici\u00f3n.",
        ],
        medition: "Se medir\u00e1 el \u00e1rea real de muro demolido en metros cuadrados (m\u00b2), descontando vanos de puertas y ventanas superiores a 1 m\u00b2. El pago incluye el retiro de escombros hasta el sitio de acopio dentro de la obra.",
      },
      "01.02": {
        norm: "NSR-10 T\u00edtulo I, NTC 1500",
        specs: [
          "Demolici\u00f3n manual de piso existente (cer\u00e1mica, porcelanato o granito) en toda el \u00e1rea del ba\u00f1o, incluyendo la capa de mortero de pegamento.",
          "Retirar el material fragment\u00e1ndolo con combo y cortafr\u00edo, desde el centro hacia los bordes para evitar da\u00f1os a los muros perimetrales.",
          "Verificar el estado de la membrana impermeabilizante existente; si est\u00e1 da\u00f1ada, notificar a la supervisi\u00f3n para su reparaci\u00f3n dentro del cap\u00edtulo de impermeabilizaci\u00f3n.",
          "La superficie resultante debe quedar nivelada, sin residuos de pegamento ni mortero, lista para recibir la nueva impermeabilizaci\u00f3n y el porcelanato.",
        ],
        medition: "Se medir\u00e1 el \u00e1rea real de piso demolido en metros cuadrados (m\u00b2). Incluye el retiro de escombros hasta el sitio de acopio.",
      },
      "01.03": {
        norm: "NSR-10 T\u00edtulo I, NTC 1500",
        specs: [
          "Demolici\u00f3n manual del pa\u00f1ete de techo existente en toda el \u00e1rea del ba\u00f1o, hasta dejar expuesta la placa de concreto.",
          "Usar herramienta manual (cincel y maceta) con cuidado de no fisurar la placa de concreto estructural.",
          "Verificar que no haya fisuras estructurales en la placa una vez expuesta. De encontrarse fisuras, reportar a la supervisi\u00f3n para evaluaci\u00f3n estructural.",
          "La superficie debe quedar limpia, sin residuos de pa\u00f1ete sueltos, lista para recibir la perfiler\u00eda del cieloraso en drywall.",
        ],
        medition: "Se medir\u00e1 el \u00e1rea real demolida en metros cuadrados (m\u00b2). Corresponde al \u00e1rea total del techo de cada ba\u00f1o.",
      },
      "01.04": {
        norm: "NSR-10 T\u00edtulo I, NTC 1500",
        specs: [
          "Desconexi\u00f3n y retiro del sanitario existente, incluyendo tanque, taza, asiento y accesorios de fijaci\u00f3n.",
          "Cerrar la llave de corte del sanitario y desconectar la manguera de llenado. Retirar los pernos de fijaci\u00f3n y levantar la taza.",
          "Taponar temporalmente la salida sanitaria de 4\" con un tap\u00f3n expansivo o bolsa pl\u00e1stica para evitar emanaciones de olores y entrada de escombros a la red.",
          "El sanitario retirado se transporta al sitio de acopio para su disposici\u00f3n final.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de sanitario desmontado, incluyendo el taponamiento de la salida sanitaria y el retiro del equipo.",
      },
      "01.05": {
        norm: "NSR-10 T\u00edtulo I, NTC 1500",
        specs: [
          "Desconexi\u00f3n y retiro del lavamanos existente, incluyendo pedestal, grifer\u00eda, sif\u00f3n y accesorios de fijaci\u00f3n.",
          "Cerrar las llaves de corte de agua fr\u00eda y caliente. Desconectar las mangueras flexibles y el sif\u00f3n de descarga.",
          "Retirar el lavamanos y el pedestal despeg\u00e1ndolos del muro con cuidado de no da\u00f1ar la superficie del muro.",
          "Taponar temporalmente las salidas hidr\u00e1ulicas con tapones roscados o cinta para evitar la entrada de escombros.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de lavamanos desmontado, incluyendo grifer\u00eda, pedestal, sif\u00f3n y taponamiento de salidas.",
      },
      "01.06": {
        norm: "NSR-10 T\u00edtulo I, NTC 1500",
        specs: [
          "Desconexi\u00f3n y retiro de la ducha existente, incluyendo brazo, regadera, grifer\u00eda mezcladora y v\u00e1lvula empotrada si aplica.",
          "Cerrar las llaves de corte generales. Desconectar la grifer\u00eda y retirar el brazo y la regadera.",
          "Si la v\u00e1lvula empotrada est\u00e1 en buen estado y se va a reutilizar, protegerla con cinta y pl\u00e1stico. Si no, retirarla completamente.",
          "Taponar las salidas de agua fr\u00eda y caliente con tapones roscados de 1/2\".",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de ducha desmontada, incluyendo grifer\u00eda, v\u00e1lvula, brazo y regadera.",
      },
      "01.07": {
        norm: "NSR-10 T\u00edtulo I",
        specs: [
          "Desmonte de la divisi\u00f3n de vidrio templado existente, incluyendo perfiles de aluminio, bisagras, jaladera y sellos de silicona.",
          "Retirar los sellos de silicona con una cuchilla y desmontar los paneles de vidrio con cuidado de no fracturarlos, especialmente si se van a reutilizar.",
          "Desmontar la perfiler\u00eda de aluminio y las bisagras, guardando el herraje si est\u00e1 en buen estado.",
          "Los paneles de vidrio se almacenan verticalmente en un sitio seguro, apoyados sobre madera para evitar roturas.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de divisi\u00f3n desmontada, incluyendo todos sus componentes.",
      },
      "01.08": {
        norm: "NSR-10 T\u00edtulo I",
        specs: [
          "Desmonte de todos los accesorios de ba\u00f1o existentes: toallero, portarrollos, jabonera, ganchos, espejo, cortinero y cortina.",
          "Retirar cada accesorio desatornill\u00e1ndolo del muro. Si est\u00e1 pegado con adhesivo, separarlo con cuidado usando una esp\u00e1tula.",
          "Clasificar los accesorios que puedan reutilizarse y almacenarlos en una caja rotulada. Los accesorios en mal estado se descartan.",
          "Rellenar los huecos dejados por los tacos de fijaci\u00f3n con masilla o estuco para dejar el muro listo para pintura o enchape.",
        ],
        medition: "Se pagar\u00e1 como global (gl) por el desmonte de todos los accesorios de un ba\u00f1o.",
      },
      "01.09": {
        norm: "RETIE, NTC 2050",
        specs: [
          "Desconexi\u00f3n y retiro de luminarias, tomas, apagadores y placas existentes en el ba\u00f1o.",
          "Antes de manipular, cortar la energ\u00eda el\u00e9ctrica desde el tablero general y verificar ausencia de tensi\u00f3n con un probador de voltaje.",
          "Identificar y marcar los cables con cinta de colores (fase, neutro, tierra) para su posterior conexi\u00f3n. Tomar fotograf\u00edas de referencia.",
          "Los cables existentes que se reutilicen deben quedar debidamente aislados con cinta aislante y protegidos dentro de cajas de paso.",
          "Retirar las cajas octogonales y rectangulares solo si est\u00e1n da\u00f1adas; si est\u00e1n en buen estado, pueden reutilizarse.",
        ],
        medition: "Se pagar\u00e1 por punto el\u00e9ctrico (pto) desmontado, incluyendo la identificaci\u00f3n y protecci\u00f3n de los cables existentes.",
      },
      "01.10": {
        norm: "NSR-10 T\u00edtulo I, NTC 1500",
        specs: [
          "Desmonte de la puerta existente del ba\u00f1o, incluyendo hoja, marco, bisagras y cerradura.",
          "Retirar la hoja de la puerta desmontando las bisagras. Luego retirar el marco cortando los anclajes al muro con una tool de corte.",
          "Extraer la cerradura y las bisagras, clasificando el herraje que pueda reutilizarse.",
          "El marco retirado se descarta; la hoja puede reutilizarse si est\u00e1 en buen estado, de lo contrario se descarta.",
          "Verificar que el vano de la puerta no haya sufrido da\u00f1os estructurales durante el desmonte.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de puerta desmontada, incluyendo marco, hoja, bisagras y cerradura.",
      },
      "01.11": {
        norm: "NTC-ISO 9001",
        specs: [
          "Cargue manual de todos los escombros generados en el proceso de demolici\u00f3n y desmonte dentro del ba\u00f1o, en bolsas o botes especiales.",
          "Los escombros se transportan desde el interior del ba\u00f1o hasta el sitio de acopio temporal (contenedor o bote ubicado en \u00e1rea com\u00fan).",
          "No mezclar escombros de obra con residuos ordinarios. Clasificar si es posible: escombros de enchape, pa\u00f1ete, aparatos sanitarios, etc.",
          "Mantener el \u00e1rea de trabajo limpia y despejada durante todo el proceso. Al final de cada jornada, el \u00e1rea debe quedar libre de escombros.",
        ],
        medition: "Se pagar\u00e1 como global (gl) por el cargue y retiro de todos los escombros generados en los trabajos del cap\u00edtulo 1.",
      },
      "01.12": {
        norm: "Decreto 1077 de 2015 (Gesti\u00f3n de Residuos de Construcci\u00f3n y Demolici\u00f3n)",
        specs: [
          "Transporte de escombros desde el sitio de acopio temporal hasta la escombrera autorizada mediante volqueta o cami\u00f3n debidamente registrado.",
          "Los escombros deben cubrirse con lona durante el transporte para evitar dispersi\u00f3n de polvo y ca\u00edda de material en la v\u00eda p\u00fablica.",
          "La disposici\u00f3n final debe realizarse exclusivamente en escombreras autorizadas por la Secretar\u00eda Distrital de Ambiente.",
          "Entregar al contratista el certificado de disposici\u00f3n final emitido por la escombrera autorizada.",
        ],
        medition: "Se medir\u00e1 el volumen de escombros transportado en metros c\u00fabicos (m\u00b3), incluyendo cargue, transporte y disposici\u00f3n final certificada.",
      },
      "01.13": {
        norm: "NSR-10 T\u00edtulo I",
        specs: [
          "Desmonte de la ventana existente en el ba\u00f1o, incluyendo marco, hojas, vidrio, bisagras y jaladera.",
          "Retirar la ventana completa desanci\u00e1ndola del muro. Si el marco est\u00e1 embebido, cortar los anclajes con herramienta manual.",
          "El vidrio debe retirarse con cuidado para evitar roturas que puedan causar accidentes. Usar guantes de seguridad.",
          "Sellar la abertura temporalmente con pl\u00e1stico o triplex si la nueva ventana no se instala de inmediato.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de ventana desmontada, incluyendo marco, vidrio y herrajes.",
      },
      "01.14": {
        norm: "NSR-10 T\u00edtulo I",
        specs: [
          "Desmonte del mes\u00f3n de m\u00e1rmol existente, retirando la placa de m\u00e1rmol y la estructura de soporte o mortero de pegamento.",
          "Retirar la placa de m\u00e1rmol con cuidado, despeg\u00e1ndola del mortero con cincel y maceta desde los bordes.",
          "Si la placa est\u00e1 en buen estado y se va a reutilizar, almacenarla verticalmente sobre madera en un sitio seguro.",
          "Si se descarta, fragmentar en piezas manejables y retirar junto con el mortero de pegamento adherido a la superficie de apoyo.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de mes\u00f3n desmontado, incluyendo el retiro del mortero de pegamento.",
      },
      "02.01/02.06": {
        norm: "RAS 2000 T\u00edtulo B (Sistemas de Acueducto), NTC 1337 (Tuber\u00eda PVC), NTC 541 (Tuber\u00eda CPVC)",
        specs: [
          "Instalaci\u00f3n completa de punto hidr\u00e1ulico incluyendo tuber\u00eda PVC para agua fr\u00eda (RDE 21, 200 PSI, di\u00e1metro 1/2\") y tuber\u00eda CPVC para agua caliente (100 PSI a 82\u00b0C, di\u00e1metro 1/2\").",
          "Incluye tuber\u00eda desde la red general hasta el punto de salida (lavamanos, sanitario o ducha), con un recorrido m\u00e1ximo de 2 ml por punto.",
          "Todos los accesorios (codos, tees, uniones, adaptadores) deben ser del mismo material de la tuber\u00eda. Las uniones se realizan con cemento solvente y limpiador.",
          "Los cambios de direcci\u00f3n deben hacerse \u00fanicamente con codos. No se permite doblar la tuber\u00eda.",
          "Se instala llave de corte tipo esf\u00e9rica de 1/2\" en cada punto de salida, accesible para mantenimiento.",
          "Las tuber\u00edas deben empotrarse en muros o losas respetando las distancias m\u00ednimas a tuber\u00edas el\u00e9ctricas (m\u00ednimo 30 cm de separaci\u00f3n).",
        ],
        medition: "Se pagar\u00e1 por punto (pto) hidr\u00e1ulico instalado y probado, incluyendo tuber\u00eda de agua fr\u00eda y caliente, accesorios, llave de corte y prueba de estanquidad.",
      },
      "02.07": {
        norm: "RAS 2000 T\u00edtulo B, NTC 1533 (V\u00e1lvulas)",
        specs: [
          "Instalaci\u00f3n de v\u00e1lvula de corte tipo esf\u00e9rica de 1/2\" en cada punto de salida hidr\u00e1ulico (lavamanos, sanitario, ducha).",
          "La v\u00e1lvula debe instalarse en un punto accesible para mantenimiento, preferiblemente empotrada en muro con registro o sobre muro acabado.",
          "Las conexiones se realizan con adaptadores roscados y cinta tefl\u00f3n, verificando la estanquidad de la rosca.",
          "La v\u00e1lvula debe permitir el corte individual del suministro de agua a cada aparato sanitario sin afectar los dem\u00e1s puntos.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de v\u00e1lvula instalada, incluyendo accesorios de conexi\u00f3n.",
      },
      "02.08": {
        norm: "RAS 2000 T\u00edtulo B, NTC 1337",
        specs: [
          "Prueba hidrost\u00e1tica de toda la red hidr\u00e1ulica instalada, antes del cierre de muros y pa\u00f1etes.",
          "La prueba se realiza a 1.5 veces la presi\u00f3n de trabajo de la red (m\u00ednimo 100 PSI) durante 30 minutos continuos.",
          "Se utiliza bomba de prueba manual con man\u00f3metro calibrado, adaptadores y tapones para sellar todas las salidas.",
          "No se permite ninguna fuga en las uniones, accesorios o v\u00e1lvulas durante el tiempo de prueba.",
          "Proteger los puntos el\u00e9ctricos cercanos de la humedad durante la prueba. Verificar que no haya ca\u00edda de presi\u00f3n en el man\u00f3metro.",
          "Al finalizar la prueba exitosa, liberar la presi\u00f3n gradualmente y dejar la red lista para su conexi\u00f3n a los aparatos sanitarios.",
        ],
        medition: "Se pagar\u00e1 como global (gl) por la prueba de estanquidad de toda la red hidr\u00e1ulica de un ba\u00f1o.",
      },
      "03.01/03.06": {
        norm: "RETIE (Reglamento T\u00e9cnico de Instalaciones El\u00e9ctricas), NTC 2050 (C\u00f3digo El\u00e9ctrico Colombiano)",
        specs: [
          "Instalaci\u00f3n completa de punto el\u00e9ctrico incluyendo tuber\u00eda conduit PVC liviano de 1/2\" empotrada, cable THHN/THWN calibre #12 AWG, caja octogonal o rectangular, dispositivo (toma GFCI, apagador, plaf\u00f3n) y placa decorativa.",
          "La tuber\u00eda conduit se instala empotrada en muros y losas con un recorrido m\u00e1ximo de 3 ml por punto. Fijar con alambre galvanizado antes del pa\u00f1ete.",
          "El cableado se ejecuta con cable de cobre THHN/THWN calibre #12 AWG para circuitos derivados. Todos los empalmes deben realizarse dentro de cajas de paso debidamente selladas.",
          "No se permiten empalmes por fuera de cajas. Los cables deben identificarse por color (fase: negro o rojo, neutro: blanco, tierra: verde).",
          "Las tuber\u00edas el\u00e9ctricas deben mantenerse separadas de tuber\u00edas hidr\u00e1ulicas por un m\u00ednimo de 30 cm.",
          "Instalar un toma GFCI por cada ba\u00f1o con protecci\u00f3n diferencial de 5 mA, aguas abajo del cual pueden conectarse otros tomas protegidos.",
        ],
        medition: "Se pagar\u00e1 por punto (pto) el\u00e9ctrico instalado y probado, incluyendo tuber\u00eda, cableado, caja, dispositivo, placa y pruebas el\u00e9ctricas.",
      },
      "03.07": {
        norm: "RETIE, NTC 2050",
        specs: [
          "Cableado general, tuber\u00edas conduit, cajas de paso y pruebas el\u00e9ctricas de todos los puntos instalados en el ba\u00f1o.",
          "Incluye el tendido de cable THHN #12 desde el tablero general hasta cada punto, pasando por cajas de paso.",
          "Las cajas de paso deben quedar accesibles y debidamente selladas con sus tapas.",
          "Una vez instalado todo el cableado, realizar pruebas de continuidad en todos los circuitos con un mult\u00edmetro.",
          "Realizar prueba de aislamiento (megger a 500V) entre conductores y entre conductores y tierra. La resistencia de aislamiento debe ser superior a 1 M\u03a9.",
          "Verificar la polaridad correcta en todos los tomas (fase a la izquierda, neutro a la derecha, tierra al centro inferior).",
        ],
        medition: "Se pagar\u00e1 como global (gl) por el cableado, tuber\u00edas, cajas y pruebas de todos los puntos el\u00e9ctricos de un ba\u00f1o.",
      },
      "04.01": {
        norm: "NSR-10 T\u00edtulo D (Mamposter\u00eda Estructural), NTC 121 (Cemento Portland)",
        specs: [
          "Preparaci\u00f3n de superficie: Humedecer la superficie del muro antes de aplicar el pa\u00f1ete para evitar la absorci\u00f3n r\u00e1pida del agua de la mezcla.",
          "Aplicar puente de adherencia (lechada de cemento) en superficies lisas o con pintura existente para garantizar la adhesi\u00f3n del mortero.",
          "Mortero de pa\u00f1ete en proporci\u00f3n 1:4 (cemento:arena) con adici\u00f3n de cal hidratada al 10% del volumen de cemento para mejorar la trabajabilidad y plasticidad.",
          "Espesor m\u00ednimo 15 mm y m\u00e1ximo 25 mm. Aplicar en dos capas: la primera de raspeo (para nivelar) y la segunda de acabado (para alisar).",
          "Verificar la planeidad con regla de aluminio de 2 m. Tolerancia m\u00e1xima de 3 mm en 2 m. Las esquinas deben quedar a 90\u00b0 con tolerancia de 2 mm.",
          "Curado: Mantener la superficie h\u00fameda durante los primeros 7 d\u00edas posteriores a la aplicaci\u00f3n, humedeciendo 3 veces al d\u00eda para evitar fisuras por retracci\u00f3n.",
        ],
        medition: "Se medir\u00e1 el \u00e1rea neta de muro pa\u00f1etado en metros cuadrados (m\u00b2), descontando vanos de puertas y ventanas superiores a 1 m\u00b2.",
      },
      "05.01": {
        norm: "NTC 5618 (Placas de Yeso), ASTM C1396 (Standard Specification for Gypsum Board)",
        specs: [
          "Instalaci\u00f3n de perfiler\u00eda met\u00e1lica de acero galvanizado calibre 26 (0.46 mm) tipo canal perimetral y omega de suspensi\u00f3n.",
          "Separaci\u00f3n m\u00e1xima entre perfiles omega de 610 mm (centro a centro). Anclaje a la losa superior cada 1.20 m con tacos expansivos y tornillos autoperforantes.",
          "No anclar directamente la perfiler\u00eda a la placa existente; usar suspensores regulables de acero galvanizado para nivelar el cieloraso.",
          "Instalaci\u00f3n de placa de yeso est\u00e1ndar de 12.7 mm (1/2\") para ambientes secos. Fijaci\u00f3n con tornillos autorroscantes tipo drywall cada 300 mm en bordes y 400 mm en centro.",
          "Las placas deben quedar traslapadas en las juntas (a medio pa\u00f1o) para evitar juntas continuas.",
          "Masillado de juntas: Aplicar cinta de papel para juntas embebida en masilla joint compound en todas las uniones. Aplicar m\u00ednimo dos capas de masilla, dejando secar 24 horas entre capas.",
          "Lijar suavemente entre capas para eliminar imperfecciones. La superficie final debe quedar completamente lisa y lista para pintura.",
        ],
        medition: "Se medir\u00e1 el \u00e1rea de cieloraso instalado en metros cuadrados (m\u00b2), incluyendo perfiler\u00eda, placa, masillado y lijado.",
      },
      "05.02": {
        norm: "NTC 5618, NTC 1330 (Pinturas Vin\u00edlicas)",
        specs: [
          "Aplicaci\u00f3n de una mano de imprimante sellador para drywall en toda la superficie del cieloraso. Dejar secar seg\u00fan especificaciones del fabricante (m\u00ednimo 4 horas).",
          "Aplicaci\u00f3n de dos manos de pintura vinilo tipo 1 anti-hongos, apta para ambientes h\u00famedos como ba\u00f1os.",
          "Rendimiento m\u00ednimo de 10 m\u00b2/gal\u00f3n por mano. La pintura anti-hongos debe contener aditivos fungicidas y bactericidas.",
          "Aplicar con rodillo de felpa corta para acabado liso, en capas uniformes y cruzadas (primera mano horizontal, segunda vertical).",
          "Entre manos, dejar secar m\u00ednimo 4 horas o seg\u00fan recomendaci\u00f3n del fabricante. No aplicar la segunda mano si la primera no est\u00e1 completamente seca.",
          "Proteger muros, pisos y accesorios con pl\u00e1stico y cinta de enmascarar durante la aplicaci\u00f3n.",
        ],
        medition: "Se medir\u00e1 el \u00e1rea pintada en metros cuadrados (m\u00b2), incluyendo imprimante, dos manos de pintura anti-hongos y protecci\u00f3n de superficies.",
      },
      "06.01": {
        norm: "NTC 3184 (Membranas L\u00edquidas), ASTM D6083 (Standard Specification for Liquid Applied Acrylic Coating)",
        specs: [
          "Preparaci\u00f3n de superficie: La superficie debe estar limpia, seca, libre de polvo, grasa y part\u00edculas sueltas. Reparar fisuras y grietas con mortero de reparaci\u00f3n polim\u00e9rico.",
          "Los \u00e1ngulos entre muro y piso deben redondearse con mortero (curva sanitaria de radio m\u00ednimo 2 cm) para evitar acumulaci\u00f3n de membrana y garantizar continuidad.",
          "Aplicaci\u00f3n de membrana acr\u00edlica impermeabilizante en dos capas cruzadas, con un consumo m\u00ednimo de 1.2 kg/m\u00b2 por capa.",
          "La primera capa debe diluirse 10% con agua para mejorar la penetraci\u00f3n en la superficie. Dejar secar m\u00ednimo 6 horas entre capas.",
          "Colocar fieltro geotextil no tejido de 200 g/m\u00b2 sobre la primera capa de membrana fresca en los encuentros muro-piso y en toda el \u00e1rea de piso.",
          "Prueba de impermeabilidad: Una vez fraguada la membrana (24 horas), realizar prueba de inundaci\u00f3n con 2 cm de agua durante 24 horas.",
          "Verificar que no haya p\u00e9rdidas hacia los espacios inferiores. Si se detectan fugas, reparar y repetir la prueba.",
        ],
        medition: "Se medir\u00e1 el \u00e1rea impermeabilizada en metros cuadrados (m\u00b2), incluyendo preparaci\u00f3n, membrana acr\u00edlica, fieltro geotextil y prueba de inundaci\u00f3n.",
      },
      "06.02": {
        norm: "NTC 3184, ASTM D6083",
        specs: [
          "Aplicaci\u00f3n de banda el\u00e1stica impermeabilizante de 10 cm de ancho en todos los encuentros muro-piso y alrededor de los pasos de tuber\u00edas.",
          "La banda el\u00e1stica se instala sobre la primera capa de membrana acr\u00edlica fresca, presionando firmemente para asegurar la adhesi\u00f3n.",
          "En los pasos de tuber\u00edas, la banda se corta en forma de cruz y se adhiere alrededor del tubo, sellando completamente el encuentro.",
          "Sellar los bordes de la banda con sello el\u00e1stico de poliuretano, aplicado con pistola calafatera en cord\u00f3n continuo.",
          "El sello debe alisarse con una esp\u00e1tula humedecida en agua jabonosa para garantizar un acabado uniforme y sin burbujas.",
        ],
        medition: "Se medir\u00e1 la longitud lineal de encuentro muro-piso tratado en metros lineales (ml), incluyendo banda el\u00e1stica, sello de poliuretano y alrededor de tuber\u00edas.",
      },
      "07.01": {
        norm: "NTC 4321 (Baldosas Cer\u00e1micas), ASTM C1028 (Coeficiente de Fricci\u00f3n), ANSI A137.1 (Ceramic Tile), ISO 13007",
        specs: [
          "Instalaci\u00f3n de porcelanato en muros formato 30\u00d760 cm con pegante cementoso tipo 1 (C1) seg\u00fan norma ISO 13007.",
          "Aplicar pegante con llana dentada de 8 mm tanto en el muro como en el dorso de la pieza (doble encolado) para garantizar una adhesi\u00f3n del 100%.",
          "Separaci\u00f3n entre piezas con crucecitas de 2 mm. Sistema de nivelaci\u00f3n con clips y cu\u00f1as para garantizar una superficie plana continua sin escalonamientos.",
          "Rendimiento de pegante: 3 kg/m\u00b2. Tiempo abierto m\u00e1ximo del pegante: 20 minutos. No aplicar pegante en \u00e1reas mayores a las que se puedan instalar en ese tiempo.",
          "Los cortes deben realizarse con cortadora de porcelanato de disco diamantado con refrigeraci\u00f3n de agua. No se permiten cortes con cortadora manual de palanca.",
          "Los bordes cortados deben quedar perfectamente rectos y sin astilladuras. Las piezas cortadas se instalan en los extremos y esquinas.",
        ],
        medition: "Se medir\u00e1 el \u00e1rea neta de muro enchapado en metros cuadrados (m\u00b2), descontando vanos. Incluye porcelanato, pegante, niveladores, corte e instalaci\u00f3n.",
      },
      "07.02": {
        norm: "NTC 4321, ANSI A137.1, ISO 13007",
        specs: [
          "Instalaci\u00f3n de porcelanato en pisos formato 60\u00d760 cm con pegante cementoso tipo 2 (C2) de alta resistencia.",
          "Aplicar pegante con llana dentada de 10 mm en el piso y en el dorso de la pieza. Sistema de doble encolado y nivelaci\u00f3n obligatorio.",
          "Separaci\u00f3n entre piezas con crucecitas de 3 mm. Los pisos deben quedar con pendiente m\u00ednima del 1% hacia el desag\u00fce.",
          "Verificar la nivelaci\u00f3n con nivel de burbuja de 1 m. La tolerancia m\u00e1xima es de 2 mm en 1 m.",
          "No transitar sobre el piso instalado durante las primeras 48 horas. No aplicar carga pesada durante 7 d\u00edas.",
        ],
        medition: "Se medir\u00e1 el \u00e1rea de piso instalado en metros cuadrados (m\u00b2), incluyendo porcelanato, pegante, niveladores, corte e instalaci\u00f3n con pendiente.",
      },
      "07.03": {
        norm: "NTC 4321",
        specs: [
          "Instalaci\u00f3n de guardaescoba en porcelanato o aluminio en el encuentro muro-piso, con una altura de 2.5 cm.",
          "El guardaescoba se instala con pegante de alta resistencia tipo adhesivo de contacto o pegante cementoso, asegurando la adhesi\u00f3n completa.",
          "Las uniones entre piezas de guardaescoba deben hacerse a 45\u00b0 (inglete) para un acabado est\u00e9tico profesional.",
          "Sellar los extremos del guardaescoba con silicona sanitaria transparente para evitar la entrada de agua.",
          "El guardaescoba debe quedar perfectamente alineado con el nivel del piso terminado y el muro enchapado.",
        ],
        medition: "Se medir\u00e1 la longitud lineal instalada en metros lineales (ml), incluyendo guardaescoba, pegante, ingletes y silicona.",
      },
      "07.04": {
        norm: "NTC 4321, ASTM C1028",
        specs: [
          "Aplicaci\u00f3n de boquilla ep\u00f3xica en todas las juntas de porcelanato (muros y pisos), despu\u00e9s de 48 horas de instalado el porcelanato.",
          "La boquilla ep\u00f3xica es resistente a la humedad, hongos, productos de limpieza y no se decolora con el tiempo. Es obligatoria en ba\u00f1os.",
          "Rendimiento: 0.2 kg/m\u00b2 para junta de 2 mm en muros y 3 mm en pisos. Aplicar con llana de goma dura en diagonal a las juntas.",
          "Limpiar el exceso de boquilla con esponja h\u00fameda antes de que frague (dentro de los primeros 15 minutos). No dejar residuos sobre la superficie del porcelanato.",
          "Pulir la superficie con pa\u00f1o seco una vez que la boquilla haya fraguado (aproximadamente 30 minutos).",
        ],
        medition: "Se medir\u00e1 el \u00e1rea total de porcelanato con boquilla aplicada en metros cuadrados (m\u00b2), incluyendo muros y pisos.",
      },
      "08.01": {
        norm: "NTC 179 (Aparatos Sanitarios de Cer\u00e1mica)",
        specs: [
          "Suministro e instalaci\u00f3n de sanitario de tanque bajo en porcelana vitrificada color blanco, con sistema de descarga de doble pulsador (3/6 litros).",
          "Incluye asiento tapa con ca\u00edda suave (cierre lento), mecanismo de descarga interno y kit de fijaci\u00f3n al piso.",
          "Instalaci\u00f3n sobre el piso terminado. Distancia m\u00ednima al muro lateral: 30 cm. Salida al piso est\u00e1ndar de 4\".",
          "La conexi\u00f3n a la salida sanitaria se realiza con anillo de cera y empaques. La base se sella perimetralmente con silicona sanitaria.",
          "Conexi\u00f3n de la manguera de llenado a la llave de corte de 1/2\" con empaque de neopreno. Verificar que no haya fugas en la conexi\u00f3n.",
          "Ajustar el nivel de agua del tanque seg\u00fan especificaciones del fabricante (generalmente a la marca indicada en el interior del tanque).",
          "Realizar prueba de descarga y llenado: verificar que el doble pulsador funcione correctamente (3L y 6L) y que no haya fugas.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de sanitario suministrado e instalado, incluyendo todos los accesorios, conexiones y prueba de funcionamiento.",
      },
      "08.02": {
        norm: "NTC 179 (Aparatos Sanitarios de Cer\u00e1mica)",
        specs: [
          "Suministro e instalaci\u00f3n de lavamanos sobreponer con pedestal en porcelana vitrificada color blanco, dimensi\u00f3n m\u00ednima 50\u00d740 cm.",
          "Instalaci\u00f3n a una altura de 85 cm desde el nivel del piso terminado hasta el borde superior del lavamanos.",
          "Fijaci\u00f3n al muro con anclajes met\u00e1licos expansivos (tacos y tornillos de 1/4\") en m\u00ednimo 2 puntos. El pedestal se fija al piso con silicona.",
          "Incluye sif\u00f3n cromado de 1 1/4\" con salida a pared, conexi\u00f3n a la red de desag\u00fce y empaques de neopreno.",
          "Conexi\u00f3n de las mangueras flexibles de 1/2\" a las llaves de \u00e1ngulo cromadas. Verificar estanquidad de todas las conexiones.",
          "Sellar el encuentro del lavamanos con el muro con silicona sanitaria transparente. Sellar la base del pedestal contra el piso.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de lavamanos suministrado e instalado, incluyendo pedestal, sif\u00f3n, conexiones y silicona.",
      },
      "08.03": {
        norm: "NTC 2186 (Grifer\u00eda para Ba\u00f1o)",
        specs: [
          "Suministro e instalaci\u00f3n de grifer\u00eda cromada tipo mezcladora monocomando para lavamanos, con aireador y flexibles de 1/2\".",
          "Incluye llaves de \u00e1ngulo cromadas de 1/2\" para conexi\u00f3n a la red de agua fr\u00eda y caliente.",
          "Conexi\u00f3n con cinta tefl\u00f3n en todas las roscas para garantizar estanquidad. No apretar en exceso para no da\u00f1ar las empaques.",
          "Verificar el funcionamiento del monocomando: apertura y cierre suave, mezcla correcta de agua fr\u00eda y caliente, caudal adecuado.",
          "Limpiar el aireador despu\u00e9s de la instalaci\u00f3n para retirar residuos que puedan haber ingresado a la tuber\u00eda durante el montaje.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de grifer\u00eda suministrada e instalada, incluyendo llaves de \u00e1ngulo, flexibles y conexiones.",
      },
      "08.04": {
        norm: "NTC 2186 (Grifer\u00eda para Ba\u00f1o)",
        specs: [
          "Suministro e instalaci\u00f3n de grifer\u00eda mezcladora para sanitario tipo ducha higi\u00e9nica, con manguera y rociador de mano.",
          "Conexi\u00f3n a la red de agua fr\u00eda y caliente mediante flexibles de 1/2\" y llaves de \u00e1ngulo cromadas.",
          "Instalaci\u00f3n del soporte de pared para el rociador a una altura de 80 cm desde el nivel del piso terminado.",
          "Verificar que la manguera del rociador tenga la longitud suficiente (m\u00ednimo 1.20 m) para alcanzar c\u00f3modamente el \u00e1rea del sanitario.",
          "Probar el funcionamiento: apertura y cierre, temperatura de mezcla, caudal del rociador. Verificar que no haya fugas en las conexiones.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de grifer\u00eda suministrada e instalada, incluyendo rociador, manguera, soporte y conexiones.",
      },
      "08.05": {
        norm: "NTC 2186 (Grifer\u00eda para Ba\u00f1o)",
        specs: [
          "Suministro e instalaci\u00f3n de grifer\u00eda cromada tipo mezcladora para ducha, con cuerpo de v\u00e1lvula empotrada (instalado dentro del muro).",
          "El cuerpo de la v\u00e1lvula debe instalarse a 1.20 m desde el nivel del piso terminado, perfectamente nivelado y aplomado.",
          "Las conexiones a la red de agua fr\u00eda y caliente se realizan con adaptadores roscados de 1/2\" y cinta tefl\u00f3n.",
          "Despu\u00e9s de instalar el cuerpo de la v\u00e1lvula, tapar las salidas con protectores para evitar la entrada de mortero o pa\u00f1ete durante el enchape.",
          "Una vez terminado el enchape, instalar los mandos (manija o volante) y el embellecedor cromado.",
          "Verificar el funcionamiento: apertura y cierre suave, mezcla correcta de temperaturas, caudal adecuado.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de grifer\u00eda suministrada e instalada, incluyendo v\u00e1lvula empotrada, mandos y embellecedor.",
      },
      "08.06": {
        norm: "NTC 2186",
        specs: [
          "Suministro e instalaci\u00f3n de v\u00e1lvula empotrada para ducha, incluyendo cuerpo de v\u00e1lvula, cartucho cer\u00e1mico y conexiones de 1/2\".",
          "La v\u00e1lvula se instala empotrada en el muro a una altura de 1.20 m desde el piso terminado.",
          "Conexi\u00f3n a las tuber\u00edas de agua fr\u00eda y caliente con adaptadores roscados de 1/2\" y cinta tefl\u00f3n.",
          "Proteger el interior de la v\u00e1lvula con un tap\u00f3n pl\u00e1stico durante los trabajos de pa\u00f1ete y enchape.",
          "Una vez terminados los acabados, instalar el cartucho cer\u00e1mico, el embellecedor y la manija.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de v\u00e1lvula suministrada e instalada, incluyendo cuerpo, cartucho, embellecedor y manija.",
      },
      "08.07": {
        norm: "NTC 2186",
        specs: [
          "Suministro e instalaci\u00f3n de brazo de ducha cromado de 30 cm de longitud, regadera tipo lluvia de 20 cm de di\u00e1metro y enlace universal.",
          "El brazo de ducha se conecta a la salida de la v\u00e1lvula empotrada mediante el enlace universal con empaque de neopreno.",
          "La regadera tipo lluvia debe tener boquillas de silicona anti-calc\u00e1reo para facilitar la limpieza.",
          "Verificar la estanquidad de la conexi\u00f3n entre el brazo y la v\u00e1lvula. La regadera debe quedar a una altura m\u00ednima de 2.00 m desde el piso terminado.",
          "Ajustar la direcci\u00f3n de la regadera para que el chorro caiga verticalmente en el centro del \u00e1rea de ducha.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de conjunto brazo + regadera suministrado e instalado, incluyendo enlace y empaques.",
      },
      "08.08": {
        norm: "NTC 2186",
        specs: [
          "Suministro e instalaci\u00f3n de sif\u00f3n para lavamanos tipo botella en PVC cromado de 1 1/4\", con salida a pared.",
          "El sif\u00f3n se conecta al desag\u00fce del lavamanos por la parte superior y a la salida de pared por la parte inferior.",
          "Incluye empaques de neopreno en todas las uniones para garantizar la estanquidad. Apretar las tuercas manualmente m\u00e1s 1/4 de vuelta con herramienta.",
          "El sif\u00f3n debe quedar accesible para limpieza y mantenimiento. Debe tener registro inferior desmontable para facilitar la limpieza.",
          "Verificar que no haya fugas en ninguna de las uniones realizando una prueba de llenado y vaciado del lavamanos.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de sif\u00f3n suministrado e instalado, incluyendo todas las conexiones y empaques.",
      },
      "08.09": {
        norm: "NTC 1522 (Vidrio para Construcci\u00f3n)",
        specs: [
          "Suministro e instalaci\u00f3n de divisi\u00f3n en vidrio templado de 6 mm de espesor, con cantos pulidos y biselados.",
          "Incluye perfiler\u00eda de aluminio anodizado natural o blanco, bisagras de pivote de acero inoxidable, jaladera de acero inoxidable y sello de silicona.",
          "El vidrio templado debe cumplir con la norma NTC 1522 y estar certificado t\u00e9rmicamente. No se acepta vidrio laminado o crudo.",
          "Altura m\u00ednima de la divisi\u00f3n: 1.90 m. El ancho se define seg\u00fan el espacio disponible (m\u00ednimo 0.70 m, m\u00e1ximo 0.90 m).",
          "Instalaci\u00f3n con perfiler\u00eda de aluminio anclada al muro y al piso con tacos expansivos. El vidrio se inserta en la perfiler\u00eda y se sella con silicona.",
          "Las bisagras de pivote permiten la apertura de la puerta en ambos sentidos. La jaladera se instala en la parte exterior del vidrio.",
          "Verificar que la puerta abra y cierre correctamente, sin fricci\u00f3n y que el sello de silicona sea continuo en todo el per\u00edmetro.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de divisi\u00f3n suministrada e instalada, incluyendo vidrio templado, perfiler\u00eda, bisagras, jaladera y sellado.",
      },
      "09.01": {
        norm: "NTC 771 (Puertas de Madera)",
        specs: [
          "Reparaci\u00f3n y ajuste de la puerta existente del ba\u00f1o: revisar el estado de la hoja, el marco y los herrajes.",
          "Ajustar las bisagras para que la puerta abra y cierre correctamente, sin rozar el marco ni el piso.",
          "Lijar la superficie de la puerta para eliminar imperfecciones, grietas y desconchones de pintura.",
          "Aplicar masilla para madera en grietas y perforaciones, dejar secar y lijar nuevamente hasta dejar la superficie lisa.",
          "Pintar la puerta con esmalte o vinilo apto para interiores, aplicando una mano de imprimante y dos manos de acabado.",
          "El marco debe quedar perfectamente escuadrado y nivelado. Verificar la escuadra con nivel de burbuja.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de puerta reparada y ajustada, incluyendo masillado, lijado y pintura.",
      },
      "09.02": {
        norm: "NTC 2500 (Cerrajer\u00eda)",
        specs: [
          "Cambio de la cerradura existente por una de privacidad para ba\u00f1o, con pestillo de emergencia por el exterior (se puede abrir desde afuera con un destornillador o moneda).",
          "La cerradura debe ser de acero inoxidable o lat\u00f3n cromado, con mecanismo de cierre suave y silencioso.",
          "Altura de instalaci\u00f3n: 1.00 m desde el nivel del piso terminado hasta el centro de la cerradura.",
          "Retirar la cerradura existente y verificar que el hueco en la puerta sea compatible con la nueva cerradura. Si no, ajustar con form\u00f3n.",
          "Instalar la nueva cerradura siguiendo las instrucciones del fabricante. Verificar el funcionamiento desde ambos lados.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de cerradura suministrada e instalada, incluyendo ajustes y pruebas de funcionamiento.",
      },
      "09.03": {
        norm: "NTC 771",
        specs: [
          "Instalaci\u00f3n de tapet\u00f3n o junquillo de madera o MDF en la parte inferior de la puerta, para cubrir la separaci\u00f3n entre la puerta y el piso terminado.",
          "El tapet\u00f3n se corta a la medida del ancho de la puerta con ingletes a 45\u00b0 en las esquinas.",
          "Fijaci\u00f3n con pegante de contacto de alta resistencia aplicado en ambas superficies, m\u00e1s puntillas sin cabeza para mayor seguridad.",
          "Las puntillas se colocan cada 15 cm y se hunden con un botador. Las cabezas se cubren con masilla para madera del mismo color.",
          "Pintar o barnizar el tapet\u00f3n del mismo color de la puerta para un acabado uniforme.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de tapet\u00f3n instalado, incluyendo corte, fijaci\u00f3n y acabado.",
      },
      "10.01": {
        norm: "NTC 2491 (Accesorios Sanitarios)",
        specs: [
          "Suministro e instalaci\u00f3n de espejo biselado de 0.50\u00d70.70 m con espesor m\u00ednimo de 4 mm y bordes biselados de 12 mm.",
          "Fijaci\u00f3n con adhesivo de montaje de alta resistencia (pegamento tipo constructor) aplicado en puntos estrat\u00e9gicos en el respaldo del espejo.",
          "Adicionalmente, instalar ganchos de seguridad en la parte inferior del espejo para soporte mec\u00e1nico en caso de falla del adhesivo.",
          "El borde inferior del espejo debe quedar a 1.10 m del nivel del piso terminado.",
          "Nivelar perfectamente el espejo antes de que el adhesivo frag\u00fce. Usar nivel de burbuja. Mantener presionado contra el muro durante 5 minutos.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de espejo suministrado e instalado, incluyendo adhesivo y ganchos de seguridad.",
      },
      "10.02/10.06": {
        norm: "NTC 2491 (Accesorios Sanitarios)",
        specs: [
          "Suministro e instalaci\u00f3n de accesorios de ba\u00f1o de la misma l\u00ednea y acabado cromado: toallero de barra de 60 cm, portarrollos, jabonera/esponjera y ganchos/percheros.",
          "Instalaci\u00f3n con tacos de expansi\u00f3n y tornillos de acero inoxidable en muro. Para muros enchapados, usar broca para porcelanato y tacos de nylon.",
          "El toallero se instala a 1.30 m del piso terminado, a un lado del lavamanos o la ducha.",
          "El portarrollos se instala a 65 cm del piso terminado, a un lado del sanitario, a una distancia m\u00e1xima de 30 cm del borde del sanitario.",
          "La jabonera se instala dentro del \u00e1rea de ducha a 1.10 m del piso. Los ganchos se instalan en la parte posterior de la puerta o en el muro a 1.60 m del piso.",
          "Todos los accesorios deben quedar firmemente fijados, nivelados y alineados entre s\u00ed.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de accesorio suministrado e instalado, incluyendo fijaci\u00f3n y nivelaci\u00f3n.",
      },
      "10.04": {
        norm: "NTC 2491",
        specs: [
          "Suministro e instalaci\u00f3n de barra de ducha cromada extensible (rango de 1.00 a 1.80 m) con cortina pl\u00e1stica antifluido de 1.80\u00d71.80 m.",
          "La barra se instala a 2.00 m de altura desde el nivel del piso terminado, fijada a los muros laterales con tacos expansivos y tornillos.",
          "La barra debe quedar perfectamente nivelada (usar nivel de burbuja) y firme, capaz de soportar el peso de la cortina sin flexionarse.",
          "La cortina antifluido debe tener ojillos de acero inoxidable y ganchos pl\u00e1sticos corredizos. Verificar que la cortina cubra completamente el \u00e1rea de ducha.",
          "Colocar un peso magn\u00e9tico o barra de lastre en la parte inferior de la cortina para evitar que se levante con el agua.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de cortinero suministrado e instalado, incluyendo barra, cortina, ganchos y fijaciones.",
      },
      "10.07": {
        norm: "RETIE (Aparatos El\u00e9ctricos)",
        specs: [
          "Suministro e instalaci\u00f3n de plaf\u00f3n LED cuadrado de 18W para iluminaci\u00f3n general de techo, con \u00edndice de protecci\u00f3n IP44 (protecci\u00f3n contra salpicaduras).",
          "Temperatura de color: 4000K (luz neutra). Factor de potencia m\u00ednimo: 0.90. Vida \u00fatil m\u00ednima: 25,000 horas.",
          "Instalaci\u00f3n empotrada o sobrepuesta en el cieloraso de drywall, conectada a la tuber\u00eda conduit del punto de luz correspondiente.",
          "Conexi\u00f3n el\u00e9ctrica con cable THHN #12, conectores y cinta aislante. Verificar la polaridad (fase al interruptor, neutro directo al plaf\u00f3n).",
          "El plaf\u00f3n debe quedar centrado en el \u00e1rea del ba\u00f1o, preferiblemente en el centro geom\u00e9trico del cieloraso.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de plaf\u00f3n suministrado e instalado, incluyendo conexi\u00f3n el\u00e9ctrica y fijaci\u00f3n.",
      },
      "10.08": {
        norm: "RETIE (Aparatos El\u00e9ctricos)",
        specs: [
          "Suministro e instalaci\u00f3n de aplique LED para espejo de 12W con \u00edndice de protecci\u00f3n IP44.",
          "Temperatura de color: 4000K (luz neutra). Vida \u00fatil m\u00ednima: 25,000 horas.",
          "Instalaci\u00f3n sobre el espejo o en el muro al lado del espejo, a 1.60 m del nivel del piso terminado.",
          "Conexi\u00f3n el\u00e9ctrica con cable THHN #12 desde la caja del punto de luz correspondiente, con conectores y cinta aislante.",
          "El aplique debe quedar centrado con respecto al espejo y firmemente fijado al muro.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de aplique suministrado e instalado, incluyendo conexi\u00f3n el\u00e9ctrica y fijaci\u00f3n.",
      },
      "10.09": {
        norm: "RETIE, NTC 2050",
        specs: [
          "Suministro e instalaci\u00f3n de extractor/ventilador de techo para ba\u00f1o de 4\" de di\u00e1metro, con capacidad m\u00ednima de 50 CFM y nivel de ruido m\u00e1ximo de 30 dB.",
          "Instalaci\u00f3n en el cieloraso de drywall, conectado a un interruptor independiente para su operaci\u00f3n separada de la iluminaci\u00f3n.",
          "Incluye tuber\u00eda conduit flexible aislado desde el extractor hasta la salida de aire exterior (losa o muro exterior).",
          "La salida al exterior debe tener rejilla de protecci\u00f3n contra insectos y aves.",
          "Conexi\u00f3n el\u00e9ctrica con cable THHN #12 desde el interruptor hasta el extractor. Verificar la direcci\u00f3n del flujo de aire (debe extraer el aire del ba\u00f1o hacia el exterior).",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de extractor suministrado e instalado, incluyendo tuber\u00eda, rejilla de salida y conexi\u00f3n el\u00e9ctrica.",
      },
      "10.10": {
        norm: "RETIE, NTC 2050",
        specs: [
          "Suministro e instalaci\u00f3n de tomas dobles GFCI de 15A/120V con protecci\u00f3n de falla a tierra (diferencial de 5 mA).",
          "Los apagadores son tipo balanc\u00edn (rocket) de 15A/120V, blancos, con placas decorativas de pol\u00edmero ABS color blanco.",
          "Altura de instalaci\u00f3n: apagadores a 1.20 m del piso terminado, tomas a 0.40 m del piso terminado (a 1.20 m si es sobre mes\u00f3n).",
          "Las placas decorativas deben quedar perfectamente niveladas y alineadas entre s\u00ed, con separaci\u00f3n uniforme si hay m\u00faltiples dispositivos.",
          "Conexi\u00f3n el\u00e9ctrica: fase al borne dorado, neutro al borne plateado, tierra al borne verde. Verificar la polaridad con un probador de tomas.",
          "Probar el funcionamiento del GFCI: presionar el bot\u00f3n de prueba (TEST) debe disparar el mecanismo y el bot\u00f3n de reset debe restaurarlo.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de dispositivo suministrado e instalado, incluyendo toma GFCI o apagador, placa decorativa y conexi\u00f3n.",
      },
      "10.11": {
        norm: "NTC 2491",
        specs: [
          "Suministro e instalaci\u00f3n de placa de m\u00e1rmol pulido de 0.55\u00d70.50 m con espesor m\u00ednimo de 20 mm y cantos biselados.",
          "Instalaci\u00f3n sobre mortero de nivelaci\u00f3n (proporci\u00f3n 1:3 cemento:arena) de 2 cm de espesor, aplicado sobre la base de apoyo.",
          "Adicionalmente aplicar pegamento cementoso en el dorso de la placa de m\u00e1rmol para garantizar la adhesi\u00f3n completa.",
          "Sellar las uniones del m\u00e1rmol con el muro y el lavamanos con silicona transparente de alta resistencia.",
          "Incluye perforaci\u00f3n para paso de tuber\u00edas de grifer\u00eda (monocomando o separadas) seg\u00fan la configuraci\u00f3n del lavamanos.",
          "La placa debe quedar perfectamente nivelada (usar nivel de burbuja en ambos sentidos) y a la altura definida (85 cm desde el piso terminado).",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de mes\u00f3n suministrado e instalado, incluyendo nivelaci\u00f3n, perforaciones y sellado.",
      },
      "11.01": {
        norm: "NTC-ISO 9001 (Gesti\u00f3n de Calidad), Reglamento de Seguridad en Obra",
        specs: [
          "Limpieza general del ba\u00f1o al finalizar todos los trabajos: retiro de todos los escombros, polvo y residuos de obra.",
          "Limpieza de todas las superficies (muros enchapados, pisos, cieloraso, accesorios) con productos no abrasivos.",
          "Pulida de grifer\u00eda y accesorios met\u00e1licos con pa\u00f1o seco. Aspirado de pisos y superficies para eliminar el polvo fino.",
          "Limpieza de la porcelana sanitaria con productos no abrasivos. Retiro de etiquetas y protectores de todos los aparatos y accesorios.",
          "Los residuos de silicona y pegamento deben retirarse cuidadosamente con esp\u00e1tula y diluyente si es necesario.",
        ],
        medition: "Se pagar\u00e1 como global (gl) por la limpieza general completa del ba\u00f1o al finalizar la obra.",
      },
      "11.02": {
        norm: "NTC-ISO 9001",
        specs: [
          "Protecci\u00f3n de pisos terminados con cart\u00f3n corrugado o pl\u00e1stico protector, cubriendo toda el \u00e1rea del piso del ba\u00f1o.",
          "Protecci\u00f3n de los aparatos sanitarios (sanitario, lavamanos) con pl\u00e1stico y cinta de enmascarar para evitar rayones y manchas.",
          "Protecci\u00f3n de la grifer\u00eda con pl\u00e1stico y cinta, evitando que el pl\u00e1stico est\u00e9 en contacto directo con el cromado (usar papel de seda intermedio).",
          "Las protecciones deben mantenerse en su lugar hasta la entrega final de la obra al propietario.",
        ],
        medition: "Se pagar\u00e1 como global (gl) por la protecci\u00f3n de todos los acabados del ba\u00f1o.",
      },
      "11.03": {
        norm: "NTC-ISO 9001",
        specs: [
          "Revisi\u00f3n final de todos los trabajos ejecutados: verificar el funcionamiento de cada aparato, grifer\u00eda y punto el\u00e9ctrico.",
          "Retoques de pintura en \u00e1reas donde haya sufrido da\u00f1os durante la instalaci\u00f3n de accesorios o aparatos.",
          "Aplicaci\u00f3n de silicona en juntas que lo requieran. Reemplazo de boquillas ep\u00f3xicas da\u00f1adas o incompletas.",
          "Ajuste de grifer\u00eda, accesorios y herrajes. Verificaci\u00f3n del correcto funcionamiento de puertas y divisiones de vidrio.",
          "Inspecci\u00f3n visual de la totalidad de los acabados. El contratista debe corregir cualquier defecto antes de la entrega.",
        ],
        medition: "Se pagar\u00e1 como global (gl) por los remates, retoques y revisi\u00f3n final del ba\u00f1o.",
      },
      "12.01": {
        norm: "Reglamento de Seguridad en Obra",
        specs: [
          "Transporte de todos los materiales necesarios para la obra desde los puntos de venta (Homecenter, ferreter\u00edas, distribuidores) hasta el sitio de obra.",
          "Los materiales fr\u00e1giles (porcelanato, vidrio, aparatos sanitarios, grifer\u00eda) deben transportarse en sus empaques originales con protecci\u00f3n adicional (mantas, pl\u00e1stico burbuja).",
          "El transporte se realiza en cami\u00f3n peque\u00f1o o furg\u00f3n con capacidad suficiente para todos los materiales de una etapa de la obra.",
          "El almacenamiento en obra debe hacerse en un sitio seco, protegido de la intemperie y libre de humedad.",
          "Los materiales se almacenan ordenadamente, los pesados abajo y los livianos arriba, con espacios de circulaci\u00f3n.",
        ],
        medition: "Se pagar\u00e1 como global (gl) por el transporte de todos los materiales necesarios para la ejecuci\u00f3n de la obra.",
      },
      "12.02": {
        norm: "Decreto 1077 de 2015",
        specs: [
          "Alquiler de un contenedor de 4 m\u00b3 para almacenamiento temporal de escombros durante toda la duraci\u00f3n de la obra.",
          "El contenedor debe permanecer tapado con lona o tapa met\u00e1lica para evitar dispersi\u00f3n de polvo, malos olores y proliferaci\u00f3n de vectores.",
          "El contenedor se ubica en el sitio designado por la administraci\u00f3n del conjunto residencial, preferiblemente en el \u00e1rea de parqueo o servicio.",
          "No mezclar escombros de obra con residuos ordinarios o reciclables dentro del contenedor.",
          "Cuando el contenedor est\u00e9 lleno, solicitar su reemplazo al proveedor del servicio de alquiler.",
        ],
        medition: "Se pagar\u00e1 como global (gl) por el alquiler del contenedor durante el tiempo que dure la obra, incluyendo el transporte del contenedor vac\u00edo y lleno.",
      },
      "12.03": {
        norm: "Decreto 1077 de 2015, Resoluci\u00f3n 0472 de 2017",
        specs: [
          "Transporte de escombros desde el contenedor de acopio temporal hasta la escombrera autorizada, mediante volqueta o cami\u00f3n de 5 m\u00b3 de capacidad.",
          "Los escombros deben cubrirse con lona durante el transporte para evitar dispersi\u00f3n de polvo en la v\u00eda p\u00fablica.",
          "Pago de la tasa de disposici\u00f3n final en la escombrera autorizada por la Secretar\u00eda Distrital de Ambiente.",
          "Entregar al contratista el certificado de disposici\u00f3n final para la trazabilidad de los residuos.",
          "Se estima un volumen total de escombros de aproximadamente 3 m\u00b3 para los 3 ba\u00f1os, equivalente a 1 viaje de volqueta.",
        ],
        medition: "Se pagar\u00e1 como global (gl) por el transporte y disposici\u00f3n final de todos los escombros de la obra.",
      },
      "13.01": {
        norm: "NTC 4425 (Ventanas de Aluminio), NTC 1522 (Vidrio para Construcci\u00f3n)",
        specs: [
          "Suministro e instalaci\u00f3n de ventana de aluminio anodizado natural o blanco con vidrio claro de 4 mm de espesor.",
          "Dimensi\u00f3n de 0.60\u00d70.60 m o seg\u00fan la medida real del vano existente, verificada en sitio antes de la fabricaci\u00f3n.",
          "Incluye marco perimetral de aluminio, hojas (fija y m\u00f3vil), bisagras de acero inoxidable, jaladera de aluminio y sistema de drenaje en el marco.",
          "Instalaci\u00f3n con anclajes mec\u00e1nicos al muro (tacos expansivos y tornillos cada 40 cm en todo el per\u00edmetro).",
          "Sellado perimetral exterior e interior con silicona estructural neutra, aplicada en cord\u00f3n continuo sin interrupciones.",
          "La ventana debe abrir y cerrar correctamente, sin fricci\u00f3n. No deben existir espacios entre el marco y el muro que permitan filtraciones de agua o aire.",
          "Verificar la estanquidad al agua realizando una prueba de manguera en el exterior: no debe haber filtraciones hacia el interior.",
        ],
        medition: "Se pagar\u00e1 por unidad (und) de ventana suministrada e instalada, incluyendo marco, vidrio, herrajes, anclajes y sellado perimetral.",
      },
    }

    // ── Build chapter-level norms ──
    const chapterNorms: Record<string, string> = {
      c1: "NSR-10 T\u00edtulo I (Supervisi\u00f3n T\u00e9cnica), NTC 1500 (C\u00f3digo de Construcci\u00f3n), Decreto 1077 de 2015 (RCD)",
      c2: "RAS 2000 T\u00edtulo B (Sistemas de Acueducto), NTC 1337 (Tuber\u00eda PVC), NTC 541 (Tuber\u00eda CPVC), NTC 1533 (V\u00e1lvulas)",
      c3: "RETIE (Reglamento T\u00e9cnico de Instalaciones El\u00e9ctricas), NTC 2050 (C\u00f3digo El\u00e9ctrico Colombiano)",
      c4: "NSR-10 T\u00edtulo D (Mamposter\u00eda Estructural), NTC 121 (Cemento Portland)",
      c5: "NTC 5618 (Placas de Yeso), ASTM C1396 (Standard Specification for Gypsum Board), NTC 1330 (Pinturas Vin\u00edlicas)",
      c6: "NTC 3184 (Membranas L\u00edquidas), ASTM D6083 (Standard Specification for Liquid Applied Acrylic Coating)",
      c7: "NTC 4321 (Baldosas Cer\u00e1micas), ASTM C1028 (Coeficiente de Fricci\u00f3n), ANSI A137.1 (Ceramic Tile), ISO 13007",
      c8: "NTC 179 (Aparatos Sanitarios de Cer\u00e1mica), NTC 2186 (Grifer\u00eda para Ba\u00f1o), NTC 1533 (V\u00e1lvulas)",
      c9: "NTC 771 (Puertas de Madera), NTC 2500 (Cerrajer\u00eda)",
      c10: "NTC 2491 (Accesorios Sanitarios), RETIE (Aparatos El\u00e9ctricos)",
      c11: "NTC-ISO 9001 (Gesti\u00f3n de Calidad), Reglamento de Seguridad en Obra",
      c12: "Decreto 1077 de 2015 (Gesti\u00f3n de RCD), Resoluci\u00f3n 0472 de 2017",
      c13: "NTC 4425 (Ventanas de Aluminio), NTC 1522 (Vidrio para Construcci\u00f3n)",
    }

    for (const ch of specsChapters) {
      const itemsWithAPU = ch.items.filter((it) => it.apu)
      if (itemsWithAPU.length === 0) continue

      const chapterNum = ch.code.replace("c", "").padStart(2, "0")
      md += `### C${chapterNum} - ${ch.title}\n\n`
      md += `**Normas aplicables:** ${chapterNorms[ch.code] ?? "Normas t\u00e9cnicas colombianas aplicables"}\n\n`
      md += `**Alcance del cap\u00edtulo:** ${ch.title}. Se incluyen todas las actividades necesarias para la ejecuci\u00f3n completa de los trabajos descritos en este cap\u00edtulo, conforme a las especificaciones t\u00e9cnicas detalladas a continuaci\u00f3n.\n\n`

      // ══ Payment unit summary table ══
      md += `#### Unidades de Pago del Cap\u00edtulo\n\n`
      md += `| C\u00f3digo APU | Actividad | Unidad de Pago | Descripci\u00f3n de la Unidad |\n`
      md += `|---|---|---|---|\n`
      for (const it of itemsWithAPU) {
        const apuCode = it.apu?.code ?? it.code
        const unitRec = it.apu?.unitId ? unitMap[it.apu.unitId] : null
        const unitCode = unitRec?.code ?? ""
        const unitName = unitRec?.name ?? ""
        md += `| **${apuCode}** | ${it.description} | **${unitCode}** | ${unitName} |\n`
      }
      md += `\n`

      // ══ Per-APU detailed specs ══
      for (const it of itemsWithAPU) {
        const apuCode = it.apu?.code ?? it.code
        const unitRec = it.apu?.unitId ? unitMap[it.apu.unitId] : null
        const unitCode = unitRec?.code ?? ""
        const unitName = unitRec?.name ?? ""

        const specData = apuSpecs[apuCode]
        if (!specData) {
          md += `#### **APU ${apuCode}** \u2014 ${it.description}\n\n`
          md += `**Unidad de Pago:** ${unitCode} (${unitName})\n\n`
          md += `Ejecutar seg\u00fan especificaciones del proyecto y normas t\u00e9cnicas colombianas aplicables.\n\n`
          md += `**Forma de Medici\u00f3n y Pago:** Se medir\u00e1 y pagar\u00e1 en ${unitCode} (${unitName}) ejecutado(a), completamente terminado(a) y recibido(a) a satisfacci\u00f3n.\n\n`
          md += `---\n\n`
          continue
        }

        md += `#### **APU ${apuCode}** \u2014 ${it.description}\n\n`
        md += `**Norma aplicable:** ${specData.norm}\n\n`
        md += `**Unidad de Pago:** ${unitCode} (${unitName})\n\n`

        const s = specData.specs
        for (let i = 0; i < s.length; i++) {
          md += `${i + 1}. ${s[i]}\n`
        }

        md += `\n**Forma de Medici\u00f3n y Pago:** ${specData.medition}\n\n`
        md += `---\n\n`
      }
    }

    md += `*Estas especificaciones t\u00e9cnicas se basan en las normas colombianas vigentes (NSR-10, RETIE, RAS 2000, NTC) y en las pr\u00e1cticas recomendadas por el fabricante de cada material. El contratista debe verificar el cumplimiento de cada especificaci\u00f3n durante la ejecuci\u00f3n de la obra.*\n`
  } else {
    res.status(404).json({ error: "Reporte no encontrado" })
    return
  }

  if (isHtml) {
    res.setHeader("Content-Type", "text/html; charset=utf-8")
    res.send(h(md))
  } else {
    res.setHeader("Content-Type", "text/markdown; charset=utf-8")
    res.send(md)
  }
})

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
