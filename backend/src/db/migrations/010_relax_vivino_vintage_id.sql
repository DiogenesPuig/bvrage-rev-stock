-- vivino_vintage_id era NOT NULL (heredado de wine_catalog), pero los ítems
-- de Open Food Facts y los scrapeados del HTML de Vivino no tienen vintage id.
ALTER TABLE beverage_catalog ALTER COLUMN vivino_vintage_id DROP NOT NULL;
