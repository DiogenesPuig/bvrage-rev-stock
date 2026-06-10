ALTER TABLE wine_catalog RENAME TO beverage_catalog;

ALTER TABLE beverage_catalog
  ADD COLUMN source      VARCHAR(50)  NOT NULL DEFAULT 'vivino',
  ADD COLUMN external_id VARCHAR(255);

-- Migrar vivino_vintage_id existente a external_id
UPDATE beverage_catalog
  SET external_id = vivino_vintage_id::text
  WHERE vivino_vintage_id IS NOT NULL;

-- Reemplazar unique constraint de vivino_vintage_id por (source, external_id)
ALTER TABLE beverage_catalog DROP CONSTRAINT wine_catalog_vivino_vintage_id_key;
ALTER TABLE beverage_catalog ADD CONSTRAINT uq_beverage_catalog_source_ext UNIQUE (source, external_id);

-- Actualizar índices
DROP INDEX IF EXISTS idx_wine_catalog_name;
DROP INDEX IF EXISTS idx_wine_catalog_producer;
CREATE INDEX idx_beverage_catalog_name     ON beverage_catalog (lower(name));
CREATE INDEX idx_beverage_catalog_producer ON beverage_catalog (lower(producer));
CREATE INDEX idx_beverage_catalog_type     ON beverage_catalog (type);
