const express = require('express');
const axios = require('axios');
const { query, pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const VIVINO_TYPES = {
  1: 'wine', 2: 'wine', 3: 'wine', 4: 'wine', 7: 'wine', 24: 'wine',
};

const VIVINO_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
  'Referer': 'https://www.vivino.com/',
  'Origin': 'https://www.vivino.com',
};

function normalizeMatch(match) {
  const v       = match.vintage   || {};
  const wine    = v.wine          || {};
  const winery  = wine.winery     || {};
  const region  = wine.region     || {};
  const country = region.country  || {};
  const image   = v.image         || {};
  const grapes  = wine.grapes     || [];
  const stats   = v.statistics    || {};

  const imgPath = image.variations?.bottle_medium_square || image.location;

  return {
    vivino_vintage_id:    v.id                     || null,
    source:               'vivino',
    name:                 wine.name  || v.name      || null,
    producer:             winery.name               || null,
    country:              country.name              || null,
    region:               region.name               || null,
    type:                 VIVINO_TYPES[wine.type_id] || 'wine',
    vintage:              v.year                    || null,
    grape_variety:        grapes.map(g => g.name).join(', ') || null,
    alcohol_pct:          null,
    image_url:            imgPath ? `https:${imgPath}` : null,
    external_url:         wine.id ? `https://www.vivino.com/wines/${wine.id}` : null,
    vivino_rating:        stats.ratings_average     || null,
    vivino_ratings_count: stats.ratings_count       || 0,
  };
}

async function fetchVivino(q, page = 1, perPage = 25) {
  const { data } = await axios.get('https://www.vivino.com/api/explore/explore', {
    params: { q, per_page: perPage, page, language: 'es', min_rating: 1 },
    headers: VIVINO_HEADERS,
    timeout: 12000,
  });
  return data?.explore_vintage?.matches || [];
}

function vivinoError(err, res) {
  const status = err.response?.status;
  if (status === 429) return res.status(429).json({ error: 'Vivino limitó las búsquedas, intentá en un momento' });
  if (status === 403) return res.status(503).json({ error: 'Vivino bloqueó la solicitud' });
  console.error('Vivino error:', err.message);
  res.status(503).json({ error: 'No se pudo conectar con Vivino' });
}

// POST /api/scraper/search  — búsqueda en tiempo real
router.post('/search', requireAuth, async (req, res) => {
  const { q } = req.body;
  if (!q) return res.status(400).json({ error: 'q es obligatorio' });
  try {
    const matches = await fetchVivino(q, 1, 10);
    res.json(matches.map(normalizeMatch));
  } catch (err) {
    vivinoError(err, res);
  }
});

// POST /api/scraper/import  — solo admins
router.post('/import', requireAuth, requireAdmin, async (req, res) => {
  const { q, pages = 1 } = req.body;
  if (!q) return res.status(400).json({ error: 'q es obligatorio' });

  const maxPages = Math.min(parseInt(pages) || 1, 5); // máximo 5 páginas (125 vinos)
  let imported = 0;
  let updated  = 0;

  try {
    for (let page = 1; page <= maxPages; page++) {
      const matches = await fetchVivino(q, page, 25);
      if (!matches.length) break;

      for (const match of matches) {
        const item = normalizeMatch(match);
        if (!item.vivino_vintage_id || !item.name) continue;

        const result = await query(
          `INSERT INTO wine_catalog
             (vivino_vintage_id, name, producer, country, region, type, vintage,
              grape_variety, image_url, external_url, vivino_rating, vivino_ratings_count)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (vivino_vintage_id) DO UPDATE SET
             name                 = EXCLUDED.name,
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
            item.vivino_vintage_id, item.name, item.producer, item.country,
            item.region, item.type, item.vintage, item.grape_variety,
            item.image_url, item.external_url, item.vivino_rating, item.vivino_ratings_count,
          ]
        );
        if (result.rows[0]?.inserted) imported++; else updated++;
      }
    }

    res.json({
      message: `Importación completa`,
      imported,
      updated,
      total: imported + updated,
    });
  } catch (err) {
    vivinoError(err, res);
  }
});

module.exports = router;
