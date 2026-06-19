# AGENTS.md — Presupuesto 3 Baños

## Goal
App web full-stack para presupuesto de remodelación de 3 baños.
- Stack: React 19 + Vite 8 + TypeScript + Prisma 7 + SQLite + Express 5
- Frontend :5173, API :3001 (proxy Vite)
- Precios Homecenter Colombia, junio 2026
- Costo total = CD + AIU (Admin 15% + Utilidad 10% + IVA 19% s/utilidad)

## Database (Prisma + SQLite)
- `prisma/schema.prisma`: 8 modelos (Unit, Room, Chapter, Item, ItemQuantity, APU, APUComponent)
- `prisma/seed.ts`: 13 capítulos, 3 baños, 67 ítems, 53 APUs
  - Capítulo 5: **Cieloraso en Drywall y Pintura** (reemplaza placa concreta existente)
  - Capítulo 13: Ventanas
- Códigos zero-padded: items/APUs `01.01`, insumos `MO-01`, `MA-01`, `EQ-01`, `TR-01`
- Categorías: MO, MATERIAL, EQUIPO, TRANSPORT
- Cascade delete en ItemQuantity e APUComponent

## API (server/index.ts)
### Endpoints REST
- `GET /api/units`, `/api/rooms`, `/api/chapters`, `/api/items`, `/api/apus`, `/api/budget/summary`
- `POST/PUT/DELETE /api/chapters/:code`, `/api/items/:id`, `/api/apus/:id`
- `POST/PUT/DELETE /api/apus/:apuId/components/:compId`
- PUT/POST endpoints regeneran códigos de insumos globalmente únicos

### Reports endpoint `GET /api/reports/:type?format=md|html`
| Report | Description |
|---|---|
| `presupuesto-general` | Tabla 7 cols (Ítem, Actividad, Und, Cant, Vr/Unit, Vr/Total, TOTAL), capítulos con colspan, TOTAL GENERAL como fila diseñada |
| `datos-generales` | Propietario, dirección, dimensiones baños, áreas muros |
| `cantidades` | Resumen de cantidades por baño |
| `notas-tecnicas` | Notas técnicas y fórmulas |
| `apus` | APU detallado con insumos, composición %, AIU |

### h() function (markdown → HTML)
- Passthrough de HTML directo (líneas que empiezan con `<`)
- Tablas con `<thead>`/`<tbody>`, capítulos con colspan, TOTAL GENERAL con colspan
- Capítulos: `**C01** | **NOMBRE** (colspan=5) | **$ total**`
- TOTAL GENERAL: raw HTML `<tr class="rtotal">`
- Ordenadas, código, inline bold/italic

## Frontend (src/)
### Componentes
| Archivo | Función |
|---|---|
| `App.tsx` | 4 tabs + dashboard en cards |
| `Presupuesto.tsx` | Tabla items por capítulo con CRUD inline. APU = `totalPrice` |
| `APUs.tsx` | Lista APUs con expansión, CRUD inline, tarjetas resumen |
| `Insumos.tsx` | Catálogo insumos agrupado por categoría |
| `MemoriaDeCalculo.tsx` | 5 reports (Presupuesto General, Datos Generales, Cantidades, Notas Técnicas, APUs Detallado). Fetch HTML desde API, dangerouslySetInnerHTML, botón Imprimir |
| `api.ts` | Interfaces + fetchJSON/sendJSON |

### Report Header (`.rheader`)
- Glass card con `backdrop-filter: blur(12px)`, grid pattern, box-shadow
- Barra acento superior 4px gradiente blanco
- Marca de agua "PRESUPUESTO" (5em, 1.2% opacity)
- Título: Georgia serif, 2.4em, weight 700, tracking 4px, uppercase
- Drop caps: P y G en `<span class="dc">` (1.6em, weight 900)
- 3 fichas metadata con gradient bg, top accent bar, shadow
- Metadata: label arriba, valor abajo, centrado

### Table (`.report-view table`)
- 7 columnas: Ítem (56px), Actividad (auto), Und (44px), Cant (54px), Vr/Unit, Vr/Total, TOTAL
- Capítulos: bg 10% blanco, left border 3px, padding 12px
- TOTAL GENERAL: gradient bg, top accent 3px, label con líneas decorativas ::before/::after
- Last row: weight 700, font-size 0.88rem
- TOTAL label: weight 600, 0.78rem, uppercase, tracking 1.5px
- TOTAL value: weight 800, 0.95rem

### Print
- `handlePrint()` abre ventana nueva con estilos B/W inline, llama `window.print()`
- `<thead>` se repite en cada página (`table-header-group`)
- `print-color-adjust: exact` preserva fondos

## Datos del Cliente
- Propietario: Francisco Javier Rondon Lagos — CC 4.251.576
- Dirección: Calle 78 B No. 120-49 Bloque 1 Apto 401
- Conjunto: Reserva de Granada 3
- Ciudad: Bogotá, Colombia — Junio 2026

## Datos críticos
- 3 baños: B1 (1.20×1.50m, sin ducha), B2/B3 (1.25×2.15m con ducha)
- Área muros neta: 37.42 m² | Piso: 7.18 m² | Techo drywall: 7.18 m²
- 16 ptos hidráulicos, 16 ptos eléctricos
- Capítulo 5: drywall con perfilería metálica + placa yeso + pintura anti-hongos
- Costo directo total: **~$20,636,567 COP**
- Precio venta total (AIU 15%+10%+IVA 19%): **~$26,187,866 COP**
- 53 APUs, 67 items, ~266 componentes

## Fuentes
- Sin Google Fonts — stack nativo: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Helvetica Neue', Arial, sans-serif`
- Mono: `'JetBrains Mono', 'Consolas', 'Courier New', monospace`
- Tamaños en `rem` para evitar cascada de `em`

## Comandos
- `npm run dev:server` - API :3001
- `npm run dev:client` - Vite :5173
- `npx prisma db push --force-reset` + `npx prisma generate` + `npx tsx prisma/seed.ts` - regenerar BD
- `npx tsc --noEmit` - verificar TypeScript
