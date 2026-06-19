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
    win.document.write(`${C}!DOCTYPE html>${C}html>${C}head>
${C}meta charset="UTF-8">${C}title>${title}${C}/title>
${C}style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Helvetica Neue',Arial,sans-serif;padding:48px 52px;max-width:1050px;margin:0 auto;color:#111;background:#fff;font-size:14px;line-height:1.5}
.rheader{position:relative;margin-bottom:20px;background:#f7f7f9;border:1px solid #d8d8d8;border-radius:10px;padding:14px 20px 12px;background-image:linear-gradient(rgba(0,0,0,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.012) 1px,transparent 1px);background-size:24px 24px;overflow:hidden}
.rheader::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#999,#aaa20 80%);z-index:2}
.rheader::after{content:'PRESUPUESTO';position:absolute;bottom:-4px;right:16px;font-size:5em;font-weight:900;color:rgba(0,0,0,0.015);letter-spacing:8px;line-height:0.7;pointer-events:none;white-space:nowrap;z-index:0}
.rheader-inner{position:relative;z-index:1}
.rheader-top{text-align:center}
.rheader-title{font-family:Georgia,'Times New Roman',Times,serif;font-size:2.4em;margin:0;color:#111;font-weight:700;letter-spacing:4px;line-height:1.0;white-space:nowrap}
.rheader-title .dc{font-size:1.6em;font-weight:900;vertical-align:middle;line-height:0.8}
.rheader-divider{height:1px;background:linear-gradient(90deg,#bbb,#ccc20 60%,transparent);margin:10px 0 8px}
.rheader-meta{display:flex;gap:8px;justify-content:center}
.rheader-meta-group{position:relative;display:flex;flex-direction:column;gap:2px;background:linear-gradient(160deg,#f8f8fa 0%,#eee 100%);border:1px solid #ccc;border-radius:7px;padding:7px 12px 5px;box-shadow:0 2px 12px rgba(0,0,0,0.04),inset 0 1px 0 #fff8}
.rheader-meta-group::before{content:'';position:absolute;top:-1px;left:18px;right:18px;height:3px;background:linear-gradient(90deg,#999,#bbb30);border-radius:0 0 2px 2px}
.rheader-meta-group::after{content:'';position:absolute;top:0;left:0;right:0;bottom:0;border-radius:10px;box-shadow:inset 0 -1px 0 #00000008;pointer-events:none}
.rheader-meta-row{display:flex;flex-direction:column;align-items:center;gap:1px;line-height:1.4}
.rheader-meta-label{color:#888;font-weight:600;text-transform:uppercase;letter-spacing:2px;font-size:0.55rem;text-align:center}
.rheader-meta-value{color:#111;font-weight:500;font-size:0.75rem;text-align:center}
h2{font-size:0.95rem;margin:16px 0 10px;color:#222;font-weight:500}
h3{font-size:0.75rem;margin:14px 0 8px;color:#555;font-weight:600;text-transform:uppercase;letter-spacing:2px}
h4{font-size:0.82rem;margin:12px 0 6px;color:#333;font-weight:600}
hr{border:none;height:1px;background:linear-gradient(90deg,#ccc,transparent 80%);margin:10px 0}
table{width:100%;border-collapse:collapse;margin:0 0 6px;font-size:0.78rem;border:1.5px solid #aaa;border-radius:10px;overflow:hidden}
th{background:#d0d0d0;color:#444;font-weight:700;font-size:0.55rem;text-transform:uppercase;letter-spacing:2px;padding:8px 10px;border:none;border-bottom:1.5px solid #aaa;text-align:center}
th:first-child{width:56px}
th:nth-child(2){text-align:left}
th:nth-child(3){width:44px;text-align:center}
th:nth-child(4){width:54px;text-align:right}
th:nth-child(5){text-align:right}
th:nth-child(6){text-align:right}
th:last-child{text-align:right}
.tbl-cant th:first-child,.tbl-cant td:first-child{text-align:left;width:auto}
.tbl-cant th:nth-child(2),.tbl-cant td:nth-child(2){text-align:center;width:44px}
.tbl-cant th:nth-child(n+3),.tbl-cant td:nth-child(n+3){text-align:right;width:72px;white-space:nowrap}
.tbl-cant tr:last-child td{background:none;border-top:none;box-shadow:none;padding:5px 10px}
td{padding:5px 10px;border:none;color:#333;font-size:0.78rem;vertical-align:middle;border-bottom:1px solid #e0e0e0}
td.num{text-align:right;font-variant-numeric:tabular-nums;font-family:'JetBrains Mono','Consolas','Courier New',monospace;font-size:0.78rem;color:#555;white-space:nowrap}
td:nth-child(1){text-align:center;color:#888;font-family:'JetBrains Mono','Consolas','Courier New',monospace;font-size:0.78rem;font-weight:500;letter-spacing:0.5px}
td:nth-child(2){text-align:left}
td:nth-child(3),td:nth-child(4),td:nth-child(5),td:nth-child(6),td:nth-child(7){text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;color:#555;font-family:'JetBrains Mono','Consolas','Courier New',monospace;font-size:0.78rem}
td:last-child{text-align:right;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;color:#111;font-family:'JetBrains Mono','Consolas','Courier New',monospace;font-size:0.78rem}
td:last-child strong{font-weight:700;color:#111}
tr:nth-child(even) td{background:#f4f4f6}
tr td:nth-child(2) strong:only-child{font-weight:700;color:#111;letter-spacing:1.5px;font-size:0.78rem}
tr:has(td:nth-child(2) strong:only-child) td{background:#c8c8c8;border-top:1.5px solid #999;border-bottom:1px solid #bbb;padding:7px 12px;font-weight:500}
tr:has(td:nth-child(2) strong:only-child) td:first-child{font-weight:700;color:#111;font-family:'JetBrains Mono','Consolas','Courier New',monospace;font-size:0.78rem}
tr:has(td:nth-child(2) strong:only-child) td:nth-child(2){border-left:3px solid #888;padding-left:12px}
 tr:last-child td, .rtotal td{background:linear-gradient(180deg,#555 0%,#444 100%);border-top:1.5px solid #777;border-bottom:none;padding:0;box-shadow:none}
.rtotal td:nth-child(2){text-transform:uppercase;letter-spacing:3px;font-weight:600;color:#bbb;font-size:0.62rem;text-align:center;padding:8px 10px 3px;position:relative}
.rtotal td:nth-child(2)::before,.rtotal td:nth-child(2)::after{content:'';position:absolute;top:50%;width:20%;height:1px;background:rgba(255,255,255,0.08)}
.rtotal td:nth-child(2)::before{left:8%}
.rtotal td:nth-child(2)::after{right:8%}
.rtotal td:last-child{font-weight:800;color:#fff;font-size:0.95rem;text-align:right;letter-spacing:0.5px;padding:2px 10px 8px}
.apu-card{display:flex;gap:6px;margin:0 0 0;border:1.5px solid #aaa;border-radius:10px;padding:10px 12px 10px;background:linear-gradient(160deg,#f5f5f5 0%,#fafafa 100%)}
.apu-card-item{display:flex;flex-direction:column;gap:2px;background:#e8e8e8;border:1px solid #c0c0c0;border-radius:7px;padding:6px 10px 5px;flex:1;min-width:0}
.apu-card-name{flex:4}
.apu-card-unit{flex:0.6;min-width:48px}
.apu-card-code{flex:0.8;min-width:60px}
.apu-card-code .apu-card-value{font-family:'JetBrains Mono','Consolas','Courier New',monospace;font-weight:600;color:#555}
.apu-card-total{flex:1.5;background:#ddd;border-color:#aaa;position:relative}
.apu-card-total::before{content:'';position:absolute;top:4px;left:-1px;bottom:4px;width:2px;background:linear-gradient(180deg,#888,#ccc);border-radius:0 2px 2px 0}
.apu-card-label{color:#888;font-weight:700;text-transform:uppercase;letter-spacing:2px;font-size:0.5rem;line-height:1.2}
.apu-card-value{color:#222;font-weight:500;font-size:0.78rem;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.apu-card-name .apu-card-value{font-weight:600;font-size:0.8rem;color:#111}
.apu-card-total .apu-card-value{font-family:'JetBrains Mono','Consolas','Courier New',monospace;color:#000;font-weight:700;font-size:0.8rem;letter-spacing:0.3px}
p{margin:3px 0;line-height:1.5;font-size:0.82rem;color:#555}
p strong{color:#222}
code{background:#eee;padding:2px 8px;border-radius:4px;font-size:0.82rem;color:#555;font-family:'JetBrains Mono','Consolas','Courier New',monospace}
ol{padding-left:24px}
li{margin:3px 0;font-size:0.82rem;color:#555;line-height:1.5}
li strong{color:#222}
pre{background:#f0f0f2;padding:12px 16px;border-radius:8px;border-left:3px solid #aaa;margin:10px 0}
pre code{background:none;padding:0;font-size:0.82rem;color:#555;line-height:1.5}
.report-footer{margin-top:32px;padding:10px 0 10px;position:relative;overflow:hidden}
.report-footer::after{content:'';position:absolute;bottom:0;left:0;right:0;height:1px;background:#e0e0e0}
.report-footer-watermark{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:80px;height:80px;border:1.5px solid rgba(0,0,0,0.07);border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.report-footer-watermark-inner{border:1px solid rgba(0,0,0,0.045);border-radius:50%;width:64px;height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.report-footer-watermark-icon{font-size:0.8em;opacity:0.08;letter-spacing:3px}
.report-footer-watermark-text{font-size:0.3em;opacity:0.06;text-transform:uppercase;letter-spacing:2px}
.report-footer-content{display:flex;flex-direction:column;align-items:center;gap:4px;position:relative;z-index:1}
.report-footer-body{text-align:center;display:flex;flex-direction:column;gap:3px;position:relative;padding-top:14px}
.report-footer-body::before{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);width:340px;height:2.5px;background:#333}
.report-footer-name{font-size:0.95em;font-weight:900;color:#111;letter-spacing:1.5px;text-transform:uppercase}
.report-footer-role{font-size:0.55em;color:#666;text-transform:uppercase;letter-spacing:6px;font-weight:700}
.report-footer-meta{font-size:0.62em;color:#888;display:flex;gap:10px;flex-wrap:wrap;justify-content:center;letter-spacing:0.8px;margin-top:2px}
.report-footer-meta .rsep{opacity:0.3}
@media print{body{padding:32px}thead{display:table-header-group}th{background:#d5d5d5!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}tr:nth-child(even) td{background:#ececee!important}tr:has(td:nth-child(2) strong:only-child) td{background:#bbb!important}tr:last-child td,.rtotal td{background:#444!important;color:#fff!important}tr:last-child td:last-child strong,.rtotal td strong{color:#fff!important}.report-footer{break-inside:avoid!important;page-break-inside:avoid!important}}
${C}/style>${C}/head>${C}body>${inner}${C}script>setTimeout(function(){window.print()},300)${C}/script>${C}/body>${C}/html>`)
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
                <div className="report-footer-role">Diseñador Estructural</div>
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