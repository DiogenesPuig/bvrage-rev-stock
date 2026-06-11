-- Los textos de OFF vienen con entidades HTML sin decodificar y países en
-- minúscula (derivados de tags tipo "en:france").
-- El decode puede hacer colisionar filas en el índice único de OFF
-- (ej: "Ballantine&#39;s" → "Ballantine's"), así que: drop índice,
-- limpiar, re-deduplicar, recrear índice.

DROP INDEX IF EXISTS uq_beverage_catalog_off_identity;

UPDATE beverage_catalog SET
  name = replace(replace(replace(replace(replace(replace(name,
    '&quot;', '"'), '&amp;', '&'), '&#39;', ''''), '&apos;', ''''), '&deg;', '°'), '&#40;', '('),
  producer = replace(replace(replace(replace(replace(replace(coalesce(producer, ''),
    '&quot;', '"'), '&amp;', '&'), '&#39;', ''''), '&apos;', ''''), '&deg;', '°'), '&#40;', '(')
WHERE source = 'openfoodfacts'
  AND (name LIKE '%&%' OR producer LIKE '%&%');

UPDATE beverage_catalog SET producer = NULL
WHERE source = 'openfoodfacts' AND producer = '';

UPDATE beverage_catalog SET country = initcap(country)
WHERE source = 'openfoodfacts' AND country IS NOT NULL;

DELETE FROM beverage_catalog bc
USING (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY lower(trim(name)), lower(trim(coalesce(producer, ''))), type, coalesce(vintage, 0)
    ORDER BY (image_url IS NULL), vivino_ratings_count DESC, id
  ) AS rn
  FROM beverage_catalog
) ranked
WHERE bc.id = ranked.id AND ranked.rn > 1;

CREATE UNIQUE INDEX uq_beverage_catalog_off_identity
  ON beverage_catalog (lower(trim(name)), lower(trim(coalesce(producer, ''))), type)
  WHERE source = 'openfoodfacts';
