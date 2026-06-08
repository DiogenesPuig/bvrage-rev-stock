CREATE TABLE IF NOT EXISTS beverages (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  type          VARCHAR(50) NOT NULL DEFAULT 'wine',
  name          VARCHAR(255) NOT NULL,
  producer      VARCHAR(255),
  country       VARCHAR(100),
  region        VARCHAR(100),
  vintage       INTEGER,
  grape_variety VARCHAR(255),
  alcohol_pct   DECIMAL(4,1),
  personal_note TEXT,
  rating        DECIMAL(3,1) CHECK (rating >= 0 AND rating <= 10),
  image_url     TEXT,
  external_url  TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS beverages_user_id_idx ON beverages(user_id) WHERE deleted_at IS NULL;
