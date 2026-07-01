import { useState, useEffect } from "react"
import { api, type BudgetSummary } from "./api"
import { Presupuesto } from "./components/Presupuesto"
import { APUs } from "./components/APUs"
import { Insumos } from "./components/Insumos"
import { MemoriaDeCalculo } from "./components/MemoriaDeCalculo"

import "./App.css"

type Tab = "presupuesto" | "apus" | "insumos" | "memoria"

function formatCOP(n: number) {
  return "$ " + n.toLocaleString("es-CO")
}

function App() {
  const [tab, setTab] = useState<Tab>("presupuesto")
  const [summary, setSummary] = useState<BudgetSummary | null>(null)

  const refreshSummary = () => {
    api.budgetSummary().then(setSummary).catch((e) => console.error("Error loading summary:", e))
  }

  useEffect(() => { refreshSummary() }, [])

  useEffect(() => { refreshSummary() }, [tab])

  return (
    <div className="app">
      <header className="header">
        <h1>
          <span>Presupuesto</span> 3 Baños
        </h1>
        <p>Remodelación completa · Bogotá, Colombia</p>
        <nav className="tabs">
          <button className={tab === "presupuesto" ? "active" : ""} onClick={() => setTab("presupuesto")}>
            Presupuesto
          </button>
          <button className={tab === "apus" ? "active" : ""} onClick={() => setTab("apus")}>
            APU's
          </button>
          <button className={tab === "insumos" ? "active" : ""} onClick={() => setTab("insumos")}>
            Insumos
          </button>
          <button className={tab === "memoria" ? "active" : ""} onClick={() => setTab("memoria")}>
            Informes
          </button>
        </nav>
      </header>

      {summary && tab === "presupuesto" && (
        <div className="dashboard-cols">
          <div className="dash-col">
            <div className="dash-col-title">Costo Directo</div>
            <div className="dash-col-items">
              <div className="dash-col-item"><span className="dash-col-label">MO</span><span className="dash-col-val red">{formatCOP(summary.totalMO)}</span></div>
              <div className="dash-col-item"><span className="dash-col-label">Materiales</span><span className="dash-col-val blue">{formatCOP(summary.totalMat)}</span></div>
              <div className="dash-col-item"><span className="dash-col-label">Equipo</span><span className="dash-col-val purple">{formatCOP(summary.totalEquipo)}</span></div>
              <div className="dash-col-item"><span className="dash-col-label">Transporte</span><span className="dash-col-val green">{formatCOP(summary.totalTransp)}</span></div>
            </div>
            <div className="dash-col-total">
              <span className="dash-col-total-label">Total</span>
              <span className="dash-col-total-val gold">{formatCOP(summary.totalGeneral)}</span>
            </div>
          </div>
          <div className="dash-col">
            <div className="dash-col-title">Costo Indirecto (AIU)</div>
            <div className="dash-col-items">
              <div className="dash-col-item"><span className="dash-col-label">Admin 15%</span><span className="dash-col-val orange">{formatCOP(summary.totalAdmin)}</span></div>
              <div className="dash-col-item"><span className="dash-col-label">Utilidad 10%</span><span className="dash-col-val orange">{formatCOP(summary.totalUtility)}</span></div>
              <div className="dash-col-item"><span className="dash-col-label">IVA 19%</span><span className="dash-col-val orange">{formatCOP(summary.totalIVA)}</span></div>
            </div>
            <div className="dash-col-total">
              <span className="dash-col-total-label">Total</span>
              <span className="dash-col-total-val orange">{formatCOP(summary.totalAdmin + summary.totalUtility + summary.totalIVA)}</span>
            </div>
          </div>
          <div className="dash-col dash-col-hero">
            <div className="dash-col-title">Precio Venta</div>
            <div className="dash-col-hero-val">{formatCOP(summary.totalPrice)}</div>
            <div className="dash-col-chart">
              <div className="dash-col-bar">
                {(() => {
                  const items = [
                    { v: summary.totalGeneral, color: "#4facfe" },
                    { v: summary.totalAdmin, color: "#ffa502" },
                    { v: summary.totalUtility, color: "#ffe066" },
                    { v: summary.totalIVA, color: "#ff6b6b" },
                  ]
                  return items.map((item, i) => {
                    const pct = (item.v / summary.totalPrice) * 100
                    return <div key={i} className="dash-col-bar-seg" style={{ width: `${pct}%`, background: item.color, opacity: 0.75 }}></div>
                  })
                })()}
              </div>
              <div className="dash-col-bar-legend">
                {(() => {
                  const items = [
                    { v: summary.totalGeneral, color: "#4facfe", label: "CD" },
                    { v: summary.totalAdmin, color: "#ffa502", label: "Admin" },
                    { v: summary.totalUtility, color: "#ffe066", label: "Util" },
                    { v: summary.totalIVA, color: "#ff6b6b", label: "IVA" },
                  ]
                  return items.map((item, i) => (
                    <div key={i} className="dash-col-bar-item">
                      <span className="dash-col-bar-dot" style={{ background: item.color }}></span>
                      {item.label}
                      <span className="dash-col-bar-item-val">{((item.v / summary.totalPrice) * 100).toFixed(1)}%</span>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <main>
        {tab === "presupuesto" && <Presupuesto onNavigateToApus={() => setTab("apus")} />}
        {tab === "apus" && <APUs />}
        {tab === "insumos" && <Insumos />}
        {tab === "memoria" && <MemoriaDeCalculo />}
      </main>

      <footer className="app-footer">
        <div className="app-footer-accent"></div>
        <div className="app-footer-logo">Presupuesto 3 Baños</div>
        <div className="app-footer-seal">
          <div className="app-footer-seal-icon">&#x2699; &#x2696;</div>
          <div className="app-footer-seal-content">
            <div className="app-footer-name">Ing. Jorge Giovanni Correa Mejía</div>
            <div className="app-footer-role">Constructor Responsable</div>
          </div>
        </div>
        <div className="app-footer-meta">
          <span>CC No. 4.252.533</span>
          <span className="sep">&#x2022;</span>
          <a href="mailto:gcorrea2005@gmail.com">gcorrea2005@gmail.com</a>
          <span className="sep">&#x2022;</span>
          <span>Cel. 304 445 2987</span>
        </div>
      </footer>
    </div>
  )
}

export default App
