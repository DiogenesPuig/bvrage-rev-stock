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
  - Páginas: Login, Register, Collection (bodega, con tab de Ubicaciones), BeverageDetail, Home
- [x] **Fase 3 – Catálogo + fuentes externas** (sin Puppeteer)
  - `beverage_catalog` (~3.100 ítems): vinos, cervezas y destilados
  - Fuentes: Vivino (API explore con filtros + scraping HTML para texto) y Open Food Facts (search-a-licious por categoría)
  - Script CLI `backend/scripts/populate-catalog.js`
- [x] **Fase 4 – Sección comunitaria**
  - Home.jsx: catálogo navegable (grilla/lista, infinite scroll, búsqueda en vivo) fusionado con reseñas destacadas — es la pantalla principal ("/") para usuarios logueados
  - CatalogDetail.jsx: ficha de un ítem del catálogo (no de la colección propia) con reseñas y alta directa
- [x] **Reskin visual "Vintner & Cask"** (Parte 1: tokens de diseño + aplicado a todas las páginas)
- [x] **Pantalla "Actividad"** — Activity.jsx en `/activity`, timeline de todos los movimientos
  (no solo por bebida), agrupado por fecha (Hoy/Ayer/fecha), con filtro por tipo
  (Compra/Consumo/Transferencia) e infinite scroll. Backend: `GET /api/movements`
  (nuevo, en `movements.js`) con paginación y filtro `type`.
- [x] **Modal "Gestionar"** — ManageStockModal.jsx, accesible desde "GESTIONAR" en el
  detalle de una bebida. Stepper +/- por ubicación para ajustar stock de a una
  botella sin pasar por el formulario completo de movimiento; permite agregar
  stock en una ubicación nueva sin salir del modal. Reutiliza `POST /movements`.
- [ ] **Fase 5 – Pulido** ← PRÓXIMO PASO
  - Dedup difuso del catálogo: la dedup exacta (migración 011/012) no atrapa variantes con tipeo/puntuación/sufijos ("Red label." vs "Red Label", "Corona Extra" vs "Corona Extra 355ml"). Confirmado con datos reales: agrupando por nombre normalizado hay ~209 filas de más en destilados, ~159 en vinos, ~141 en cervezas — afecta a los tres tipos, pero se nota más en beer/destilados (Open Food Facts) por lo ruidoso de esos datos vs. Vivino. Necesita similarity/pg_trgm, no un índice exacto.
  - Al agregar una bebida que no se auto-detecta (manual), permitir subir una foto de etiqueta (opcional)
  - Toggle día/noche
  - Selector de idioma ES/EN
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

Ver checklist detallado arriba en "Estado actual". Resumen priorizado:

1. Dedup difuso del catálogo (pg_trgm) — bug confirmado, afecta a los 3 tipos
2. Ubicación + cantidad al agregar una bebida ✅ (ya implementado)
3. Pantalla "Actividad" ✅ (ya implementado)
4. Modal "Gestionar" ✅ (ya implementado)
5. Foto de etiqueta opcional al agregar manualmente
6. Toggle día/noche, selector de idioma ES/EN
7. Filtros avanzados en la colección, alertas de stock bajo, estadísticas, exportar CSV, escaneo de etiquetas, ocasión de consumo

Nota: el precio de la botella está fuera de alcance por decisión explícita — no
implementar en ningún punto de esta lista. Valuación de colección (si se hace)
va sin precio: cantidad por tipo/variedad, por país de origen, etc.

## Notas del catálogo

- La API explore de Vivino ignora texto libre (solo filtros estructurados) y
  solo lista vinos comprables (~60 por país). La búsqueda HTML sí respeta texto
  pero trae pocos resultados y no pagina. Ver `backend/src/services/catalogSources.js`.
- OFF bulk: usar `search.openfoodfacts.org` (no `cgi/search.pl`, da 503).
  Tags de categoría reales: `en:hard-liquors`, `en:whisky` (singular), `en:beers`, `en:wines`.
- Dedup del catálogo por (nombre, productor, tipo, añada) con índice único
  parcial para OFF (migración 011/012). Es dedup EXACTO (case/trim-insensitive),
  no atrapa variantes con tipeo o sufijos distintos — ver Fase 5.
