import { useState, useEffect } from "react"
import { api, type Chapter } from "../api"

export function AdminChapters() {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [editCode, setEditCode] = useState<string | null>(null)
  const [form, setForm] = useState({ code: "", title: "", icon: "📋", sortOrder: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const load = () => api.chapters().then(setChapters).catch((e) => setError(e.message)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setError("")
    try {
      if (editCode) {
        await api.updateChapter(editCode, { title: form.title, icon: form.icon, sortOrder: form.sortOrder })
      } else {
        await api.createChapter(form)
      }
      setEditCode(null)
      setForm({ code: "", title: "", icon: "📋", sortOrder: 0 })
      await load()
    } catch (e: any) { setError(e.message) }
  }

  const handleDelete = async (code: string) => {
    if (!confirm(`¿Eliminar capítulo ${code}?`)) return
    setError("")
    try { await api.deleteChapter(code); await load() }
    catch (e: any) { setError(e.message) }
  }

  const startEdit = (ch: Chapter) => {
    setEditCode(ch.code)
    setForm({ code: ch.code, title: ch.title, icon: ch.icon, sortOrder: ch.sortOrder })
  }

  const cancel = () => { setEditCode(null); setForm({ code: "", title: "", icon: "📋", sortOrder: 0 }); setError("") }

  if (loading) return <div className="mc-section" style={{ textAlign: "center", padding: "60px 20px", opacity: 0.5 }}>Cargando...</div>

  return (
    <div className="memoria">
      <div className="mc-section">
        <h2>{editCode ? "Editar Capítulo" : "Nuevo Capítulo"}</h2>
        {error && <div style={{ color: "#ff6b6b", marginBottom: 10, fontSize: "0.85em" }}>{error}</div>}
        <div className="admin-form">
          {!editCode && (
            <input placeholder="Código (ej: c13)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          )}
          <input placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="Icono (emoji)" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} style={{ maxWidth: 100 }} />
          <input type="number" placeholder="Orden" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} style={{ maxWidth: 80 }} />
          <button className="admin-btn primary" onClick={handleSave}>{editCode ? "Guardar" : "Crear"}</button>
          {editCode && <button className="admin-btn" onClick={cancel}>Cancelar</button>}
        </div>
      </div>

      <div className="mc-section">
        <h2>Capítulos ({chapters.length})</h2>
        <table>
          <thead>
            <tr><th>Código</th><th>Icono</th><th>Título</th><th>Orden</th><th>Items</th><th></th></tr>
          </thead>
          <tbody>
            {chapters.map((ch) => (
              <tr key={ch.code}>
                <td className="num">{ch.code}</td>
                <td style={{ textAlign: "center", fontSize: "1.2em" }}>{ch.icon}</td>
                <td>{ch.title}</td>
                <td className="num">{ch.sortOrder}</td>
                <td className="num">—</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="admin-btn sm" onClick={() => startEdit(ch)}>✏️</button>
                  <button className="admin-btn sm danger" onClick={() => handleDelete(ch.code)} style={{ marginLeft: 4 }}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
