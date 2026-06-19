import { useState, useEffect } from "react"
import { api, type APU, type Unit } from "../api"

function formatCOP(n: number) {
  return "$ " + n.toLocaleString("es-CO")
}

const CAT_LABELS: Record<string, string> = {
  MO: "Mano de Obra",
  MATERIAL: "Materiales",
  EQUIPO: "Equipo",
  TRANSPORT: "Transporte",
}

const CAT_ORDER = ["MO", "MATERIAL", "EQUIPO", "TRANSPORT"] as const

export function Insumos() {
  const [apus, setApus] = useState<APU[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [search, setSearch] = useState("")
  const [expandedCat, setExpandedCat] = useState<string | null>("MATERIAL")
  const [addCat, setAddCat] = useState<string | null>(null)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [form, setForm] = useState({ code: "", description: "", unitId: 0, unitPrice: 0, apuId: 0 })
  const [error, setError] = useState("")

  const load = () => Promise.all([api.apus(), api.units()]).then(([a, u]) => { setApus(a); setUnits(u) }).catch(console.error)
  useEffect(() => { load() }, [])

  // Group globally unique by description+category
  const groupedMap = new Map<string, { code: string; description: string; unit: { id: number; code: string }; unitPrice: number; category: string; compIds: { apuId: number; compId: number }[] }>()
  for (const apu of apus) {
    for (const c of apu.components) {
      const key = `${c.description}|${c.category}`
      const g = groupedMap.get(key)
      if (g) { g.compIds.push({ apuId: apu.id, compId: c.id }) }
      else {
        groupedMap.set(key, {
          code: c.code, description: c.description, unit: c.unit, unitPrice: c.unitPrice,
          category: c.category, compIds: [{ apuId: apu.id, compId: c.id }],
        })
      }
    }
  }

  const insumos = Array.from(groupedMap.values())
  const filtered = insumos.filter((c) => !search || c.description.toLowerCase().includes(search.toLowerCase()))

  const resetForm = () => setForm({ code: "", description: "", unitId: units[0]?.id ?? 0, unitPrice: 0, apuId: 0 })

  const handleSave = async () => {
    try {
      if (!form.description || !form.unitId) { setError("Descripción y unidad requeridos"); return }
      if (editKey) {
        const [desc, cat] = editKey.split("|")
        for (const apu of apus) {
          const matching = apu.components.filter((c) => c.description === desc && c.category === cat)
          for (const comp of matching) {
            await api.updateComponent(apu.id, comp.id, {
              description: form.description,
              unitId: form.unitId,
              unitPrice: form.unitPrice,
            })
          }
        }
      } else if (addCat && form.apuId) {
        await api.createComponent(form.apuId, { code: form.code, description: form.description, unitId: form.unitId, quantity: 1, unitPrice: form.unitPrice, category: addCat })
      } else if (addCat) {
        setError("Selecciona un APU destino"); return
      }
      setError(""); setEditKey(null); setAddCat(null); resetForm(); await load()
    } catch (e: any) { console.error("handleSave error:", e); setError(e.message) }
  }

  const handleDelete = async (entry: typeof insumos[0]) => {
    if (!confirm(`¿Eliminar "${entry.description}" de todos los APU's?`)) return
    try {
      setError("")
      const [desc, cat] = [entry.description, entry.category]
      for (const apu of apus) {
        const matching = apu.components.filter((c) => c.description === desc && c.category === cat)
        for (const comp of matching) {
          await api.deleteComponent(apu.id, comp.id)
        }
      }
      await load()
    } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="insumos">
      <div className="controls">
        <input type="text" placeholder="Buscar insumo..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error && <div className="error-msg">{error}</div>}

      {(editKey || addCat) && (
        <div className="apu-card" style={{ marginBottom: 10 }}>
          <div className="apu-body" style={{ padding: 12 }}>
            <div className="admin-form">
              <input placeholder="Código" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} style={{ maxWidth: 70 }} />
              <input placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ flex: 2 }} />
              <select value={form.unitId} onChange={(e) => setForm({ ...form, unitId: Number(e.target.value) })} style={{ maxWidth: 80 }}>
                {units.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Vr. Unit" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} style={{ maxWidth: 80 }} />
              {!editKey && (
                <select value={form.apuId} onChange={(e) => setForm({ ...form, apuId: Number(e.target.value) })} style={{ maxWidth: 140 }}>
                  <option value={0}>APU destino</option>
                  {apus.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.title}</option>)}
                </select>
              )}
              <button className="admin-btn primary" onClick={handleSave}>{editKey ? "Guardar" : "Crear"}</button>
              <button className="admin-btn" onClick={() => { setEditKey(null); setAddCat(null); resetForm() }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {CAT_ORDER.map((cat) => {
        const comps = filtered.filter((c) => c.category === cat).sort((a, b) => a.code.localeCompare(b.code))
        if (comps.length === 0) return null
        return (
          <div key={cat} className="apu-card" style={{ marginBottom: 10 }}>
            <div className="apu-header" style={{ background: `linear-gradient(90deg, #2d2b55, #1a1a2e)`, cursor: "pointer" }} onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}>
              <div>
                <span className={`apu-toggle ${expandedCat === cat ? "open" : ""}`} style={{ marginRight: 8 }}>▶</span>
                <span style={{ fontWeight: 700, fontSize: "1em" }}>{CAT_LABELS[cat]}</span>
                <span style={{ marginLeft: 12, opacity: 0.6, fontSize: "0.85em" }}>{comps.length} insumos</span>
              </div>
              <span>
                <button className="admin-btn sm" onClick={(e) => { e.stopPropagation(); setAddCat(cat); setEditKey(null); resetForm(); const catCode = cat === "MO" ? "MO" : cat === "EQUIPO" ? "EQ" : cat === "TRANSPORT" ? "TR" : "MA"; setForm((f) => ({ ...f, code: `${catCode}-${String(comps.length + 1).padStart(2, "0")}` })) }} title="Agregar insumo">+</button>
              </span>
            </div>
            {expandedCat === cat && (
              <div className="apu-body">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th style={{ width: "40%" }}>Insumo</th>
                      <th className="num">Und</th>
                      <th className="num">Vr. Unit</th>
                      <th className="num"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {comps.map((entry) => {
                      const key = `${entry.description}|${entry.category}`
                      return (
                        <tr key={key}>
                          <td className="num" style={{ opacity: 0.5 }}>{entry.code}</td>
                          <td>{entry.description}</td>
                          <td className="num">{entry.unit.code}</td>
                          <td className="num">{formatCOP(entry.unitPrice)}</td>
                          <td className="num">
                            <button className="admin-btn xs" onClick={() => { setEditKey(key); setAddCat(null); setForm({ code: entry.code, description: entry.description, unitId: entry.unit.id, unitPrice: entry.unitPrice, apuId: 0 }) }} title="Editar">✏️</button>
                            <button className="admin-btn xs danger" onClick={() => handleDelete(entry)} title="Eliminar">🗑️</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
