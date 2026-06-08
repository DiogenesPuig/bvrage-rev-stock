# CaveBin – Backend

API REST en Node/Express + PostgreSQL.

## Requisitos

- Node.js 18+
- PostgreSQL 14+

## Setup

### 1. Crear la base de datos

```bash
psql -U postgres
CREATE DATABASE cavebin;
\q
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus datos:

```
DATABASE_URL=postgresql://postgres:tucontraseña@localhost:5432/cavebin
JWT_SECRET=una-clave-muy-larga-y-random
JWT_REFRESH_SECRET=otra-clave-muy-larga-y-random
PORT=3001
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Correr migraciones

```bash
npm run migrate
```

Esto crea todas las tablas. Se puede correr varias veces de forma segura (idempotente).

### 5. Iniciar el servidor

```bash
# Desarrollo (con hot reload)
npm run dev

# Producción
npm start
```

El servidor queda en `http://localhost:3001`.

---

## Endpoints principales

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/register | Registrar usuario |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Renovar access token |
| GET | /api/beverages | Mi colección |
| POST | /api/beverages | Agregar bebida |
| GET | /api/beverages/:id | Detalle + stock por ubicación |
| GET | /api/beverages/:id/movements | Historial de movimientos |
| GET | /api/locations | Mis ubicaciones |
| GET | /api/locations/:id/inventory | Qué hay en una ubicación |
| POST | /api/movements | Registrar compra / consumo |
| GET | /api/reviews?q=nombre | Reseñas públicas |
| POST | /api/reviews | Escribir reseña |

Todos los endpoints (salvo auth y GET /reviews) requieren header:
```
Authorization: Bearer <accessToken>
```

---

## Ejemplo rápido con curl

```bash
# Registrar
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"yo@mail.com","password":"12345678","displayName":"Dioge"}'

# Login y guardar el token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"yo@mail.com","password":"12345678"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

# Agregar una ubicación
curl -X POST http://localhost:3001/api/locations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Repisa sala"}'

# Agregar un vino
curl -X POST http://localhost:3001/api/beverages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Catena Zapata Adrianna","producer":"Catena","country":"Argentina","vintage":2019,"type":"wine"}'

# Registrar compra de 3 botellas en la repisa (location_id: 1, beverage_id: 1)
curl -X POST http://localhost:3001/api/movements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"beverage_id":1,"location_id":1,"type":"purchase","quantity":3,"price":45.00}'
```
