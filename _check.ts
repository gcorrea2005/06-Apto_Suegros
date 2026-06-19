import { PrismaClient } from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import path from "path"

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db")
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
const p = new PrismaClient({ adapter })

async function main() {
  const ch = await p.chapter.count()
  const it = await p.item.count()
  const apu = await p.aPU.count()
  const comp = await p.aPUComponent.count()
  const c5 = await p.chapter.findUnique({ where: { code: "c5" } })
  const apu5 = await p.aPU.findMany({ where: { code: { startsWith: "05." } }, select: { code: true, title: true, totalCost: true } })
  const items5 = await p.item.findMany({ where: { chapterId: c5!.id } })
  console.log("=== BD REGENERADA ===")
  console.log(`Capítulos:   ${ch}`)
  console.log(`Items:       ${it}`)
  console.log(`APUs:        ${apu}`)
  console.log(`Componentes: ${comp}`)
  console.log(`\nCapítulo 5: ${c5?.title}`)
  for (const a of apu5) console.log(`  APU ${a.code}: ${a.title} — $${a.totalCost.toLocaleString("es-CO")}`)
  console.log("  Items:")
  for (const i of items5) console.log(`    ${i.code} - ${i.description}`)
  await p.$disconnect()
}
main()
