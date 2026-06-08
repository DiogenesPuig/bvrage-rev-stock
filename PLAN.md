# CaveBin – Plan de Arquitectura

## Visión general

App para gestionar una colección personal de bebidas alcohólicas (inicialmente vinos, extensible). Multi-usuario, mobile-first (PWA), con historial de movimientos (compras/consumos) y una sección social de reseñas públicas. Incluye búsqueda automática de información por nombre de bebida vía scraping.

**Stack:** React + Node/Express + PostgreSQL  
**Mobile:** PWA via `vite-plugin-pwa` (instalable, funciona offline)  
**Auth:** JWT + refresh tokens

---

## Estructura de carpetas

```
CaveBin/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── migrations/         # Scripts SQL numerados (001_, 002_, ...)
│   │   │   └── index.js            # Pool de conexión PostgreSQL (pg)
│   │   ├── middleware/
│   │   │   └── auth.js             # Verificación JWT
│   │   ├── routes/
│   │   │   ├── auth.js             # Register, login, refresh token
│   │   │   ├── beverages.js        # CRUD de bebidas del usuario
│   │   │   ├── locations.js        # CRUD de ubicaciones del usuario
│   │   │   ├── movements.js        # Compras y consumos
│   │   │   ├── reviews.js          # Reseñas públicas
│   │   │   └── scraper.js          # Búsqueda de info por nombre
│   │   ├── services/
│   │   │   └── scraper.js          # Lógica de scraping (Puppeteer + Cheerio)
│   │   └── index.js                # Entry point Express
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── manifest.json           # PWA manifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── BeverageCard.jsx    # Card con stock total
│   │   │   ├── BeverageForm.jsx    # Agregar/editar bebida
│   │   │   ├── MovementForm.jsx    # Registrar compra o consumo
│   │   │   ├── LocationManager.jsx # CRUD de ubicaciones
│   │   │   ├── ReviewCard.jsx      # Reseña pública de un vino
│   │   │   ├── SearchModal.jsx     # Buscar y pre-llenar desde scraping
│   │   │   └── FilterBar.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Collection.jsx      # Mi colección
│   │   │   ├── Detail.jsx          # Detalle + historial de movimientos
│   │   │   ├── Locations.jsx       # Gestión de ubicaciones / inventario
│   │   │   └── Community.jsx       # Reseñas públicas de todos
│   │   ├── api/
│   │   │   └── client.js           # Fetch con JWT automático
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Estado global de sesión
│   │   └── App.jsx
│   ├── vite.config.js              # vite-plugin-pwa configurado
│   └── package.json
│
└── PLAN.md
```

---

## Modelo de datos

### Tabla `users`

| Columna        | Tipo          | Descripción                    |
|----------------|---------------|--------------------------------|
| id             | SERIAL PK     |                                |
| email          | VARCHAR(255)  | UNIQUE NOT NULL                |
| password_hash  | TEXT          | bcrypt                         |
| display_name   | VARCHAR(100)  |                                |
| created_at     | TIMESTAMPTZ   |                                |
| deleted_at     | TIMESTAMPTZ   | Soft delete                    |

---

### Tabla `beverages` (catálogo personal del usuario)

| Columna       | Tipo          | Descripción                          |
|---------------|---------------|--------------------------------------|
| id            | SERIAL PK     |                                      |
| user_id       | INTEGER FK    | → users.id                           |
| type          | VARCHAR(50)   | "wine", "beer", "spirits", etc.      |
| name          | VARCHAR(255)  |                                      |
| producer      | VARCHAR(255)  | Bodega / productor                   |
| country       | VARCHAR(100)  |                                      |
| region        | VARCHAR(100)  |                                      |
| vintage       | INTEGER       | Año (para vinos)                     |
| grape_variety | VARCHAR(255)  | Uvas (para vinos)                    |
| alcohol_pct   | DECIMAL(4,1)  |                                      |
| personal_note | TEXT          | Nota privada del usuario             |
| rating        | DECIMAL(3,1)  | Calificación personal (0-10)         |
| image_url     | TEXT          |                                      |
| external_url  | TEXT          | URL fuente del scraping              |
| metadata      | JSONB         | Atributos extra por tipo de bebida   |
| created_at    | TIMESTAMPTZ   |                                      |
| updated_at    | TIMESTAMPTZ   |                                      |
| deleted_at    | TIMESTAMPTZ   | Soft delete                          |

> `personal_note` y `rating` son privados. Las reseñas públicas van en la tabla `reviews`.  
> `metadata` JSONB para atributos variables: `{"style": "tinto", "aging": "gran reserva"}`.

