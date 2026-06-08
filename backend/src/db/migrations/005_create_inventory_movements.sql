CREATE TABLE IF NOT EXISTS inventory_movements (
  id           SERIAL PRIMARY KEY,
  beverage_id  INTEGER NOT NULL REFERENCES beverages(id),
  location_id  INTEGER REFERENCES locations(id),
  user_id      INTEGER NOT NULL REFERENCES users(id),
  type         VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'consumption', 'transfer')),
  quantity     INTEGER NOT NULL,  -- positivo = entrada, negativo = salida
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  price        DECIMAL(10,2),     -- precio por botella (solo en purchases)
  occasion     VARCHAR(255),      -- "Cena de cumpleaños", "Regalo", etc.
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS movements_beverage_id_idx ON inventory_movements(beverage_id);
CREATE INDEX IF NOT EXISTS movements_user_id_idx ON inventory_movements(user_id);
