import { useState, useEffect } from "react"
import { api, type APU, type Unit } from "../api"

const CAP_COLORS: Record<string, string> = {
  "1": "#e17055", "2": "#0984e3", "3": "#6c5ce7", "4": "#fdcb6e",
  "5": "#00b894", "6": "#e84393", "7": "#d63031", "8": "#00cec9",
  "9": "#636e72", "10": "#dfe6e9", "11": "#b2bec3", "12": "#a0a0a0",
}

const CAT_LABELS: Record<string, string> = {
  MO: "Mano de Obra",
  MATERIAL: "Materiales",
  EQUIPO: "Equipo",
  TRANSPORT: "Transporte",
}

function formatCOP(n: number) {
  return "$ " + n.toLocaleString("es-CO")
}

const emptyComponent = { description: "", unitId: 0, quantity: 0, unitPrice: 0, category: "MATERIAL" } as const

export function APUs() {
  const [apus, setApus] = useState<APU[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [editApuId, setEditApuId] = useState<number | null>(null)
  const [apuForm, setApuForm] = useState({ code: "", title: "", unitCode: "" })
  const [components, setComponents] = useState<typeof emptyComponent[]>([])
  const [error, setError] = useState("")

  // Inline component editing state
  const [editCompKey, setEditCompKey] = useState<string | null>(null)
  const [addCompCat, setAddCompCat] = useState<string | null>(null)
  const [compForm, setCompForm] = useState({ description: "", unitId: 0, quantity: 0, unitPrice: 0, category: "MATERIAL" })

  const load = () => Promise.all([api.apus(), api.units()])
    .then(([a, u]) => { setApus(a); setUnits(u) })
    .catch(console.error)

  useEffect(() => { load() }, [])

  const resetApuForm = () => {
    setEditApuId(null)
    setApuForm({ code: "", title: "", unitCode: units[0]?.code ?? "" })
    setComponents([{ ...emptyComponent, unitId: units[0]?.id ?? 0 }])
  }

  const startApuEdit = (apu: APU) => {
    setEditApuId(apu.id)
    setApuForm({ code: apu.code, title: apu.title, unitCode: apu.unit.code })
    setComponents(apu.components.map((c) => ({ description: c.description, unitId: c.unit.id, quantity: c.quantity, unitPrice: c.unitPrice, category: c.category })))
    setExpanded(null)
  }

  const handleApuSave = async () => {
    try {
      const validComps = components.filter((c) => c.description && c.unitId)
      if (!apuForm.code || !apuForm.title) { setError("code y title requeridos"); return }
      if (validComps.length === 0) { setError("Agrega al menos un componente"); return }
      if (editApuId) {
        await api.updateAPU(editApuId, { title: apuForm.title, unitCode: apuForm.unitCode, components: validComps })
      } else {
        await api.createAPU({ ...apuForm, components: validComps })
      }
      setError(""); resetApuForm(); await load()
    } catch (e: any) { setError(e.message) }
  }

  const handleApuDelete = async (apu: APU) => {
    if (!confirm(`¿Eliminar APU "${apu.code} - ${apu.title}"?`)) return
    try { setError(""); await api.deleteAPU(apu.id); await load() }
    catch (e: any) { setError(e.message) }
  }

  // ── Inline component CRUD ──

  const resetCompForm = () => setCompForm({ description: "", unitId: units[0]?.id ?? 0, quantity: 0, unitPrice: 0, category: "MATERIAL" })

  const handleEditComp = (apuId: number, comp: APU['components'][0]) => {
    setEditCompKey(`${apuId}|${comp.id}`)
    setAddCompCat(null)
    setCompForm({ description: comp.description, unitId: comp.unit.id, quantity: comp.quantity, unitPrice: comp.unitPrice, category: comp.category })
  }

  const handleSaveComp = async (apuId: number, compId: number) => {
    try {
      if (!compForm.description || !compForm.unitId) { setError("Descripción y unidad requeridos"); return }
      await api.updateComponent(apuId, compId, compForm as any)
      setEditCompKey(null); setError(""); await load()
    } catch (e: any) { setError(e.message) }
  }

  const handleDeleteComp = async (apuId: number, compId: number) => {
    if (!confirm("¿Eliminar este insumo del APU?")) return
    try { await api.deleteComponent(apuId, compId); setError(""); await load() }
    catch (e: any) { setError(e.message) }
  }

  const handleAddComp = async (apuId: number) => {
    try {
      if (!compForm.description || !compForm.unitId) { setError("Descripción y unidad requeridos"); return }
      await api.createComponent(apuId, { ...compForm, quantity: compForm.quantity || 1 } as any)
      setAddCompCat(null); resetCompForm(); setError(""); await load()
    } catch (e: any) { setError(e.message) }
  }

  const filtered = apus
    .filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="apus">
      <div className="controls">
        <input type="text" placeholder="Buscar APU..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="admin-btn primary sm" onClick={resetApuForm}>+ APU</button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {(editApuId !== null || apuForm.code) && (
        <div className="apu-card" style={{ marginBottom: 10 }}>
          <div className="apu-body" style={{ padding: 12 }}>
            <div className="admin-form" style={{ marginBottom: 10 }}>
              <input placeholder="Código (ej: 13.01)" value={apuForm.code} onChange={(e) => setApuForm({ ...apuForm, code: e.target.value })} disabled={!!editApuId} />
              <input placeholder="Título" value={apuForm.title} onChange={(e) => setApuForm({ ...apuForm, title: e.target.value })} />
              <select value={apuForm.unitCode} onChange={(e) => setApuForm({ ...apuForm, unitCode: e.target.value })}>
                {units.map((u) => <option key={u.code} value={u.code}>{u.code} - {u.name}</option>)}
              </select>
            </div>
            <div style={{ fontSize: "0.8em", opacity: 0.7, marginBottom: 6 }}>Componentes:</div>
            {components.map((comp, i) => (
              <div key={i} className="admin-form" style={{ marginBottom: 4 }}>
                <input placeholder="Descripción" value={comp.description} onChange={(e) => { const c = [...components]; c[i] = { ...c[i], description: e.target.value }; setComponents(c) }} style={{ flex: 2 }} />
                <input type="number" step="0.01" placeholder="Cant" value={comp.quantity} onChange={(e) => { const c = [...components]; c[i] = { ...c[i], quantity: Number(e.target.value) }; setComponents(c) }} style={{ maxWidth: 60 }} />
                <input type="number" step="0.01" placeholder="Vr Unit" value={comp.unitPrice} onChange={(e) => { const c = [...components]; c[i] = { ...c[i], unitPrice: Number(e.target.value) }; setComponents(c) }} style={{ maxWidth: 80 }} />
                  <select value={comp.category} onChange={(e) => { const c = [...components]; c[i] = { ...c[i], category: e.target.value as any }; setComponents(c) }} style={{ maxWidth: 100 }}>
                    <option value="MATERIAL">Material</option>
                    <option value="MO">Mano de Obra</option>
                    <option value="EQUIPO">Equipo</option>
                    <option value="TRANSPORT">Transporte</option>
                  </select>
                <button className="admin-btn xs danger" onClick={() => setComponents(components.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button className="admin-btn sm" onClick={() => setComponents([...components, { ...emptyComponent, unitId: units[0]?.id ?? 0 }])}>+ Componente</button>
            <div className="item-form-actions">
              <button className="admin-btn primary" onClick={handleApuSave}>{editApuId ? "Guardar" : "Crear"}</button>
              <button className="admin-btn" onClick={resetApuForm}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div className="apu-grid">
        {filtered.map((apu) => {
          const mo = apu.components.filter((c) => c.category === "MO").reduce((s, c) => s + c.totalCost, 0)
          const mat = apu.components.filter((c) => c.category === "MATERIAL").reduce((s, c) => s + c.totalCost, 0)
          const equipo = apu.components.filter((c) => c.category === "EQUIPO").reduce((s, c) => s + c.totalCost, 0)
          const transp = apu.components.filter((c) => c.category === "TRANSPORT").reduce((s, c) => s + c.totalCost, 0)
          const capNum = apu.code.split(".")[0]
          const color = CAP_COLORS[capNum] || "#666"

          return (
            <div key={apu.id} className="apu-card">
              <div className="apu-header" style={{ background: `linear-gradient(90deg, ${color}, ${color}dd)` }}
                onClick={() => setExpanded(expanded === apu.code ? null : apu.code)}>
                <div>
                  <span className="apu-code">{apu.code}</span>
                  <span className="apu-title">{apu.title}</span>
                </div>
                <div>
                  <span className="apu-und">{apu.unit.code}</span>
                  <span style={{ fontSize: "0.75em", opacity: 0.7, marginRight: 4 }}>AIU:</span>
                  <span className="apu-total">{formatCOP(apu.totalPrice)}</span>
                  <button className="admin-btn xs" onClick={(e) => { e.stopPropagation(); startApuEdit(apu) }} title="Editar" style={{ margin: "0 4px" }}>✏️</button>
                  <button className="admin-btn xs danger" onClick={(e) => { e.stopPropagation(); handleApuDelete(apu) }} title="Eliminar">🗑️</button>
                  <span className={`apu-toggle ${expanded === apu.code ? "open" : ""}`}>▼</span>
                </div>
              </div>
              {expanded === apu.code && (
                <div className="apu-body">
                  <table>
                    <thead>
                      <tr>
                        <th>Código</th>
                        <th style={{ width: "30%" }}>Insumo</th>
                        <th className="num">Und</th>
                        <th className="num">Cant</th>
                        <th className="num">Vr. Unit.</th>
                        <th className="num">Vr. Total</th>
                        <th className="num" style={{ width: 70 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(["MO", "MATERIAL", "EQUIPO", "TRANSPORT"] as const).flatMap((cat) => {
                        const comps = apu.components.filter((c) => c.category === cat)
                        if (comps.length === 0 && addCompCat !== cat) return []
                        const rows: JSX.Element[] = []
                        // Category header
                        if (comps.length > 0 || addCompCat === cat) {
                          rows.push(
                            <tr key={`h-${cat}`}>
                              <td className="apu-group-header" colSpan={7}>
                                {CAT_LABELS[cat]}
                                <button className="admin-btn xs" style={{ marginLeft: 10, fontSize: "0.8em" }}
                                  onClick={() => { setAddCompCat(addCompCat === cat ? null : cat); setEditCompKey(null); resetCompForm(); setCompForm((f) => ({ ...f, category: cat })) }}>
                                  + Insumo
                                </button>
                              </td>
                            </tr>
                          )
                        }
                        // Existing components
                        for (const c of comps) {
                          const compKey = `${apu.id}|${c.id}`
                          if (editCompKey === compKey) {
                            rows.push(
                              <tr key={`e-${c.id}`}>
                                <td className="num" style={{ opacity: 0.5 }}>{c.code}</td>
                                <td>
                                  <input value={compForm.description} onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
                                    style={{ width: "100%", padding: "2px 6px", fontSize: "0.9em" }} />
                                </td>
                                <td className="num">
                                  <select value={compForm.unitId} onChange={(e) => setCompForm({ ...compForm, unitId: Number(e.target.value) })}
                                    style={{ padding: "2px 4px", fontSize: "0.9em", maxWidth: 60 }}>
                                    {units.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
                                  </select>
                                </td>
                                <td className="num">
                                  <input type="number" step="0.01" value={compForm.quantity} onChange={(e) => setCompForm({ ...compForm, quantity: Number(e.target.value) })}
                                    style={{ width: 50, padding: "2px 4px", fontSize: "0.9em" }} />
                                </td>
                                <td className="num">
                                  <input type="number" step="0.01" value={compForm.unitPrice} onChange={(e) => setCompForm({ ...compForm, unitPrice: Number(e.target.value) })}
                                    style={{ width: 70, padding: "2px 4px", fontSize: "0.9em" }} />
                                </td>
                                <td className="num">{formatCOP(compForm.quantity * compForm.unitPrice)}</td>
                                <td className="num">
                                  <button className="admin-btn xs" onClick={() => handleSaveComp(apu.id, c.id)}>💾</button>
                                  <button className="admin-btn xs" onClick={() => setEditCompKey(null)}>✕</button>
                                </td>
                              </tr>
                            )
                          } else {
                            rows.push(
                              <tr key={c.id}>
                                <td className="num" style={{ opacity: 0.5 }}>{c.code}</td>
                                <td>{c.description}</td>
                                <td className="num">{c.unit.code}</td>
                                <td className="num">{c.quantity}</td>
                                <td className="num">{formatCOP(c.unitPrice)}</td>
                                <td className="num">{formatCOP(c.totalCost)}</td>
                                <td className="num">
                                  <button className="admin-btn xs" onClick={() => handleEditComp(apu.id, c)} title="Editar">✏️</button>
                                  <button className="admin-btn xs danger" onClick={() => handleDeleteComp(apu.id, c.id)} title="Eliminar">🗑️</button>
                                </td>
                              </tr>
                            )
                          }
                        }
                        // New component inline form
                        if (addCompCat === cat) {
                          rows.push(
                            <tr key={`n-${cat}`}>
                              <td></td>
                              <td>
                                <input value={compForm.description} onChange={(e) => setCompForm({ ...compForm, description: e.target.value })}
                                  placeholder="Descripción" style={{ width: "100%", padding: "2px 6px", fontSize: "0.9em" }} />
                              </td>
                              <td className="num">
                                <select value={compForm.unitId} onChange={(e) => setCompForm({ ...compForm, unitId: Number(e.target.value) })}
                                  style={{ padding: "2px 4px", fontSize: "0.9em", maxWidth: 60 }}>
                                  <option value={0}>Und</option>
                                  {units.map((u) => <option key={u.id} value={u.id}>{u.code}</option>)}
                                </select>
                              </td>
                              <td className="num">
                                <input type="number" step="0.01" value={compForm.quantity} onChange={(e) => setCompForm({ ...compForm, quantity: Number(e.target.value) })}
                                  placeholder="Cant" style={{ width: 50, padding: "2px 4px", fontSize: "0.9em" }} />
                              </td>
                              <td className="num">
                                <input type="number" step="0.01" value={compForm.unitPrice} onChange={(e) => setCompForm({ ...compForm, unitPrice: Number(e.target.value) })}
                                  placeholder="Vr. Unit" style={{ width: 70, padding: "2px 4px", fontSize: "0.9em" }} />
                              </td>
                              <td></td>
                              <td className="num">
                                <button className="admin-btn xs primary" onClick={() => handleAddComp(apu.id)}>+</button>
                                <button className="admin-btn xs" onClick={() => setAddCompCat(null)}>✕</button>
                              </td>
                            </tr>
                          )
                        }
                        return rows
                      })}
                    </tbody>
                  </table>
                  <div className="apu-summary">
                    <div className="apu-sum-card">
                      <div className="apu-sum-title">Costo Directo</div>
                      <div className="apu-sum-row">
                        {mo > 0 && <div className="apu-sum-item"><span>MO</span><span className="red">{formatCOP(mo)}</span></div>}
                        {mat > 0 && <div className="apu-sum-item"><span>Materiales</span><span className="blue">{formatCOP(mat)}</span></div>}
                        {equipo > 0 && <div className="apu-sum-item"><span>Equipo</span><span className="purple">{formatCOP(equipo)}</span></div>}
                        {transp > 0 && <div className="apu-sum-item"><span>Transporte</span><span className="green">{formatCOP(transp)}</span></div>}
                      </div>
                      <div className="apu-sum-total gold">{formatCOP(apu.totalCost)}</div>
                    </div>
                    <div className="apu-sum-card">
                      <div className="apu-sum-title">Costo Indirecto (AIU)</div>
                      <div className="apu-sum-row">
                        <div className="apu-sum-item"><span>Admin {apu.adminPct}%</span><span className="orange">{formatCOP(apu.adminCost)}</span></div>
                        <div className="apu-sum-item"><span>Utilidad {apu.utilityPct}%</span><span className="orange">{formatCOP(apu.utilityCost)}</span></div>
                        <div className="apu-sum-item"><span>IVA {apu.ivaPct}%</span><span className="orange">{formatCOP(apu.ivaCost)}</span></div>
                      </div>
                      <div className="apu-sum-total orange">{formatCOP(apu.adminCost + apu.utilityCost + apu.ivaCost)}</div>
                    </div>
                    <div className="apu-sum-card apu-sum-hero">
                      <div className="apu-sum-title">Precio Venta</div>
                      <div className="apu-sum-hero-val">{formatCOP(apu.totalPrice)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
