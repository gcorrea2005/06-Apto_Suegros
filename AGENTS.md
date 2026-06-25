# AGENTS.md — Presupuesto 3 Baños

## Goal
App web full-stack para presupuesto de remodelación de 3 baños.
- Stack: React 19 + Vite 8 + TypeScript + Prisma 7 + SQLite + Express 5
- Frontend :5173, API :3001 (proxy Vite)
- Precios Homecenter Colombia, junio 2026
- Costo = CD + AIU (Admin 15% + Utilidad 10% + IVA 19% s/utilidad)

## Cliente
- **Propietario:** Francisco Javier Rondon Lagos — CC 4.251.576
- **Dirección:** Calle 78 B No. 120-49, Bloque 1, Apto 401, Reserva de Granada 3
- **Ciudad:** Bogotá, Colombia — Junio 2026

## Resumen del presupuesto
- **3 baños:** B1 (sin ducha), B2 y B3 (con ducha)
- **Costo Directo:** ~$21.580.967 COP
- **Precio Venta (con AIU):** ~$27.386.349 COP
- **13 capítulos de obra, 69 ítems, 55 APUs**
- Principales rubros: Enchapes en porcelanato (C07, 23.7%) y Aparatos sanitarios (C08, 21.2%)

## Database (Prisma + SQLite)
- 8 modelos: Unit, Room, Chapter, Item, ItemQuantity, APU, APUComponent
- Seed con 13 capítulos, 3 baños, 69 ítems, 55 APUs, ~384 componentes
- Códigos: items/APUs `01.01`, insumos `MO-01`, `MA-01`, `EQ-01`, `TR-01`
- Categorías: MO, MATERIAL, EQUIPO, TRANSPORT
- Capítulo 5: Cieloraso en Drywall y Pintura (reemplaza placa concreta)
- Capítulo 13: Ventanas

## API REST (Express 5, :3001)
- CRUD completo de chapters, items, apus y componentes
- POST/PUT regeneran códigos de insumos únicos
- `GET /api/budget/summary` — dashboard con CD, AIU, desglose por capítulo
- `GET /api/reports/:type?format=html` — 5 reportes en HTML: Presupuesto General, APUs, Insumos, Cantidades, Especificaciones Técnicas
- Reportes con cabecera estilizada (propietario, dirección, fecha), tabla capitulada con TOTAL GENERAL, y footer del ingeniero

## Frontend (React 19 + Vite 8)
- **App.tsx:** 4 tabs + dashboard en cards (CD, AIU, Precio Venta con barra visual)
- **Presupuesto.tsx:** Tabla items por capítulo con CRUD inline
- **APUs.tsx:** Lista expandible con CRUD inline de componentes
- **Insumos.tsx:** Catálogo agrupado por categoría
- **MemoriaDeCalculo.tsx:** 5 reportes con impresión profesional
- **AdminChapters.tsx:** CRUD de capítulos con iconos y reordenamiento
- **api.ts:** Interfaces TypeScript + fetchJSON/sendJSON

## Comandos
- `npm run dev:server` — API :3001
- `npm run dev:client` — Vite :5173
- `npx prisma db push --force-reset` + `npx prisma generate` + `npx tsx prisma/seed.ts` — regenerar BD
- `npx tsc --noEmit` — verificar TypeScript
