const express = require('express');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { fetchVivino, fetchOFF } = require('../services/catalogSources');

const router = express.Router();

// POST /api/scraper/import  — admin: importa desde fuente externa al catálogo
// { q: string, type: 'wine' | 'beer' | 'spirits' }
router.post('/import', requireAuth, requireAdmin, async (req, res) => {
  const { q, type = 'wine' } = req.body;
  if (!q) return res.status(400).json({ error: 'q es obligatorio' });
  if (!['wine', 'beer', 'spirits'].includes(type)) {
    return res.status(400).json({ error: 'type debe ser wine, beer o spirits' });
  }

  let items = [];
  try {
    if (type === 'wine') {
      // La búsqueda HTML de Vivino no pagina (el SSR siempre trae lo mismo)
      items = await fetchVivino(q, 1);
    } else {
      items = await fetchOFF(q, type, 50);
    }
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) return res.status(429).json({ error: 'Límite de solicitudes alcanzado, intentá más tarde' });
    console.error('Import fetch error:', err.message);
    return res.status(503).json({ error: 'No se pudo conectar con la fuente externa' });
  }

  let imported = 0;
  let updated  = 0;

  for (const item of items) {
    if (!item.name || !item.external_id) continue;
    try {
      const result = await query(
        `INSERT INTO beverage_catalog
           (source, external_id, vivino_vintage_id, name, producer, country, region,
            type, vintage, grape_variety, image_url, external_url,
            vivino_rating, vivino_ratings_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (source, external_id) DO UPDATE SET
           name                 = EXCLUDED.name,
           type                 = EXCLUDED.type,
           producer             = EXCLUDED.producer,
           country              = EXCLUDED.country,
           region               = EXCLUDED.region,
           grape_variety        = EXCLUDED.grape_variety,
           image_url            = EXCLUDED.image_url,
           vivino_rating        = EXCLUDED.vivino_rating,
           vivino_ratings_count = EXCLUDED.vivino_ratings_count,
           updated_at           = NOW()
         RETURNING (xmax = 0) AS inserted`,
        [
          item.source, item.external_id, item.vivino_vintage_id,
          item.name, item.producer, item.country, item.region,
          item.type, item.vintage, item.grape_variety,
          item.image_url, item.external_url,
          item.vivino_rating, item.vivino_ratings_count,
        ]
      );
      if (result.rows[0]?.inserted) imported++; else updated++;
    } catch (dbErr) {
      console.error('Import DB error:', dbErr.message, item.name);
    }
  }

  res.json({ message: 'Importación completa', imported, updated, total: imported + updated });
});

module.exports = router;
