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

- [ ] **Fase 2 – Frontend + PWA** ← PRÓXIMO PASO
- [ ] **Fase 3 – Scraping** (Vivino con Puppeteer)
- [ ] **Fase 4 – Sección comunitaria**
- [ ] **Fase 5 – Pulido**

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

## Próximos pasos (Fase 2)

```bash
cd ..
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer vite-plugin-pwa
npx tailwindcss init -p
```

Componentes a crear:
- `AuthContext.jsx` — estado global de sesión + refresh automático
- `pages/Login.jsx`, `Register.jsx`
- `pages/Collection.jsx` — lista de bebidas con stock total
- `pages/Detail.jsx` — detalle + historial de movimientos + stock por ubicación
- `components/MovementForm.jsx` — registrar compra o consumo
- `pages/Locations.jsx` — gestión de ubicaciones
- `pages/Community.jsx` — reseñas públicas