---

### Tabla `locations` (ubicaciones definidas por el usuario)

| Columna     | Tipo         | Descripción                              |
|-------------|--------------|------------------------------------------|
| id          | SERIAL PK    |                                          |
| user_id     | INTEGER FK   | → users.id                               |
| name        | VARCHAR(255) | "Repisa sala", "Caja 2B", "Bodega", etc. |
| description | TEXT         | Opcional                                 |
| created_at  | TIMESTAMPTZ  |                                          |
| deleted_at  | TIMESTAMPTZ  | Soft delete                              |

---

### Tabla `inventory` (stock actual por ubicación)

| Columna     | Tipo        | Descripción                                |
|-------------|-------------|--------------------------------------------|
| id          | SERIAL PK   |                                            |
| beverage_id | INTEGER FK  | → beverages.id                             |
| location_id | INTEGER FK  | → locations.id (nullable = sin ubicación)  |
| quantity    | INTEGER     | Botellas actuales en esa ubicación         |
| updated_at  | TIMESTAMPTZ |                                            |

> `quantity` se actualiza automáticamente cuando se registra un movimiento.  
> El stock total de una bebida = `SUM(inventory.quantity)` agrupado por `beverage_id`.

---

### Tabla `inventory_movements` (historial de compras y consumos)

| Columna     | Tipo          | Descripción                                         |
|-------------|---------------|-----------------------------------------------------|
| id          | SERIAL PK     |                                                     |
| beverage_id | INTEGER FK    | → beverages.id                                      |
| location_id | INTEGER FK    | → locations.id (nullable)                           |
| user_id     | INTEGER FK    | → users.id                                          |
| type        | VARCHAR(20)   | "purchase" \| "consumption" \| "transfer"           |
| quantity    | INTEGER       | Positivo para entradas, negativo para salidas        |
| date        | DATE          | Fecha del evento                                    |
| price       | DECIMAL(10,2) | Precio de compra por botella (opcional)             |
| occasion    | VARCHAR(255)  | "Cena de cumpleaños", "Regalo", etc. (opcional)     |
| notes       | TEXT          | Opcional                                            |
| created_at  | TIMESTAMPTZ   |                                                     |

> El stock se recalcula como `SUM(quantity)` de todos los movimientos.  
> Nunca se editan movimientos pasados — si hay un error se crea un movimiento correctivo.

**Ejemplo:**
```
"Compré 6 botellas de Catena Zapata el 5 de enero"
→ movement: { type: "purchase", quantity: +6, date: "2025-01-05", location_id: 2 }

"Tomé 1 el 14 de febrero, cena romántica"
→ movement: { type: "consumption", quantity: -1, date: "2025-02-14", occasion: "Cena romántica" }

Stock actual: 6 + (-1) = 5 ✓
```

---

### Tabla `reviews` (reseñas públicas — sección comunitaria)

| Columna      | Tipo          | Descripción                                        |
|--------------|---------------|----------------------------------------------------|
| id           | SERIAL PK     |                                                    |
| user_id      | INTEGER FK    | → users.id (autor)                                 |
| beverage_ref | VARCHAR(255)  | Nombre canónico del vino (no FK a beverages)       |
| body         | TEXT          | Texto de la reseña                                 |
| rating       | DECIMAL(3,1)  | Calificación pública (0-10)                        |
| created_at   | TIMESTAMPTZ   |                                                    |
| updated_at   | TIMESTAMPTZ   |                                                    |
| deleted_at   | TIMESTAMPTZ   | Soft delete                                        |

> `beverage_ref` es texto libre (ej: "Catena Zapata Adrianna 2019") en vez de FK, porque la reseña es pública y no depende de que el usuario tenga esa bebida en su colección.

---

## API REST

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

# Colección (privada, requiere JWT)
GET    /api/beverages                    → Mi colección (filtros: type, country, vintage, stock)
GET    /api/beverages/:id               → Detalle + stock por ubicación
POST   /api/beverages                   → Agregar bebida
PUT    /api/beverages/:id               → Editar bebida
DELETE /api/beverages/:id               → Soft delete

# Ubicaciones (privadas)
GET    /api/locations                   → Mis ubicaciones
POST   /api/locations                   → Crear ubicación
PUT    /api/locations/:id               → Editar
DELETE /api/locations/:id               → Soft delete
GET    /api/locations/:id/inventory     → Qué hay en esa ubicación

# Movimientos (privados)
GET    /api/beverages/:id/movements     → Historial de una bebida
POST   /api/movements                   → Registrar compra / consumo / transferencia

