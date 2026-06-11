# CaveBin

App para gestionar una colección personal de bebidas alcohólicas. Multi-usuario, mobile-first (PWA), con historial de movimientos y sección social de reseñas.

## Stack

- **Backend:** Node.js + Express + PostgreSQL (`pg`)
- **Frontend:** React + Vite + Tailwind CSS + vite-plugin-pwa (Fase 2, aún no creado)
- **Auth:** JWT (access 15min) + refresh token (7 días)
- **Mobile:** PWA — mismo código, instalable en celu

## Estado actual

- [x] **Fase 1 – Backend completo**
  - Auth: register / login / refresh (`/api/auth/*`)
  - CRUD beverages con soft delete y stock calculado desde inventory
  - CRUD locations con conteo de botellas por ubicación
  - Movimientos (purchase / consumption / transfer) con transacción DB
  - Reseñas públicas (lectura sin auth, escritura con auth)
  - Scraper: placeholder, implementar en Fase 3

- [x] **Fase 2 – Frontend + PWA**
  - React + Vite + Tailwind + vite-plugin-pwa
  - Páginas: Login, Register, Collection (bodega, grilla/lista), BeverageDetail, Locations, Community, Search, Home
- [x] **Fase 3 – Catálogo + fuentes externas** (sin Puppeteer)
  - `beverage_catalog` (~3.100 ítems): vinos, cervezas y destilados
  - Fuentes: Vivino (API explore con filtros + scraping HTML para texto) y Open Food Facts (search-a-licious por categoría)
  - Script CLI `backend/scripts/populate-catalog.js`; búsqueda en la app solo contra el catálogo local
  - Search.jsx: navegación por categoría con grilla/lista e infinite scroll, pre-fill al agregar
- [x] **Fase 4 – Sección comunitaria** (Community.jsx + reviews)
- [ ] **Fase 5 – Pulido** ← PRÓXIMO PASO
  - Dedup difuso del catálogo (variantes con tipeos: "Red label." vs "Red Label" — pg_trgm)
  - Filtros avanzados en la colección, alertas de stock bajo, estadísticas, exportar CSV, escaneo de etiquetas, ocasión de consumo

Ver `PLAN.md` para arquitectura completa, modelo de datos y decisiones de diseño.

## Estructura

```
CaveBin/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── migrations/   001-006 SQL (users, beverages, locations, inventory, movements, reviews)
│   │   │   ├── index.js      pool PostgreSQL
│   │   │   └── migrate.js    runner de migraciones
│   │   ├── middleware/auth.js JWT verify
│   │   ├── routes/           auth, beverages, locations, movements, reviews, scraper
│   │   └── index.js          entry point Express puerto 3001
│   ├── .env.example
│   └── README.md             instrucciones de setup y ejemplos curl
├── frontend/                 (aún no creado)
├── PLAN.md                   arquitectura completa
└── CLAUDE.md                 este archivo
```

## Decisiones clave

- `inventory_movements` es la fuente de verdad del stock. Nunca se edita `inventory.quantity` directamente — siempre se inserta un movimiento y se actualiza el inventario en la misma transacción DB.
- Soft deletes en todas las tablas (`deleted_at TIMESTAMPTZ`).
- `reviews.beverage_ref` es texto libre (no FK) — las reseñas son públicas e independientes de la colección del usuario.
- `inventory` usa dos índices parciales para manejar `location_id IS NULL` con unicidad correcta en PostgreSQL.
- `metadata JSONB` en beverages para atributos variables por tipo (estilo, crianza, etc).

## Cómo correr el backend

```bash
cd backend
cp .env.example .env    # completar DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run migrate         # crea todas las tablas
npm run dev             # http://localhost:3001
```

## Próximos pasos (Fase 5 – Pulido)

- Filtros avanzados y búsqueda en la colección
- Alertas de stock bajo ("solo te queda 1 botella")
- Estadísticas: valor total de la colección, botellas por tipo, consumo mensual
- Exportar colección a CSV
- Escanear etiqueta con cámara del celu
- Registrar ocasión al consumir ("con quién", "para qué")

## Notas del catálogo

- La API explore de Vivino ignora texto libre (solo filtros estructurados) y
  solo lista vinos comprables (~60 por país). La búsqueda HTML sí respeta texto
  pero trae pocos resultados y no pagina. Ver `backend/src/services/catalogSources.js`.
- OFF bulk: usar `search.openfoodfacts.org` (no `cgi/search.pl`, da 503).
  Tags de categoría reales: `en:hard-liquors`, `en:whisky` (singular), `en:beers`, `en:wines`.
- Dedup del catálogo por (nombre, productor, tipo, añada) con índice único
  parcial para OFF (migración 011/012).
