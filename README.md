# 🏗️ Presupuesto 3 Baños

**App web full-stack para presupuesto de remodelación de 3 baños**  
Bogotá, Colombia — Junio 2026

---

## 📋 Descripción

Sistema integral de presupuestación para la remodelación de tres baños en el Conjunto Residencial **Reserva de Granada 3** (Calle 78 B No. 120-49, Bloque 1, Apto 401). Incluye desde la demolición hasta los acabados finales, con 13 capítulos de obra, 67 ítems, 53 APU y ~266 componentes.

---

## 🚀 Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19 + Vite 8 + TypeScript 6 |
| **Backend** | Express 5 + Prisma 7 |
| **Base de datos** | SQLite (Better-SQLite3) |
| **Proxy** | Vite dev server (API → :3001) |

---

## ✨ Funcionalidades

- **Dashboard** con 4 tabs: Presupuesto, APUs, Insumos, Memoria de Cálculo
- **CRUD inline** de capítulos, ítems, APUs y componentes
- **5 reportes descargables**: Presupuesto General, APUs Detallados, Insumos, Cantidades, Especificaciones Técnicas
- **Renderizado HTML/Markdown** con cabecera tipo glass card
- **Impresión** con estilos optimizados y thead repetido en cada página
- **AIU**: Administración 15% + Utilidad 10% + IVA 19% sobre utilidad

---

## 📁 Estructura del Proyecto

```
06-Apto_Suegros/
├── server/          # API REST (Express 5 + Prisma)
│   ├── index.ts     # Endpoints + reportes
│   └── ...
├── src/             # Frontend React
│   ├── components/  # Presupuesto, APUs, Insumos, MemoriaDeCalculo
│   ├── api.ts       # Cliente HTTP
│   └── ...
├── prisma/          # Schema + seed
│   ├── schema.prisma
│   ├── seed.ts      # 53 APUs, 67 ítems, 13 capítulos
│   └── dev.db
├── informes/        # Documentación técnica
│   ├── 00-Justificacion_Remodelacion.pdf  ← Documento completo (141 pág)
│   ├── 01-Presupuesto_General.pdf
│   ├── 02-APUs_Detallados.pdf
│   ├── 03-Insumos.pdf
│   ├── 04-Memoria_Cantidades.pdf
│   └── 05-Especificaciones_Tecnicas.pdf
├── reports/         # Markdown base para reportes
├── AGENTS.md        # Contexto del proyecto
└── package.json
```

---

## 🧮 Datos del Proyecto

| Concepto | Valor |
|---|---|
| **Propietario** | Francisco Javier Rondon Lagos — CC 4.251.576 |
| **Ubicación** | Calle 78 B No. 120-49, Bloque 1, Apto 401, Bogotá |
| **Baño 1** | 1.20 × 1.50 m (sin ducha) |
| **Baño 2** | 1.25 × 2.15 m (con ducha) |
| **Baño 3** | 1.25 × 2.15 m (con ducha) |
| **Costo Directo** | **$21.580.967 COP** |
| **Valor Total (+AIU)** | **$27.386.349 COP** |
| **Área muros neta** | 37.42 m² |
| **Área piso** | 7.18 m² |
| **Puntos hidráulicos** | 16 |
| **Puntos eléctricos** | 16 |
| **Edificio** | 12 pisos + parqueadero a nivel + 1 sótano |

---

## 🏗️ 13 Capítulos de Obra

| # | Capítulo | Peso |
|---|---|---|
| C01 | Demolición y Desmonte | $2.2M |
| C02 | Instalaciones Hidráulicas | $1.7M |
| C03 | Instalaciones Eléctricas | $1.7M |
| C04 | Muros y Pañetes | $1.5M |
| C05 | Cieloraso Drywall + Pintura | $0.7M |
| C06 | Impermeabilización | $0.6M |
| C07 | Enchapes y Pisos Porcelanato | **$6.5M** |
| C08 | Aparatos Sanitarios y Griferías | **$5.8M** |
| C09 | Carpintería | $0.4M |
| C10 | Accesorios y Varios | $2.7M |
| C11 | Aseo y Finales | $1.2M |
| C12 | Transporte y Logística | $1.7M |
| C13 | Ventanas | $0.9M |

---

## 📦 Instalación

```bash
# Clonar
git clone https://github.com/gcorrea2005/06-Apto_Suegros.git
cd 06-Apto_Suegros

# Dependencias
npm install

# Inicializar BD + seed
npx prisma db push --force-reset
npx prisma generate
npx tsx prisma/seed.ts

# Desarrollo (2 terminales)
npm run dev:server   # API → http://localhost:3001
npm run dev:client   # App → http://localhost:5173

# O todo en uno
npm run dev
```

---

## 📄 Documento Técnico

El informe completo de **141 páginas** se encuentra en:

```
informes/00-Justificacion_Remodelacion.pdf
```

Incluye: introducción, diagnóstico, 13 capítulos de alcance, justificación técnica (sísmica, geotecnia, patología, deformaciones), justificación económica, cronograma (Gantt), conclusiones, 5 anexos y bibliografía con 30 referencias técnicas.

---

## 📜 Normas Técnicas Aplicables

NSR-10 · RETIE · RAS 2000 · NTC 2050 · NTC 1337 · NTC 541 · NTC 4321 · NTC 179 · NTC 2186 · NTC 5618 · NTC 3184 · NTC 4425 · NTC 1522 · ASTM C1396 · ASTM D6083 · ISO 13007 · Decreto 1077/2015 · Decreto 523/2010

---

## 👷‍♂️ Autor

**Ing. Jorge Giovanni Correa Mejía**  
CC 4.252.533  
Director de Proyecto

---

<p align="center">
  <sub>Hecho con ❤️ en Bogotá — Junio 2026</sub>
</p>
