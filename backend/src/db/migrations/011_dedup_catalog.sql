-- El mismo producto aparece varias veces porque OFF tiene una fila por código
-- de barras y cada país envasa el suyo (ej: Johnnie Walker Red Label × 10).
-- Conservar la mejor fila por identidad (nombre, productor, tipo, añada):
-- primero las que tienen imagen, después las de más reseñas, después la más vieja.
DELETE FROM beverage_catalog bc
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY lower(trim(name)), lower(trim(coalesce(producer, ''))), type, coalesce(vintage, 0)
    ORDER BY (image_url IS NULL), vivino_ratings_count DESC, id
  ) AS rn
  FROM beverage_catalog
) ranked
WHERE bc.id = ranked.id AND ranked.rn > 1;

-- Evitar que futuros imports de OFF reintroduzcan duplicados con otro barcode.
-- Solo para OFF: los vinos de Vivino comparten nombre+productor entre añadas.
CREATE UNIQUE INDEX uq_beverage_catalog_off_identity
  ON beverage_catalog (lower(trim(name)), lower(trim(coalesce(producer, ''))), type)
  WHERE source = 'openfoodfacts';
