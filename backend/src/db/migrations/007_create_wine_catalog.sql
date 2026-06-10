CREATE TABLE wine_catalog (
  id                    SERIAL PRIMARY KEY,
  vivino_vintage_id     INTEGER UNIQUE NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  producer              VARCHAR(255),
  country               VARCHAR(100),
  region                VARCHAR(100),
  type                  VARCHAR(50) NOT NULL DEFAULT 'wine',
  vintage               INTEGER,
  grape_variety         TEXT,
  image_url             TEXT,
  external_url          TEXT,
  vivino_rating         DECIMAL(3, 2),
  vivino_ratings_count  INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wine_catalog_name     ON wine_catalog (lower(name));
CREATE INDEX idx_wine_catalog_producer ON wine_catalog (lower(producer));
