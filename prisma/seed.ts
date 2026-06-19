import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "path"

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db")
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const prisma = new PrismaClient({ adapter })

type Cat = "MO" | "MATERIAL" | "EQUIPO" | "TRANSPORT"

const U = (code: string, id: number) => id

async function main() {
  // ── Clean up existing data (in order of FK deps) ──
  await prisma.aPUComponent.deleteMany()
  await prisma.itemQuantity.deleteMany()
  await prisma.aPU.deleteMany()
  await prisma.item.deleteMany()
  await prisma.chapter.deleteMany()
  await prisma.room.deleteMany()
  await prisma.unit.deleteMany()

  // ── Units ──
  const units = await Promise.all([
    prisma.unit.create({ data: { code: "m2", name: "Metro cuadrado" } }),
    prisma.unit.create({ data: { code: "und", name: "Unidad" } }),
    prisma.unit.create({ data: { code: "ml", name: "Metro lineal" } }),
    prisma.unit.create({ data: { code: "pto", name: "Punto" } }),
    prisma.unit.create({ data: { code: "gl", name: "Global" } }),
    prisma.unit.create({ data: { code: "kg", name: "Kilogramo" } }),
    prisma.unit.create({ data: { code: "hr", name: "Hora" } }),
    prisma.unit.create({ data: { code: "bulto", name: "Bulto 50kg" } }),
    prisma.unit.create({ data: { code: "galon", name: "Galón" } }),
    prisma.unit.create({ data: { code: "m3", name: "Metro cúbico" } }),
    prisma.unit.create({ data: { code: "vj", name: "Viaje" } }),
  ])
  const u = Object.fromEntries(units.map(x => [x.code, x.id]))

  // ── Rooms ──
  const rooms = await Promise.all([
    prisma.room.create({ data: { name: "Baño 1", width: 1.20, length: 1.50, height: 2.20 } }),
    prisma.room.create({ data: { name: "Baño 2", width: 1.25, length: 2.15, height: 2.20 } }),
    prisma.room.create({ data: { name: "Baño 3", width: 1.25, length: 2.15, height: 2.20 } }),
  ])
  const roomIdx = Object.fromEntries(rooms.map(r => [r.name, r.id]))
  const rKeys = ["Baño 1", "Baño 2", "Baño 3"]

  // ── Chapters ──
  const chapters = await Promise.all([
    prisma.chapter.create({ data: { code: "c1", title: "Demolición y Desmonte", icon: "💥", sortOrder: 1 } }),
    prisma.chapter.create({ data: { code: "c2", title: "Instalaciones Hidráulicas", icon: "💧", sortOrder: 2 } }),
    prisma.chapter.create({ data: { code: "c3", title: "Instalaciones Eléctricas", icon: "⚡", sortOrder: 3 } }),
    prisma.chapter.create({ data: { code: "c4", title: "Muros y Pañetes", icon: "🧱", sortOrder: 4 } }),
    prisma.chapter.create({ data: { code: "c5", title: "Cieloraso en Drywall y Pintura", icon: "🎨", sortOrder: 5 } }),
    prisma.chapter.create({ data: { code: "c6", title: "Impermeabilización", icon: "🛡️", sortOrder: 6 } }),
    prisma.chapter.create({ data: { code: "c7", title: "Enchapes y Pisos en Porcelanato", icon: "✨", sortOrder: 7 } }),
    prisma.chapter.create({ data: { code: "c8", title: "Aparatos Sanitarios y Griferías", icon: "🚽", sortOrder: 8 } }),
    prisma.chapter.create({ data: { code: "c9", title: "Carpintería", icon: "🔧", sortOrder: 9 } }),
    prisma.chapter.create({ data: { code: "c10", title: "Accesorios y Varios", icon: "🪞", sortOrder: 10 } }),
    prisma.chapter.create({ data: { code: "c11", title: "Aseo y Finales", icon: "🧹", sortOrder: 11 } }),
    prisma.chapter.create({ data: { code: "c12", title: "Transporte y Logística", icon: "🚚", sortOrder: 12 } }),
    prisma.chapter.create({ data: { code: "c13", title: "Ventanas", icon: "🪟", sortOrder: 13 } }),
  ])
  const ch = Object.fromEntries(chapters.map(x => [x.code, x.id]))

  // ── APU definitions: code, title, unit, components ──
  interface Comp { desc: string; unit: string; cant: number; vru: number; cat: Cat }
  interface APUDef { code: string; title: string; unit: string; comps: Comp[] }

  const apuDefs: APUDef[] = [
    { code: "01.01", title: "Demolición enchape muros", unit: "m2", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.25, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.20, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor (combo, cortafrío, pala)", unit: "gl", cant: 1, vru: 1800, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.016, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.02", title: "Demolición piso", unit: "m2", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.22, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.18, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 2200, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.014, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.03", title: "Demolición pañete de techo", unit: "m2", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.18, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.15, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 1200, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.01, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.04", title: "Desmonte de sanitario", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.40, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.30, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 2400, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.04, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.05", title: "Desmonte de lavamanos", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.35, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.25, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 2000, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.03, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.06", title: "Desmonte de ducha", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.40, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.30, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 2900, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.05, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.07", title: "Desmonte de división de vidrio", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.50, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.60, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 4200, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.06, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.08", title: "Desmonte de accesorios", unit: "gl", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.50, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.50, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 6000, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.12, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.09", title: "Desmonte de puntos eléctricos", unit: "pto", comps: [
      { desc: "Electricista", unit: "hr", cant: 0.30, vru: 32000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.15, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 1700, cat: "EQUIPO" },
      { desc: "Cinta aislante, conectores", unit: "gl", cant: 1, vru: 500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "m3", cant: 0.02, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.10", title: "Desmonte de puerta", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.35, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.25, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 2200, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.04, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.11", title: "Cargue y retiro de escombros", unit: "m3", comps: [
      { desc: "Ayudante", unit: "hr", cant: 0.80, vru: 18000, cat: "MO" },
      { desc: "Botes de escombros (alquiler + bolsas)", unit: "und", cant: 0.30, vru: 35000, cat: "EQUIPO" },
      { desc: "Herramienta menor (pala, carretilla)", unit: "gl", cant: 1, vru: 2400, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.024, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "01.12", title: "Transporte de escombros a disposición final", unit: "m3", comps: [
      { desc: "Volqueta / camión (flete + disposición)", unit: "m3", cant: 1, vru: 39300, cat: "TRANSPORT" },
      { desc: "Cargue manual a volqueta", unit: "hr", cant: 0.15, vru: 18000, cat: "MO" },
    ]},
    { code: "01.13", title: "Desmonte de ventana existente", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 1, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.5, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 2000, cat: "EQUIPO" },
      { desc: "Transporte", unit: "vj", cant: 0.025, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "01.14", title: "Desmonte de mes\u00f3n de m\u00e1rmol", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 1, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.80, vru: 18000, cat: "MO" },
      { desc: "Herramienta menor (cortafr\u00edo, combo, pala)", unit: "gl", cant: 1, vru: 2400, cat: "EQUIPO" },
      { desc: "Transporte", unit: "m3", cant: 0.08, vru: 50000, cat: "TRANSPORT" },
    ]},
    { code: "02.01/02.06", title: "Punto hidráulico PVC (FC+AC, tubería, accesorios, prueba)", unit: "pto", comps: [
      { desc: "Plomero / oficial", unit: "hr", cant: 0.50, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.50, vru: 18000, cat: "MO" },
      { desc: "Tubería PVC 1/2\" (agua fría) 2 ml", unit: "ml", cant: 2, vru: 3500, cat: "MATERIAL" },
      { desc: "Tubería CPVC 1/2\" (agua caliente) 2 ml", unit: "ml", cant: 2, vru: 5200, cat: "MATERIAL" },
      { desc: "Codo, Tee, unión PVC/CPVC", unit: "und", cant: 5, vru: 1200, cat: "MATERIAL" },
      { desc: "Llave de corte 1/2\"", unit: "und", cant: 1, vru: 8500, cat: "MATERIAL" },
      { desc: "Cinta teflón, pegante PVC, limpiador", unit: "gl", cant: 1, vru: 1800, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.04, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "02.07", title: "Instalación de válvula de corte", unit: "und", comps: [
      { desc: "Plomero", unit: "hr", cant: 0.20, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.15, vru: 18000, cat: "MO" },
      { desc: "Válvula de corte esférica 1/2\"", unit: "und", cant: 1, vru: 6500, cat: "MATERIAL" },
      { desc: "Cinta teflón, adaptadores", unit: "gl", cant: 1, vru: 800, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.025, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "02.08", title: "Prueba de estanquidad hidráulica", unit: "gl", comps: [
      { desc: "Plomero", unit: "hr", cant: 1.50, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 1.00, vru: 18000, cat: "MO" },
      { desc: "Manómetro, adaptadores, tapones", unit: "gl", cant: 1, vru: 12000, cat: "MATERIAL" },
      { desc: "Bomba de prueba manual", unit: "gl", cant: 1, vru: 6000, cat: "EQUIPO" },
      { desc: "Transporte", unit: "vj", cant: 0.2, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "03.01/03.06", title: "Punto eléctrico completo (cable, caja, placa + instalación)", unit: "pto", comps: [
      { desc: "Electricista", unit: "hr", cant: 0.50, vru: 32000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.30, vru: 18000, cat: "MO" },
      { desc: "Cable THHN #12 (cobre) 5 ml", unit: "ml", cant: 5, vru: 1800, cat: "MATERIAL" },
      { desc: "Tubería conduit PVC 1/2\" 3 ml", unit: "ml", cant: 3, vru: 1200, cat: "MATERIAL" },
      { desc: "Caja octogonal / rectangular", unit: "und", cant: 1, vru: 3200, cat: "MATERIAL" },
      { desc: "Toma / apagador GFCI", unit: "und", cant: 1, vru: 7500, cat: "MATERIAL" },
      { desc: "Placa decorativa", unit: "und", cant: 1, vru: 1800, cat: "MATERIAL" },
      { desc: "Cinta aislante, conectores, electrodos", unit: "gl", cant: 1, vru: 800, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.035, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "03.07", title: "Tubería conduit, cableado, cajas y pruebas (grupal)", unit: "gl", comps: [
      { desc: "Electricista", unit: "hr", cant: 3.00, vru: 32000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 2.00, vru: 18000, cat: "MO" },
      { desc: "Cable dúplex THHN #12", unit: "ml", cant: 30, vru: 1200, cat: "MATERIAL" },
      { desc: "Cinta, conectores, canaletas, acc. varios", unit: "gl", cant: 1, vru: 8000, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.2, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "04.01", title: "Pañete de muros (reparación y nivelación)", unit: "m2", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.35, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.40, vru: 18000, cat: "MO" },
      { desc: "Cemento gris (0.15 bulto × 50kg)", unit: "bulto", cant: 0.15, vru: 32500, cat: "MATERIAL" },
      { desc: "Arena lavada — 0.02 m³", unit: "m3", cant: 0.02, vru: 90000, cat: "MATERIAL" },
      { desc: "Cal hidratada — 2 kg", unit: "kg", cant: 2, vru: 800, cat: "MATERIAL" },
      { desc: "Flechazo / malla de refuerzo", unit: "m2", cant: 0.10, vru: 4500, cat: "MATERIAL" },
      { desc: "Agua, herramientas menores y andamio", unit: "gl", cant: 1, vru: 2400, cat: "EQUIPO" },
      { desc: "Transporte", unit: "vj", cant: 0.0425, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "05.01", title: "Cieloraso en drywall (perfilería + placa + masilla)", unit: "m2", comps: [
      { desc: "Oficial drywallero", unit: "hr", cant: 0.50, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.40, vru: 18000, cat: "MO" },
      { desc: "Perfil metálico canal + omega (2.5 ml/m²)", unit: "ml", cant: 2.5, vru: 4500, cat: "MATERIAL" },
      { desc: "Placa drywall 1.22×2.44m (c/desperdicio)", unit: "m2", cant: 1.05, vru: 18000, cat: "MATERIAL" },
      { desc: "Cinta de papel + masilla joint compound", unit: "kg", cant: 0.15, vru: 15000, cat: "MATERIAL" },
      { desc: "Tornillos autorroscantes para drywall", unit: "und", cant: 15, vru: 80, cat: "MATERIAL" },
      { desc: "Herramienta menor (cuchilla, lija, taladro)", unit: "gl", cant: 1, vru: 3200, cat: "EQUIPO" },
      { desc: "Transporte", unit: "vj", cant: 0.05, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "05.02", title: "Pintura de cieloraso en drywall vinilo anti-hongos (2 manos)", unit: "m2", comps: [
      { desc: "Pintor / oficial", unit: "hr", cant: 0.15, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.10, vru: 18000, cat: "MO" },
      { desc: "Imprimante para drywall (1 mano)", unit: "galon", cant: 0.10, vru: 18000, cat: "MATERIAL" },
      { desc: "Vinilo tipo 1 anti-hongos (2 manos)", unit: "galon", cant: 0.24, vru: 14000, cat: "MATERIAL" },
      { desc: "Rodillo, bandeja, cinta enmascarar", unit: "gl", cant: 1, vru: 1200, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.03, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "06.01", title: "Impermeabilización de piso (membrana acrílica)", unit: "m2", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.20, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.25, vru: 18000, cat: "MO" },
      { desc: "Membrana acrílica impermeabilizante (1.2 kg/m²)", unit: "kg", cant: 1.2, vru: 8500, cat: "MATERIAL" },
      { desc: "Fieltro geotextil (separador)", unit: "m2", cant: 1.10, vru: 4500, cat: "MATERIAL" },
      { desc: "Rodillo, brocha, diluyente", unit: "gl", cant: 1, vru: 2500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.0375, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "06.02", title: "Impermeabilización encuentro muro-piso (banda elástica + sello)", unit: "ml", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.12, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.10, vru: 18000, cat: "MO" },
      { desc: "Banda elástica impermeabilizante (10 cm)", unit: "ml", cant: 1.05, vru: 4800, cat: "MATERIAL" },
      { desc: "Sello elástico poliuretano", unit: "ml", cant: 0.05, vru: 25000, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.0525, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "07.01", title: "Porcelanato en muros (incluye pegante, corte, instalación)", unit: "m2", comps: [
      { desc: "Alistador / oficial", unit: "hr", cant: 0.60, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.60, vru: 18000, cat: "MO" },
      { desc: "Porcelanato muro 30×60 cm (1.05 m² c/resp.)", unit: "m2", cant: 1.05, vru: 55000, cat: "MATERIAL" },
      { desc: "Pegante porcelanato (3 kg/m²)", unit: "kg", cant: 3, vru: 2200, cat: "MATERIAL" },
      { desc: "Crucecitas / niveladores", unit: "und", cant: 15, vru: 100, cat: "MATERIAL" },
      { desc: "Disco de corte diamantado", unit: "gl", cant: 1, vru: 2200, cat: "EQUIPO" },
      { desc: "Grampa niveladora + cuñas", unit: "und", cant: 10, vru: 80, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.0525, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "07.02", title: "Porcelanato en piso (incluye pegante, corte, instalación)", unit: "m2", comps: [
      { desc: "Alistador / oficial", unit: "hr", cant: 0.55, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.50, vru: 18000, cat: "MO" },
      { desc: "Porcelanato piso 60×60 cm (1.05 m² c/resp.)", unit: "m2", cant: 1.05, vru: 55000, cat: "MATERIAL" },
      { desc: "Pegante porcelanato (3 kg/m²)", unit: "kg", cant: 3, vru: 2200, cat: "MATERIAL" },
      { desc: "Crucecitas / niveladores", unit: "und", cant: 12, vru: 100, cat: "MATERIAL" },
      { desc: "Disco de corte + grampas", unit: "gl", cant: 1, vru: 2500, cat: "EQUIPO" },
      { desc: "Transporte", unit: "vj", cant: 0.065, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "07.03", title: "Guardaescoba / moldura", unit: "ml", comps: [
      { desc: "Alistador", unit: "hr", cant: 0.12, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.08, vru: 18000, cat: "MO" },
      { desc: "Guardaescoba en porcelanato / aluminio", unit: "ml", cant: 1.05, vru: 8500, cat: "MATERIAL" },
      { desc: "Pegante + boquilla", unit: "gl", cant: 1, vru: 3500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.05175, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "07.04", title: "Boquilla epóxica en muros y pisos", unit: "m2", comps: [
      { desc: "Alistador", unit: "hr", cant: 0.08, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.06, vru: 18000, cat: "MO" },
      { desc: "Boquilla epóxica (0.2 kg/m²)", unit: "kg", cant: 0.20, vru: 18000, cat: "MATERIAL" },
      { desc: "Esponja, balde, agua", unit: "gl", cant: 1, vru: 900, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.026, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "08.01", title: "Sanitario (suministro e instalación)", unit: "und", comps: [
      { desc: "Oficial / instalador", unit: "hr", cant: 1.50, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 1.50, vru: 18000, cat: "MO" },
      { desc: "Sanitario tanque bajo (Corona / Sensi Dacqua)", unit: "und", cant: 1, vru: 280000, cat: "MATERIAL" },
      { desc: "Tubería de descarga (tubo + codo 4\")", unit: "und", cant: 1, vru: 8500, cat: "MATERIAL" },
      { desc: "Anillo de cera", unit: "und", cant: 1, vru: 4500, cat: "MATERIAL" },
      { desc: "Kit de fijación (pernos, tuercas, tapas)", unit: "und", cant: 1, vru: 12000, cat: "MATERIAL" },
      { desc: "Silicona sanitaria", unit: "und", cant: 0.5, vru: 8500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.3375, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "08.02", title: "Lavamanos (suministro e instalación)", unit: "und", comps: [
      { desc: "Oficial / instalador", unit: "hr", cant: 1.20, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 1.00, vru: 18000, cat: "MO" },
      { desc: "Lavamanos sobreponer / con pedestal (Corona Milano)", unit: "und", cant: 1, vru: 170000, cat: "MATERIAL" },
      { desc: "Pedestal para lavamanos", unit: "und", cant: 1, vru: 25000, cat: "MATERIAL" },
      { desc: "Sifón lavamanos", unit: "und", cant: 1, vru: 6500, cat: "MATERIAL" },
      { desc: "Kit de fijación anclajes", unit: "und", cant: 1, vru: 3500, cat: "MATERIAL" },
      { desc: "Silicona sanitaria", unit: "und", cant: 0.5, vru: 8500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.2075, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "08.03", title: "Grifería mezcladora lavamanos (suministro e instalación)", unit: "und", comps: [
      { desc: "Plomero", unit: "hr", cant: 0.80, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.50, vru: 18000, cat: "MO" },
      { desc: "Grifería mezcladora lavamanos cromada", unit: "und", cant: 1, vru: 110000, cat: "MATERIAL" },
      { desc: "Flexibles (2 und) 1/2\"", unit: "und", cant: 2, vru: 3500, cat: "MATERIAL" },
      { desc: "Cinta teflón, selladores", unit: "gl", cant: 1, vru: 2000, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.15, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "08.04", title: "Grifería mezcladora sanitario (ducha higiénica)", unit: "und", comps: [
      { desc: "Plomero", unit: "hr", cant: 0.60, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.40, vru: 18000, cat: "MO" },
      { desc: "Grifería mezcladora para sanitario / ducha higiénica", unit: "und", cant: 1, vru: 88000, cat: "MATERIAL" },
      { desc: "Flexibles + adaptadores", unit: "und", cant: 2, vru: 3500, cat: "MATERIAL" },
      { desc: "Cinta teflón, selladores", unit: "gl", cant: 1, vru: 1800, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.15, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "08.05", title: "Grifería mezcladora ducha (suministro e instalación)", unit: "und", comps: [
      { desc: "Plomero", unit: "hr", cant: 1.00, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.80, vru: 18000, cat: "MO" },
      { desc: "Grifería mezcladora ducha (Grival / Gricol)", unit: "und", cant: 1, vru: 130000, cat: "MATERIAL" },
      { desc: "Flexibles + adaptadores 1/2\"", unit: "und", cant: 2, vru: 3500, cat: "MATERIAL" },
      { desc: "Cinta teflón, selladores", unit: "gl", cant: 1, vru: 2000, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.58, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "08.06", title: "Válvula empotrada para ducha (suministro e instalación)", unit: "und", comps: [
      { desc: "Plomero", unit: "hr", cant: 0.80, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.50, vru: 18000, cat: "MO" },
      { desc: "Válvula empotrada para ducha", unit: "und", cant: 1, vru: 42000, cat: "MATERIAL" },
      { desc: "Adaptadores, codos, tubería", unit: "gl", cant: 1, vru: 6500, cat: "MATERIAL" },
      { desc: "Cinta teflón + sellador", unit: "gl", cant: 1, vru: 1500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.1, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "08.07", title: "Brazo, regadera y enlace para ducha", unit: "und", comps: [
      { desc: "Plomero", unit: "hr", cant: 0.40, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.30, vru: 18000, cat: "MO" },
      { desc: "Brazo de ducha cromado + regadera", unit: "und", cant: 1, vru: 38000, cat: "MATERIAL" },
      { desc: "Enlace universal + cinta teflón", unit: "gl", cant: 1, vru: 5600, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.2, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "08.08", title: "Sifón lavamanos (suministro e instalación)", unit: "und", comps: [
      { desc: "Plomero", unit: "hr", cant: 0.25, vru: 30000, cat: "MO" },
      { desc: "Sifón lavamanos PVC cromado", unit: "und", cant: 1, vru: 12000, cat: "MATERIAL" },
      { desc: "Cinta teflón + empaques", unit: "gl", cant: 1, vru: 500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.1, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "08.09", title: "División en vidrio templado 6mm (suministro e instalación)", unit: "und", comps: [
      { desc: "Instalador especializado", unit: "hr", cant: 3.00, vru: 35000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 3.00, vru: 18000, cat: "MO" },
      { desc: "Vidrio templado 6mm (medida estándar 0.80×1.80m)", unit: "und", cant: 1, vru: 280000, cat: "MATERIAL" },
      { desc: "Perfilería aluminio anodizado + bisagras + jaladera", unit: "gl", cant: 1, vru: 45000, cat: "MATERIAL" },
      { desc: "Sellos de silicona + tope inferior", unit: "gl", cant: 1, vru: 12000, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.7, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "09.01", title: "Reparación y ajuste de puerta existente", unit: "und", comps: [
      { desc: "Carpintero", unit: "hr", cant: 0.60, vru: 30000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.30, vru: 18000, cat: "MO" },
      { desc: "Lija, masilla para madera, pegante", unit: "gl", cant: 1, vru: 5600, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.15, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "09.02", title: "Cambio de cerradura de puerta (chapa privacidad baño)", unit: "und", comps: [
      { desc: "Carpintero", unit: "hr", cant: 0.40, vru: 30000, cat: "MO" },
      { desc: "Chapa de privacidad para baño (cerradura + manija)", unit: "und", cant: 1, vru: 28000, cat: "MATERIAL" },
      { desc: "Broca, formón, tornillos", unit: "gl", cant: 1, vru: 2500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.125, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "09.03", title: "Tapetón / junquillo de piso para puerta", unit: "und", comps: [
      { desc: "Carpintero", unit: "hr", cant: 0.20, vru: 30000, cat: "MO" },
      { desc: "Tapetón / junquillo (madera o MDF)", unit: "ml", cant: 1, vru: 8000, cat: "MATERIAL" },
      { desc: "Pegante, puntillas, masilla", unit: "gl", cant: 1, vru: 2500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.1, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "10.01", title: "Espejo (suministro e instalación)", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.30, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.20, vru: 18000, cat: "MO" },
      { desc: "Espejo biselado 0.50×0.70m", unit: "und", cant: 1, vru: 55000, cat: "MATERIAL" },
      { desc: "Adhesivo + ganchos de fijación", unit: "gl", cant: 1, vru: 5000, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.15, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "10.02/10.06", title: "Accesorios baño (toallero, portarrollos, jabonera, ganchos)", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.20, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.10, vru: 18000, cat: "MO" },
      { desc: "Accesorio baño (línea media, cromado)", unit: "und", cant: 1, vru: 18000, cat: "MATERIAL" },
      { desc: "Tornillos, taco, silicona", unit: "gl", cant: 1, vru: 1600, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.075, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "10.04", title: "Cortinero para ducha (barra + cortina)", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 0.30, vru: 28000, cat: "MO" },
      { desc: "Barra de ducha cromada extensible", unit: "und", cant: 1, vru: 15000, cat: "MATERIAL" },
      { desc: "Cortina plástica antifluido (1.80×1.80m)", unit: "und", cant: 1, vru: 16000, cat: "MATERIAL" },
      { desc: "Tornillos, tacos, arandelas", unit: "gl", cant: 1, vru: 2600, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.15, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "10.07", title: "Plafón LED de techo (suministro e instalación)", unit: "und", comps: [
      { desc: "Electricista", unit: "hr", cant: 0.30, vru: 32000, cat: "MO" },
      { desc: "Plafón LED cuadrado 18W", unit: "und", cant: 1, vru: 38000, cat: "MATERIAL" },
      { desc: "Conectores, cinta aislante", unit: "gl", cant: 1, vru: 1900, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.125, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "10.08", title: "Aplique LED sobre espejo (suministro e instalación)", unit: "und", comps: [
      { desc: "Electricista", unit: "hr", cant: 0.25, vru: 32000, cat: "MO" },
      { desc: "Aplique LED para espejo 12W", unit: "und", cant: 1, vru: 32000, cat: "MATERIAL" },
      { desc: "Conectores, cinta aislante", unit: "gl", cant: 1, vru: 2000, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.15, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "10.09", title: "Extractor / ventilador de techo (suministro e instalación)", unit: "und", comps: [
      { desc: "Electricista", unit: "hr", cant: 0.50, vru: 32000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 0.30, vru: 18000, cat: "MO" },
      { desc: "Extractor / ventilador de techo baño 4\"", unit: "und", cant: 1, vru: 48000, cat: "MATERIAL" },
      { desc: "Tubería conduit + accesorios", unit: "gl", cant: 1, vru: 3100, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.125, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "10.10", title: "Toma GFCI, apagadores y placas decorativas", unit: "und", comps: [
      { desc: "Electricista", unit: "hr", cant: 0.25, vru: 32000, cat: "MO" },
      { desc: "Toma GFCI / apagador (según aplique)", unit: "und", cant: 1, vru: 16000, cat: "MATERIAL" },
      { desc: "Placa decorativa", unit: "und", cant: 1, vru: 2500, cat: "MATERIAL" },
      { desc: "Conectores, cinta, tornillos", unit: "gl", cant: 1, vru: 500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.05, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "10.11", title: "Mes\u00f3n de m\u00e1rmol (suministro e instalaci\u00f3n)", unit: "und", comps: [
      { desc: "Oficial marmolero", unit: "hr", cant: 2, vru: 32000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 1, vru: 18000, cat: "MO" },
      { desc: "Placa de m\u00e1rmol 0.55\u00d70.50m (pulida y biselada)", unit: "und", cant: 1, vru: 170000, cat: "MATERIAL" },
      { desc: "Pegante cementoso + mortero de nivelaci\u00f3n", unit: "kg", cant: 3, vru: 2500, cat: "MATERIAL" },
      { desc: "Silicona transparente + sellador", unit: "gl", cant: 1, vru: 4500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.1, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "11.01", title: "Limpieza general de obra", unit: "gl", comps: [
      { desc: "Ayudante", unit: "hr", cant: 4, vru: 18000, cat: "MO" },
      { desc: "Escoba, recogedor, trapero, balde", unit: "gl", cant: 1, vru: 15000, cat: "MATERIAL" },
      { desc: "Productos de limpieza (detergente, desinfectante)", unit: "gl", cant: 1, vru: 12000, cat: "MATERIAL" },
      { desc: "Bolsas de basura industriales", unit: "und", cant: 10, vru: 500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.25, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "11.02", title: "Protección de pisos y muros terminados", unit: "gl", comps: [
      { desc: "Ayudante", unit: "hr", cant: 2, vru: 18000, cat: "MO" },
      { desc: "Cartón corrugado / plástico protector 20 m²", unit: "m2", cant: 20, vru: 1500, cat: "MATERIAL" },
      { desc: "Cinta de enmascarar ancha", unit: "und", cant: 2, vru: 3500, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.15, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "11.03", title: "Remates, retoques y revisión final", unit: "gl", comps: [
      { desc: "Oficial", unit: "hr", cant: 3, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 2, vru: 18000, cat: "MO" },
      { desc: "Silicona, estuco, pintura (retocas)", unit: "gl", cant: 1, vru: 15000, cat: "MATERIAL" },
      { desc: "Transporte", unit: "vj", cant: 0.2, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "12.01", title: "Transporte de materiales a obra", unit: "gl", comps: [
      { desc: "Flete camión pequeño (viaje)", unit: "vj", cant: 1, vru: 85000, cat: "TRANSPORT" },
      { desc: "Cargue y descargue manual", unit: "hr", cant: 2, vru: 18000, cat: "MO" },
    ]},
    { code: "12.02", title: "Alquiler de contenedor / botes para escombros", unit: "gl", comps: [
      { desc: "Alquiler contenedor 4 m³ (1 semana)", unit: "gl", cant: 1, vru: 120000, cat: "EQUIPO" },
      { desc: "Transporte", unit: "vj", cant: 2.5, vru: 20000, cat: "TRANSPORT" },
    ]},
    { code: "12.03", title: "Transporte de escombros a disposición final", unit: "gl", comps: [
      { desc: "Volqueta / camión 5 m³", unit: "vj", cant: 1, vru: 110000, cat: "TRANSPORT" },
      { desc: "Tasa disposición final (escombrera)", unit: "gl", cant: 1, vru: 35000, cat: "TRANSPORT" },
    ]},
    { code: "13.01", title: "Suministro e instalación de ventana baño", unit: "und", comps: [
      { desc: "Oficial", unit: "hr", cant: 1.5, vru: 28000, cat: "MO" },
      { desc: "Ayudante", unit: "hr", cant: 1, vru: 18000, cat: "MO" },
      { desc: "Ventana aluminio con vidrio (0.60×0.60m)", unit: "und", cant: 1, vru: 150000, cat: "MATERIAL" },
      { desc: "Silicona, empaques, tornillos, anclajes", unit: "gl", cant: 1, vru: 12000, cat: "MATERIAL" },
      { desc: "Herramienta menor", unit: "gl", cant: 1, vru: 5000, cat: "EQUIPO" },
      { desc: "Transporte", unit: "vj", cant: 0.05, vru: 20000, cat: "TRANSPORT" },
    ]},
  ]

  // Build global component codes (unique by desc+cat), sorted A-Z per category
  const PREFIX: Record<string, string> = { MO: "MO", MATERIAL: "MA", EQUIPO: "EQ", TRANSPORT: "TR" }
  const CAT_ORDER = ["MO", "MATERIAL", "EQUIPO", "TRANSPORT"]

  const pairs: { desc: string; cat: string }[] = []
  const keySet = new Set<string>()
  for (const def of apuDefs) {
    for (const c of def.comps) {
      const key = `${c.desc}|${c.cat}`
      if (!keySet.has(key)) { keySet.add(key); pairs.push({ desc: c.desc, cat: c.cat }) }
    }
  }

  const byCat: Record<string, { desc: string; cat: string }[]> = { MO: [], MATERIAL: [], EQUIPO: [], TRANSPORT: [] }
  for (const p of pairs) byCat[p.cat]?.push(p)
  for (const cat of CAT_ORDER) byCat[cat].sort((a, b) => a.desc.localeCompare(b.desc, "es"))

  const globalCodeMap = new Map<string, string>()
  for (const cat of CAT_ORDER) {
    byCat[cat].forEach((p, idx) => {
      globalCodeMap.set(`${p.desc}|${p.cat}`, `${PREFIX[cat]}-${String(idx + 1).padStart(2, "0")}`)
    })
  }

  // Create all APUs
  const ADMIN_PCT = 15, UTILITY_PCT = 10, IVA_PCT = 19
  const apuMap = new Map<string, number>()
  for (const def of apuDefs) {
    const total = def.comps.reduce((s, c) => s + c.cant * c.vru, 0)
    const adminR = Math.round(total * ADMIN_PCT / 100)
    const utilityR = Math.round(total * UTILITY_PCT / 100)
    const ivaR = Math.round(utilityR * IVA_PCT / 100)
    const totalPrice = total + adminR + utilityR + ivaR
    const apu = await prisma.aPU.create({
      data: {
        code: def.code,
        title: def.title,
        unitId: u[def.unit],
        totalCost: total,
        adminPct: ADMIN_PCT,
        utilityPct: UTILITY_PCT,
        ivaPct: IVA_PCT,
        adminCost: adminR,
        utilityCost: utilityR,
        ivaCost: ivaR,
        totalPrice: totalPrice,
        components: {
          create: def.comps.map((c) => ({
            code: globalCodeMap.get(`${c.desc}|${c.cat}`) ?? "",
            description: c.desc,
            unitId: u[c.unit],
            quantity: c.cant,
            unitPrice: c.vru,
            totalCost: c.cant * c.vru,
            category: c.cat,
          })),
        },
      },
    })
    apuMap.set(def.code, apu.id)
  }

  // ── Items ──
  const apuCodeForItem = (code: string): string => {
    if (["02.01","02.02","02.03","02.04","02.05","02.06"].includes(code)) return "02.01/02.06"
    if (["03.01","03.02","03.03","03.04","03.05","03.06"].includes(code)) return "03.01/03.06"
    if (["10.02","10.03","10.05","10.06"].includes(code)) return "10.02/10.06"
    if (code === "04.02") return "04.01"
    return code
  }

  const itemDefs = [
    { code: "01.01", desc: "Demolición enchape muros", unit: "m2", chapter: "c1", qty: [10.42, 13.50, 13.50] },
    { code: "01.02", desc: "Demolición piso", unit: "m2", chapter: "c1", qty: [1.80, 2.69, 2.69] },
    { code: "01.03", desc: "Demolición pañete de techo", unit: "m2", chapter: "c1", qty: [1.80, 2.69, 2.69] },
    { code: "01.04", desc: "Desmonte de sanitario", unit: "und", chapter: "c1", qty: [1, 1, 1] },
    { code: "01.05", desc: "Desmonte de lavamanos", unit: "und", chapter: "c1", qty: [1, 1, 1] },
    { code: "01.06", desc: "Desmonte de ducha", unit: "und", chapter: "c1", qty: [0, 1, 1] },
    { code: "01.07", desc: "Desmonte de división de vidrio", unit: "und", chapter: "c1", qty: [0, 1, 1] },
    { code: "01.08", desc: "Desmonte de accesorios", unit: "gl", chapter: "c1", qty: [1, 1, 1] },
    { code: "01.09", desc: "Desmonte de puntos eléctricos", unit: "pto", chapter: "c1", qty: [4, 6, 6] },
    { code: "01.10", desc: "Desmonte de puerta", unit: "und", chapter: "c1", qty: [1, 1, 1] },
    { code: "01.11", desc: "Cargue y retiro de escombros", unit: "gl", chapter: "c1", qty: [1, 1, 1] },
    { code: "01.12", desc: "Transporte de escombros", unit: "gl", chapter: "c1", qty: [1, 1, 1] },
    { code: "01.13", desc: "Desmonte de ventana existente", unit: "und", chapter: "c1", qty: [1, 1, 1] },
    { code: "01.14", desc: "Desmonte de mes\u00f3n de m\u00e1rmol", unit: "und", chapter: "c1", qty: [1, 1, 1] },
    { code: "02.01", desc: "Punto hidráulico FC lavamanos", unit: "pto", chapter: "c2", qty: [1, 1, 1] },
    { code: "02.02", desc: "Punto hidráulico AC lavamanos", unit: "pto", chapter: "c2", qty: [1, 1, 1] },
    { code: "02.03", desc: "Punto hidráulico FC sanitario", unit: "pto", chapter: "c2", qty: [1, 1, 1] },
    { code: "02.04", desc: "Punto hidráulico AC sanitario", unit: "pto", chapter: "c2", qty: [1, 1, 1] },
    { code: "02.05", desc: "Punto hidráulico FC ducha", unit: "pto", chapter: "c2", qty: [0, 1, 1] },
    { code: "02.06", desc: "Punto hidráulico AC ducha", unit: "pto", chapter: "c2", qty: [0, 1, 1] },
    { code: "02.07", desc: "Instalación válvulas de corte", unit: "und", chapter: "c2", qty: [2, 3, 3] },
    { code: "02.08", desc: "Prueba de estanquidad", unit: "gl", chapter: "c2", qty: [1, 1, 1] },
    { code: "03.01", desc: "Punto luminaria LED techo", unit: "pto", chapter: "c3", qty: [1, 1, 1] },
    { code: "03.02", desc: "Punto aplique LED espejo", unit: "pto", chapter: "c3", qty: [0, 1, 1] },
    { code: "03.03", desc: "Punto extractor techo", unit: "pto", chapter: "c3", qty: [0, 1, 1] },
    { code: "03.04", desc: "Punto toma GFCI", unit: "pto", chapter: "c3", qty: [1, 1, 1] },
    { code: "03.05", desc: "Punto apagador interior", unit: "pto", chapter: "c3", qty: [1, 1, 1] },
    { code: "03.06", desc: "Punto apagador exterior", unit: "pto", chapter: "c3", qty: [1, 1, 1] },
    { code: "03.07", desc: "Cableado y pruebas", unit: "gl", chapter: "c3", qty: [1, 1, 1] },
    { code: "04.01", desc: "Pañete de muros", unit: "m2", chapter: "c4", qty: [10.42, 13.50, 13.50] },
    { code: "04.02", desc: "Boquillero para tuberías", unit: "gl", chapter: "c4", qty: [1, 1, 1] },
    { code: "05.01", desc: "Cieloraso en drywall (perfilería + placa + masilla)", unit: "m2", chapter: "c5", qty: [1.80, 2.69, 2.69] },
    { code: "05.02", desc: "Pintura de cieloraso en drywall vinilo anti-hongos", unit: "m2", chapter: "c5", qty: [1.80, 2.69, 2.69] },
    { code: "06.01", desc: "Impermeabilización de piso", unit: "m2", chapter: "c6", qty: [1.80, 2.69, 2.69] },
    { code: "06.02", desc: "Impermeabilización encuentro muro-piso", unit: "ml", chapter: "c6", qty: [5.40, 6.80, 6.80] },
    { code: "07.01", desc: "Porcelanato en muros", unit: "m2", chapter: "c7", qty: [10.42, 13.50, 13.50] },
    { code: "07.02", desc: "Porcelanato en piso", unit: "m2", chapter: "c7", qty: [1.80, 2.69, 2.69] },
    { code: "07.03", desc: "Guardaescoba / moldura", unit: "ml", chapter: "c7", qty: [5.40, 6.80, 6.80] },
    { code: "07.04", desc: "Boquilla epóxica", unit: "m2", chapter: "c7", qty: [12.22, 16.19, 16.19] },
    { code: "08.01", desc: "Sanitario tanque bajo", unit: "und", chapter: "c8", qty: [1, 1, 1] },
    { code: "08.02", desc: "Lavamanos con pedestal", unit: "und", chapter: "c8", qty: [1, 1, 1] },
    { code: "08.03", desc: "Grifería mezcladora lavamanos", unit: "und", chapter: "c8", qty: [1, 1, 1] },
    { code: "08.04", desc: "Grifería mezcladora sanitario", unit: "und", chapter: "c8", qty: [1, 1, 1] },
    { code: "08.05", desc: "Grifería mezcladora ducha", unit: "und", chapter: "c8", qty: [0, 1, 1] },
    { code: "08.06", desc: "Válvula empotrada ducha", unit: "und", chapter: "c8", qty: [0, 1, 1] },
    { code: "08.07", desc: "Brazo, regadera y enlace ducha", unit: "und", chapter: "c8", qty: [0, 1, 1] },
    { code: "08.08", desc: "Sifón lavamanos", unit: "und", chapter: "c8", qty: [1, 1, 1] },
    { code: "08.09", desc: "División vidrio templado 6mm", unit: "und", chapter: "c8", qty: [0, 1, 1] },
    { code: "09.01", desc: "Reparación y ajuste de puerta", unit: "und", chapter: "c9", qty: [1, 1, 1] },
    { code: "09.02", desc: "Cambio de cerradura", unit: "und", chapter: "c9", qty: [1, 1, 1] },
    { code: "09.03", desc: "Tapetón / junquillo de piso", unit: "und", chapter: "c9", qty: [1, 1, 1] },
    { code: "10.01", desc: "Espejo", unit: "und", chapter: "c10", qty: [1, 1, 1] },
    { code: "10.02", desc: "Toallero", unit: "und", chapter: "c10", qty: [1, 1, 1] },
    { code: "10.03", desc: "Portarrollos", unit: "und", chapter: "c10", qty: [1, 1, 1] },
    { code: "10.04", desc: "Cortinero para ducha", unit: "und", chapter: "c10", qty: [0, 1, 1] },
    { code: "10.05", desc: "Jabonera / esponjera ducha", unit: "und", chapter: "c10", qty: [0, 1, 1] },
    { code: "10.06", desc: "Ganchos / percheros", unit: "und", chapter: "c10", qty: [2, 2, 2] },
    { code: "10.07", desc: "Plafón LED de techo", unit: "und", chapter: "c10", qty: [1, 1, 1] },
    { code: "10.08", desc: "Aplique LED sobre espejo", unit: "und", chapter: "c10", qty: [0, 1, 1] },
    { code: "10.09", desc: "Extractor / ventilador techo", unit: "und", chapter: "c10", qty: [0, 1, 1] },
    { code: "10.10", desc: "Tomas GFCI + apagadores + placas", unit: "und", chapter: "c10", qty: [2, 3, 3] },
    { code: "10.11", desc: "Mes\u00f3n de m\u00e1rmol", unit: "und", chapter: "c10", qty: [1, 1, 1] },
    { code: "11.01", desc: "Limpieza general de obra", unit: "gl", chapter: "c11", qty: [1, 1, 1] },
    { code: "11.02", desc: "Protección de pisos y muros terminados", unit: "gl", chapter: "c11", qty: [1, 1, 1] },
    { code: "11.03", desc: "Remates, retoques y revisión final", unit: "gl", chapter: "c11", qty: [1, 1, 1] },
    { code: "12.01", desc: "Transporte de materiales a obra", unit: "gl", chapter: "c12", qty: [1, 1, 1] },
    { code: "12.02", desc: "Alquiler de contenedor / botes para escombros", unit: "gl", chapter: "c12", qty: [1, 1, 1] },
    { code: "12.03", desc: "Transporte de escombros a disposición final", unit: "gl", chapter: "c12", qty: [1, 1, 1] },
    { code: "13.01", desc: "Ventana baño (suministro e instalación)", unit: "und", chapter: "c13", qty: [1, 1, 1] },
  ]

  for (const def of itemDefs) {
    const apuCode = apuCodeForItem(def.code)
    const apuId = apuMap.get(apuCode) ?? null
    const item = await prisma.item.create({
      data: {
        code: def.code,
        description: def.desc,
        unitId: u[def.unit],
        chapterId: ch[def.chapter],
        apuId,
      },
    })
    for (let i = 0; i < 3; i++) {
      if (def.qty[i] > 0) {
        await prisma.itemQuantity.create({
          data: { roomId: roomIdx[rKeys[i]], itemId: item.id, quantity: def.qty[i] },
        })
      }
    }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
