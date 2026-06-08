CREATE TABLE IF NOT EXISTS inventory (
  id           SERIAL PRIMARY KEY,
  beverage_id  INTEGER NOT NULL REFERENCES beverages(id),
  location_id  INTEGER REFERENCES locations(id),
  quantity     INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Dos índices parciales para manejar el caso NULL en location_id.
-- En PostgreSQL, NULL != NULL, por lo que un UNIQUE normal no funciona.
CREATE UNIQUE INDEX IF NOT EXISTS inventory_bev_loc_idx
  ON inventory (beverage_id, location_id)
  WHERE location_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_bev_no_loc_idx
  ON inventory (beverage_id)
  WHERE location_id IS NULL;
