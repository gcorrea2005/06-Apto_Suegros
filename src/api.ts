export interface Unit {
  id: number
  code: string
  name: string
}

export interface Room {
  id: number
  name: string
  width: number
  length: number
  height: number
}

export interface Chapter {
  id: number
  code: string
  title: string
  icon: string
  sortOrder: number
}

export interface APUComponent {
  id: number
  code: string
  description: string
  unit: Unit
  quantity: number
  unitPrice: number
  totalCost: number
  category: "MO" | "MATERIAL" | "EQUIPO" | "TRANSPORT"
}

export interface APU {
  id: number
  code: string
  title: string
  unit: Unit
  totalCost: number
  adminPct: number
  utilityPct: number
  ivaPct: number
  adminCost: number
  utilityCost: number
  ivaCost: number
  totalPrice: number
  components: APUComponent[]
}

export interface ItemQuantity {
  id: number
  room: Room
  quantity: number
}

export interface BudgetItem {
  id: number
  code: string
  description: string
  unit: Unit
  chapter: Chapter
  apu: APU | null
  itemQuantities: ItemQuantity[]
}

export interface BudgetSummary {
  totalGeneral: number
  totalPrice: number
  totalAdmin: number
  totalUtility: number
  totalIVA: number
  totalMO: number
  totalMat: number
  totalEquipo: number
  totalTransp: number
  chapters: { code: string; title: string; icon: string; subtotal: number }[]
}

const BASE = "/api"

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(`${BASE}${url}`)
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
  return res.json()
}

async function sendJSON<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || `Request failed: ${res.status}`) }
  return res.json()
}

export interface CreateItemPayload {
  code: string
  description: string
  chapterCode: string
  unitCode: string
  apuCode?: string
  quantities: { roomId: number; quantity: number }[]
}

export type UpdateItemPayload = Partial<Omit<CreateItemPayload, "code" | "chapterCode">>

export interface APUComponentInput {
  description: string
  unitId: number
  quantity: number
  unitPrice: number
  category: "MO" | "MATERIAL" | "EQUIPO" | "TRANSPORT"
}

export interface CreateAPUPayload {
  code: string
  title: string
  unitCode: string
  components: APUComponentInput[]
}

export interface UpdateAPUPayload {
  title?: string
  unitCode?: string
  components?: APUComponentInput[]
}

export const api = {
  units: () => fetchJSON<Unit[]>("/units"),
  rooms: () => fetchJSON<Room[]>("/rooms"),
  chapters: () => fetchJSON<Chapter[]>("/chapters"),
  createChapter: (data: { code: string; title: string; icon?: string; sortOrder?: number }) => sendJSON<Chapter>("/chapters", "POST", data),
  updateChapter: (code: string, data: { title?: string; icon?: string; sortOrder?: number }) => sendJSON<Chapter>(`/chapters/${code}`, "PUT", data),
  deleteChapter: (code: string) => sendJSON<{ success: boolean }>(`/chapters/${code}`, "DELETE"),
  items: () => fetchJSON<BudgetItem[]>("/items"),
  itemsByChapter: (code: string) => fetchJSON<BudgetItem[]>(`/chapters/${code}/items`),
  createItem: (data: CreateItemPayload) => sendJSON<BudgetItem>("/items", "POST", data),
  updateItem: (id: number, data: UpdateItemPayload) => sendJSON<BudgetItem>(`/items/${id}`, "PUT", data),
  deleteItem: (id: number) => sendJSON<{ success: boolean }>(`/items/${id}`, "DELETE"),
  apus: () => fetchJSON<APU[]>("/apus"),
  createAPU: (data: CreateAPUPayload) => sendJSON<APU>("/apus", "POST", data),
  updateAPU: (id: number, data: UpdateAPUPayload) => sendJSON<APU>(`/apus/${id}`, "PUT", data),
  deleteAPU: (id: number) => sendJSON<{ success: boolean }>(`/apus/${id}`, "DELETE"),
  createComponent: (apuId: number, data: { code?: string; description: string; unitId: number; quantity: number; unitPrice: number; category: string }) => sendJSON<APUComponent>(`/apus/${apuId}/components`, "POST", data),
  updateComponent: (apuId: number, compId: number, data: { code?: string; description?: string; unitId?: number; quantity?: number; unitPrice?: number; category?: string }) => sendJSON<APUComponent>(`/apus/${apuId}/components/${compId}`, "PUT", data),
  deleteComponent: (apuId: number, compId: number) => sendJSON<{ success: boolean }>(`/apus/${apuId}/components/${compId}`, "DELETE"),
  budgetSummary: () => fetchJSON<BudgetSummary>("/budget/summary"),
}
