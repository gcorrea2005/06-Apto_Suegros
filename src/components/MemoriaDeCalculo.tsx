import { useState, useEffect, useRef } from "react"

type Report = "presupuesto-general" | "cantidades" | "apus" | "insumos" | "especificaciones"

const REPORTS: { key: Report; label: string }[] = [
  { key: "presupuesto-general", label: "1. Presupuesto General" },
  { key: "apus", label: "2. APUs Detallado" },
  { key: "insumos", label: "3. Insumos" },
  { key: "cantidades", label: "4. Cantidades" },
  { key: "especificaciones", label: "5. Especificaciones" },
]

export function MemoriaDeCalculo() {
  const [report, setReport] = useState<Report>("presupuesto-general")
  const [html, setHtml] = useState("")
  const [loading, setLoading] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  const loadReport = () => {
    setLoading(true)
    fetch(`/api/reports/${report}?format=html`)
      .then((r) => r.text())
      .then((text) => { setHtml(text); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { loadReport() }, [report])

  const handlePrint = () => {
    const title = REPORTS.find((r) => r.key === report)?.label || "Informe"
    const inner = contentRef.current?.innerHTML || ""
    if (!inner) return
    const win = window.open("", "_blank")
    if (!win) return
    const C = "<"
    const css = `
body{font-family:-apple-system,'Segoe UI',Arial,sans-serif;padding:24px 32px;max-width:1000px;margin:0 auto;color:#000;background:#fff;font-size:11px;line-height:1.3}
.rheader{border:1px solid #888;padding:8px 12px 6px;margin-bottom:10px;background:#f0f0f0}
.rheader-title{font-size:1.4em;margin:0;font-weight:700;letter-spacing:1px;text-align:center;color:#000}
.rheader-title .dc{font-size:1.1em;font-weight:900}
.rheader-divider{border-top:1px solid #aaa;margin:5px 0}
.rheader-meta{display:flex;gap:4px;justify-content:center;flex-wrap:wrap}
.rheader-meta-group{display:flex;flex-direction:column;gap:0;border:1px solid #aaa;padding:3px 8px 2px}
.rheader-meta-label{color:#555;font-weight:600;text-transform:uppercase;letter-spacing:1px;font-size:0.45rem;text-align:center}
.rheader-meta-value{font-weight:500;font-size:0.6rem;text-align:center;color:#000}
h2{font-size:0.78rem;margin:8px 0 4px;color:#000;font-weight:700}
h3{font-size:0.65rem;margin:8px 0 4px;color:#222;font-weight:600;text-transform:uppercase;letter-spacing:1px}
h4{font-size:0.72rem;margin:6px 0 3px;color:#000;font-weight:600}
hr{border:none;border-top:1px solid #aaa;margin:5px 0}
table{width:100%;border-collapse:collapse;margin:0 0 3px;font-size:0.65rem;border:1px solid #888}
th{background:#c0c0c0;color:#000;font-weight:700;font-size:0.5rem;text-transform:uppercase;letter-spacing:0.5px;padding:3px 6px;border-bottom:1px solid #888;text-align:center}
th:first-child{width:40px}
th:nth-child(2){text-align:left}
td{padding:2px 6px;border-bottom:1px solid #ccc;color:#000;font-size:0.65rem}
td.num{text-align:right;font-family:Consolas,monospace;font-size:0.65rem;color:#000}
td:first-child{text-align:center;color:#333;font-family:Consolas,monospace;font-size:0.65rem}
tr:nth-child(even) td{background:#f0f0f0}
tr.chapter-head td{background:#bbb;font-weight:700;padding:4px 6px;border-top:1px solid #888;color:#000}
tr.chapter-head td:first-child{color:#000}
tr:last-child td,.rtotal td{background:#444;color:#fff;padding:4px 6px}
.rtotal td:last-child{font-weight:800;font-size:0.75rem}
p{margin:1px 0;line-height:1.3;font-size:0.7rem;color:#000}
p strong{color:#000}
code{background:#e8e8e8;padding:0 4px;border-radius:2px;font-size:0.7rem;font-family:Consolas,monospace;color:#000}
ol{padding-left:18px}
li{margin:1px 0;font-size:0.7rem;color:#000;line-height:1.3}
li strong{color:#000}
pre{background:#f0f0f0;padding:6px 10px;border-left:2px solid #888;margin:4px 0}
pre code{background:none;padding:0}
.report-footer{margin-top:16px;padding:4px 0;text-align:center;border-top:1px solid #aaa}
.report-footer-name{font-size:0.75em;font-weight:900;color:#000;text-transform:uppercase;letter-spacing:0.5px}
.report-footer-role{font-size:0.45em;color:#333;text-transform:uppercase;letter-spacing:3px;font-weight:700}
.report-footer-meta{font-size:0.5em;color:#444;display:flex;gap:6px;justify-content:center;margin-top:1px}
.apu-card{display:flex;gap:4px;margin:4px 0;border:1px solid #888;padding:6px 8px;background:#fafafa}
.apu-card-item{display:flex;flex-direction:column;gap:1px;border:1px solid #ccc;padding:3px 6px;flex:1;min-width:0}
.apu-card-label{color:#555;font-weight:700;text-transform:uppercase;letter-spacing:1px;font-size:0.45rem}
.apu-card-value{color:#000;font-weight:500;font-size:0.65rem}
.apu-card-name{flex:4}
.apu-card-unit{flex:0.6;min-width:40px}
.apu-card-code{flex:0.8;min-width:50px}
.apu-card-total{flex:1.5;background:#e8e8e8;border-color:#aaa}
.apu-card-total .apu-card-value{font-weight:700;font-family:Consolas,monospace;color:#000}
.apu-card-name .apu-card-value{font-weight:600}
@media print{body{padding:18px}th{background:#c0c0c0!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}tr:nth-child(even) td{background:#eee!important}tr.chapter-head td{background:#bbb!important}tr:last-child td,.rtotal td{background:#444!important;color:#fff!important}}
`
    win.document.write(`${C}!DOCTYPE html>${C}html>${C}head>
${C}meta charset="UTF-8">${C}title>${title}${C}/title>
${C}style>${css}${C}/style>${C}/head>${C}body>${inner}${C}script>setTimeout(function(){window.print()},300)${C}/script>${C}/body>${C}/html>`)
    win.document.close()
  }

  return (
    <div className="memoria">
      <div className="controls">
        {REPORTS.map((r) => (
          <button key={r.key} className={`admin-btn ${report === r.key ? "primary" : ""} sm`} onClick={() => setReport(r.key)}>
            {r.label}
          </button>
        ))}
        <button className="admin-btn sm" style={{ marginLeft: "auto", background: "#ffe066", color: "#1a1a2e" }} onClick={handlePrint}>
          🖨️ Imprimir
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.5 }}>Cargando...</div>
      ) : (
        <section className="mc-section report-view" ref={contentRef}>
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <div className="report-footer">
            <div className="report-footer-watermark">
              <div className="report-footer-watermark-inner">
                <div className="report-footer-watermark-icon">&#x2699; &#x2696;</div>
                <div className="report-footer-watermark-text">E.S.</div>
              </div>
            </div>
            <div className="report-footer-content">
              <div className="report-footer-body">
                <div className="report-footer-name">Ing. Jorge Giovanni Correa Mejía</div>
                <div className="report-footer-role">Constructor Responsable</div>
                <div className="report-footer-meta">
                  <span>CC No. 4.252.533</span>
                  <span className="rsep">&#x2022;</span>
                  <span>gcorrea2005@gmail.com</span>
                  <span className="rsep">&#x2022;</span>
                  <span>Cel. 304 445 2987</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}