import { useState, useEffect } from "react"
import { api, type BudgetItem, type Chapter, type Room, type Unit, type APU } from "../api"

function formatCOP(n: number) {
  return "$ " + n.toLocaleString("es-CO")
}

const ICONS = ["🔨","🔧","🛠️","⚒️","🧱","🏗️","🔩","🔌","💡","🚿","🛁","🚽","💧","🔥","🧹","🔫","🎨","🖌️","📐","📏","🧰","🧲","🚪","🪟","🪑","🧴","🪥","🧽","🧺","🧼","🚛","📦","🛒","⚡","🔋","💎","🏠","📍","📋","📝"]

const emptyItemForm = {
  code: "", description: "", unitCode: "", apuCode: "",
  quantities: {} as Record<number, number>,
}

export function Presupuesto({ onNavigateToApus }: { onNavigateToApus?: () => void }) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [items, setItems] = useState<BudgetItem[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [apus, setApus] = useState<APU[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editCh, setEditCh] = useState<string | null>(null)
  const [showChForm, setShowChForm] = useState(false)
  const [chForm, setChForm] = useState({ code: "", title: "", icon: "📋", sortOrder: 0 })
  const [editItem, setEditItem] = useState<{ chapterCode: string; itemId: number | null } | null>(null)
  const [itemForm, setItemForm] = useState(emptyItemForm)

  const load = () => Promise.all([api.chapters(), api.items(), api.rooms(), api.units(), api.apus()])
    .then(([c, i, r, u, a]) => { setChapters(c); setItems(i); setRooms(r); setUnits(u); setApus(a); setLoading(false) })
    .catch(() => { setError("No se pudo conectar con el servidor."); setLoading(false) })

  useEffect(() => { load() }, [])

  const resetItemForm = () => {
    const q: Record<number, number> = {}
    rooms.forEach((r) => { q[r.id] = 0 })
    setItemForm({ ...emptyItemForm, quantities: q, unitCode: units[0]?.code ?? "" })
    setEditItem(null)
  }

  const startItemEdit = (it: BudgetItem) => {
    const q: Record<number, number> = {}
    rooms.forEach((r) => { q[r.id] = it.itemQuantities.find((iq) => iq.room.id === r.id)?.quantity ?? 0 })
    setItemForm({ code: it.code, description: it.description, unitCode: it.unit.code, apuCode: it.apu?.code ?? "", quantities: q })
    setEditItem({ chapterCode: it.chapter.code, itemId: it.id })
  }

  const handleItemSave = async () => {
    try {
      const quantities = rooms.map((r) => ({ roomId: r.id, quantity: itemForm.quantities[r.id] ?? 0 }))
      if (editItem?.itemId) {
        await api.updateItem(editItem.itemId, { description: itemForm.description, unitCode: itemForm.unitCode, apuCode: itemForm.apuCode || undefined, quantities })
      } else if (editItem) {
        await api.createItem({ code: itemForm.code, description: itemForm.description, chapterCode: editItem.chapterCode, unitCode: itemForm.unitCode, apuCode: itemForm.apuCode || undefined, quantities })
      }
      resetItemForm(); setError(""); await load()
    } catch (e: any) { setError(e.message) }
  }

  const handleItemDelete = async (it: BudgetItem) => {
    if (!confirm(`¿Eliminar "${it.code} - ${it.description}"?`)) return
    try { setError(""); await api.deleteItem(it.id); await load() }
    catch (e: any) { setError(e.message) }
  }

  const handleChSave = async () => {
    try {
      if (editCh) await api.updateChapter(editCh, chForm)
      else await api.createChapter(chForm)
      setEditCh(null); setShowChForm(false); setChForm({ code: "", title: "", icon: "📋", sortOrder: 0 }); setError(""); await load()
    } catch (e: any) { setError(e.message) }
  }

  const handleChDelete = async (code: string) => {
    if (!confirm(`¿Eliminar capítulo ${code}?`)) return
    try { setError(""); await api.deleteChapter(code); await load() }
    catch (e: any) { setError(e.message) }
  }

  if (loading) return <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.5 }}>Cargando...</div>

  const filteredItems = items
    .filter((it) => !search || it.description.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="presupuesto">
      <div className="controls">
        <input type="text" placeholder="Buscar actividad..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="admin-btn primary sm" onClick={() => {
          setEditCh(null); setShowChForm(true); setChForm({ code: "", title: "", icon: "📋", sortOrder: chapters.length + 1 })
        }}>+ Capítulo</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {(editCh !== null || showChForm) && (
        <div className="chapter-card" style={{ marginBottom: 10 }}>
          <div className="chapter-body" style={{ padding: 12 }}>
            <div className="admin-form">
              {!editCh && <input placeholder="Código (ej: c13)" value={chForm.code} onChange={(e) => setChForm({ ...chForm, code: e.target.value })} />}
              <input placeholder="Título" value={chForm.title} onChange={(e) => setChForm({ ...chForm, title: e.target.value })} />
              <span className="icon-picker-current">{chForm.icon}</span>
              <div className="icon-picker-grid">
                {ICONS.map((ico) => (
                  <span key={ico} className={`icon-opt ${ico === chForm.icon ? "active" : ""}`} onClick={() => setChForm({ ...chForm, icon: ico })}>{ico}</span>
                ))}
              </div>
              <input type="number" placeholder="Orden" value={chForm.sortOrder} onChange={(e) => setChForm({ ...chForm, sortOrder: Number(e.target.value) })} style={{ maxWidth: 70 }} />
              <button className="admin-btn primary" onClick={handleChSave}>{editCh ? "Guardar" : "Crear"}</button>
              <button className="admin-btn" onClick={() => { setEditCh(null); setShowChForm(false); setChForm({ code: "", title: "", icon: "📋", sortOrder: 0 }) }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {chapters.map((ch) => {
        const chItems = filteredItems.filter((it) => it.chapter.code === ch.code)
        const chSubtotal = chItems.reduce((s, it) => s + (it.apu?.totalPrice ?? 0) * it.itemQuantities.reduce((t, q) => t + q.quantity, 0), 0)

        return (
          <div key={ch.code} className="chapter-card">
            <div className="chapter-header" onClick={() => setExpanded(expanded === ch.code ? null : ch.code)}>
              <span>
                <span className={`ch-toggle ${expanded === ch.code ? "open" : ""}`}>▶</span>
                {ch.icon} <span className="ch-code">C{String(Number(ch.code.replace(/^c/i, ""))).padStart(2, "0")}</span> <strong>{ch.title}</strong>
                {chSubtotal > 0 && <span className="ch-subtotal">{formatCOP(chSubtotal)}</span>}
              </span>
              <span>
                <button className="admin-btn sm" onClick={(e) => { e.stopPropagation(); setEditCh(ch.code); setShowChForm(true); setChForm(ch) }} title="Editar">✏️</button>
                <button className="admin-btn sm danger" onClick={(e) => { e.stopPropagation(); handleChDelete(ch.code) }} title="Eliminar capítulo">🗑️</button>
                <button className="admin-btn sm" onClick={(e) => { e.stopPropagation(); resetItemForm(); setItemForm((f) => ({ ...f, code: `${ch.code.replace(/^c/i, "")}.${chItems.length + 1}` })); setEditItem({ chapterCode: ch.code, itemId: null }) }} title="Agregar actividad">+</button>
              </span>
            </div>

            {editItem && editItem.chapterCode === ch.code && (
              <div className="item-form">
                <div className="item-form-fields">
                  {!editItem.itemId && <input placeholder="Código (ej: 2.07)" value={itemForm.code} onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })} />}
                  <input placeholder="Descripción" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
                  <select value={itemForm.unitCode} onChange={(e) => setItemForm({ ...itemForm, unitCode: e.target.value })}>
                    {units.map((u) => <option key={u.code} value={u.code}>{u.code} - {u.name}</option>)}
                  </select>
                  <select value={itemForm.apuCode} onChange={(e) => setItemForm({ ...itemForm, apuCode: e.target.value })}>
                    <option value="">Sin APU</option>
                    {apus.map((a) => <option key={a.code} value={a.code}>{a.code} - {a.title}</option>)}
                  </select>
                  <button className="admin-btn primary xs" type="button" onClick={onNavigateToApus} title="Crear nuevo APU">+ APU</button>
                  {rooms.map((r) => (
                    <div key={r.id} className="qty-field">
                      <label>{r.name}:</label>
                      <input type="number" step="0.01" value={itemForm.quantities[r.id] ?? 0} onChange={(e) => setItemForm({ ...itemForm, quantities: { ...itemForm.quantities, [r.id]: Number(e.target.value) } })} />
                    </div>
                  ))}
                </div>
                <div className="item-form-actions">
                  <button className="admin-btn primary" onClick={handleItemSave}>{editItem.itemId ? "Guardar" : "Crear"}</button>
                  <button className="admin-btn" onClick={resetItemForm}>Cancelar</button>
                </div>
              </div>
            )}

            {expanded === ch.code && (
              <div className="chapter-body">
                {chItems.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", opacity: 0.5 }}>Sin actividades — presiona + para agregar</div>
                ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Ítem</th><th>Actividad</th><th>Und</th>
                      {rooms.map((r) => <th key={r.id} className="num">{r.name}</th>)}
                      <th className="num">Total</th><th className="num">APU</th><th className="num">Subtotal</th>
                      <th className="num"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {chItems.map((it) => {
                      const totalQty = it.itemQuantities.reduce((s, q) => s + q.quantity, 0)
                      const qtyByRoom = rooms.map((r) => it.itemQuantities.find((q) => q.room.id === r.id)?.quantity ?? 0)
                      const apuPrice = it.apu?.totalPrice ?? 0
                      const subtotal = apuPrice * totalQty
                      return (
                        <tr key={it.id}>
                          <td className="num">{it.code}</td>
                          <td>{it.description}</td>
                          <td className="num">{it.unit.code}</td>
                          {qtyByRoom.map((q, i) => <td key={i} className="num">{q}</td>)}
                          <td className="num">{totalQty}</td>
                          <td className="num" style={{ color: "#ffe066" }}>{apuPrice > 0 ? formatCOP(apuPrice) : "-"}</td>
                          <td className="num" style={{ color: "#4facfe" }}>{subtotal > 0 ? formatCOP(subtotal) : "-"}</td>
                          <td className="num">
                            <button className="admin-btn xs" onClick={() => startItemEdit(it)} title="Editar">✏️</button>
                            <button className="admin-btn xs danger" onClick={() => handleItemDelete(it)} title="Eliminar">🗑️</button>
                          </td>
                        </tr>
                      )
                    })}
                    <tr className="subtotal-row">
                      <td colSpan={5 + rooms.length} style={{ textAlign: "right" }}>Subtotal</td>
                      <td className="num" colSpan={3}>{formatCOP(chSubtotal)}</td>
                    </tr>
                  </tbody>
                </table>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
