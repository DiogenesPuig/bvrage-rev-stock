CREATE TABLE IF NOT EXISTS reviews (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  beverage_ref  VARCHAR(255) NOT NULL,  -- nombre libre del vino, sin FK
  body          TEXT,
  rating        DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS reviews_beverage_ref_idx ON reviews USING gin(to_tsvector('simple', beverage_ref));