# Reseñas (públicas, lectura sin JWT, escritura requiere JWT)
GET    /api/reviews?q=nombre+del+vino   → Buscar reseñas por nombre de bebida
POST   /api/reviews                     → Escribir reseña
PUT    /api/reviews/:id                 → Editar propia reseña
DELETE /api/reviews/:id                 → Soft delete propia reseña

# Scraping
POST   /api/scraper/search              → { "query": "Vega Sicilia Único 2018" }
                                          Retorna datos para pre-llenar el formulario
```

---

## Estrategia de scraping

Fuentes por orden de preferencia:

1. **Vivino** – La más completa para vinos. Client-rendered → requiere Puppeteer.
2. **Wine-Searcher** – Alternativa con precios de mercado.
3. **Distiller / Whiskybase** – Para espirituosas a futuro.

**Flujo:**
1. Usuario escribe el nombre en el modal de búsqueda.
2. Frontend llama a `POST /api/scraper/search`.
3. Backend hace scraping y devuelve campos encontrados.
4. Formulario se pre-llena; usuario revisa y guarda.

**Librería:** `puppeteer-core` + `cheerio`

---

## PWA (Mobile)

Con `vite-plugin-pwa` el frontend se convierte en una Progressive Web App:

- Instalable en Android e iOS desde el browser (sin App Store)
- Funciona offline con service worker (útil en bodegas sin señal)
- Mismo código base que la versión desktop
- Diseño responsive con Tailwind CSS

---

## Roadmap de desarrollo

### Fase 1 – Backend base + Auth
- [ ] Setup Express + pg + dotenv
- [ ] Migraciones: `users`, `beverages`, `locations`, `inventory`, `inventory_movements`, `reviews`
- [ ] Auth: register, login, JWT + refresh token (bcrypt + jsonwebtoken)
- [ ] Middleware de autenticación
- [ ] CRUD beverages (con user_id en todas las queries)
- [ ] CRUD locations
- [ ] Endpoints de movimientos (compra / consumo)
- [ ] Soft deletes en todas las tablas

### Fase 2 – Frontend base + PWA
- [ ] Setup Vite + React + Tailwind + vite-plugin-pwa
- [ ] Pantallas Login / Register
- [ ] AuthContext + manejo de JWT en cliente
- [ ] Vista de colección con stock total
- [ ] Detalle de bebida + historial de movimientos
- [ ] Modal "Registrar compra" / "Registrar consumo"
- [ ] Gestión de ubicaciones + vista por ubicación
- [ ] Conexión completa con la API

### Fase 3 – Scraping
- [ ] Investigar estructura de Vivino
- [ ] Servicio de scraping en backend
- [ ] Modal de búsqueda con pre-llenado de formulario

### Fase 4 – Sección comunitaria
- [ ] Endpoint de reviews en backend
- [ ] Página `Community.jsx` — buscar vino, ver reseñas, escribir reseña
- [ ] Rating promedio de la comunidad en la ficha de cada vino

### Fase 5 – Pulido y features extra
- [ ] Filtros avanzados y búsqueda en la colección
- [ ] Alertas de stock bajo ("solo te queda 1 botella")
- [ ] Estadísticas: valor total de la colección, botellas por tipo, consumo mensual
- [ ] Exportar colección a CSV
- [ ] Escanear etiqueta con cámara del celu (integra con scraping)
- [ ] Registrar ocasión al consumir ("con quién", "para qué")

---

## Decisiones de diseño

- **Auth desde la Fase 1**: Retrofitear `user_id` en todas las tablas a mitad de proyecto es costoso. Se implementa desde el inicio aunque al principio haya un solo usuario.
- **Movimientos como fuente de verdad**: El stock nunca se edita directamente; se registran eventos (purchase/consumption/transfer). Da historial completo y es auditable. Los errores se corrigen con movimientos correctivos.
- **Soft deletes**: Nada se borra físicamente. `deleted_at IS NOT NULL` excluye registros de las queries normales. Permite recuperar datos y mantener integridad referencial.
- **Reviews desacopladas de beverages**: `beverage_ref` es texto libre. Una reseña no requiere que el autor tenga la bebida en su colección, y sobrevive si alguien borra su bebida.
- **JSONB para metadata**: Atributos variables por tipo de bebida sin alterar el esquema. Para vinos: `{"style": "tinto", "aging": "gran reserva", "appellation": "DOC Rioja"}`.
- **PWA sobre app nativa**: Mismo código, sin App Store, funciona offline. Para un proyecto personal es la opción más práctica.
- **Monorepo simple**: Un repo, dos carpetas. Sin Docker por ahora para mantener la simplicidad del setup local.
