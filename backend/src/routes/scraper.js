const express = require('express');
const axios = require('axios');
const { query } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// ─── Vivino ───────────────────────────────────────────────────────────────────

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

function normalizeVivino(match) {
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
    source:               'vivino',
    external_id:          v.id ? String(v.id) : null,
    vivino_vintage_id:    v.id || null,
    name:                 wine.name  || v.name || null,
    producer:             winery.name           || null,
    country:              country.name          || null,
    region:               region.name           || null,
    type:                 VIVINO_TYPES[wine.type_id] || 'wine',
    vintage:              v.year                || null,
    grape_variety:        grapes.map(g => g.name).join(', ') || null,
    alcohol_pct:          null,
    image_url:            imgPath ? `https:${imgPath}` : null,
    external_url:         wine.id ? `https://www.vivino.com/wines/${wine.id}` : null,
    vivino_rating:        stats.ratings_average || null,
    vivino_ratings_count: stats.ratings_count   || 0,
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

// ─── Open Food Facts ──────────────────────────────────────────────────────────

const OFF_CATEGORIES = {
  beer:    'beers',
  spirits: 'spirits',
};

function normalizeOFF(product) {
  if (!product.product_name?.trim()) return null;

  const cats = (product.categories || '').toLowerCase();
  let type = 'other';
  if (cats.match(/whisk(e?y|ies)|gin\b|rum\b|vodka|tequila|brandy|cognac|scotch|spirit|mezcal|aguardiente/))
    type = 'spirits';
  else if (cats.match(/\bbeer\b|cerveza|ale\b|lager|stout|porter|\bipa\b|sour\b|pilsner/))
    type = 'beer';
  else if (cats.match(/\bwine\b|vino\b|cava\b|champagne|espumante|prosecco/))
    type = 'wine';

  const country =
    product.origins?.split(',')[0]?.trim() ||
    product.countries_tags?.[0]?.replace(/^en:/, '')?.replace(/-/g, ' ') || null;

  const abv =
    (product.nutriments && product.nutriments['alcohol_100g']) ||
    (product.alcohol_value ? parseFloat(product.alcohol_value) : null) || null;

  return {
    source:               'openfoodfacts',
    external_id:          product.code || null,
    vivino_vintage_id:    null,
    name:                 product.product_name.trim(),
    producer:             product.brands?.split(',')[0]?.trim() || null,
    country,
    region:               null,
    type,
    vintage:              null,
    grape_variety:        null,
    alcohol_pct:          abv ? parseFloat(abv) : null,
    image_url:            product.image_front_url || product.image_url || null,
    external_url:         product.code ? `https://world.openfoodfacts.org/product/${product.code}` : null,
    vivino_rating:        null,
    vivino_ratings_count: 0,
  };
}

async function fetchOFF(q, type, perPage = 15) {
  const params = {
    search_terms: q,
    search_simple: 1,
    action: 'process',
    json: 1,
    page_size: perPage,
  };
  if (OFF_CATEGORIES[type]) {
    params.tagtype_0 = 'categories';
    params.tag_0 = OFF_CATEGORIES[type];
  }

  const { data } = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
    params,
    timeout: 10000,
    headers: { 'User-Agent': 'CaveBin/1.0 (diogenespuig@gmail.com)' },
  });

  return (data?.products || [])
    .map(normalizeOFF)
    .filter(p => p !== null && p.name && p.external_id);
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

// POST /api/scraper/search
// { q: string, type?: 'all' | 'wine' | 'beer' | 'spirits' }
router.post('/search', requireAuth, async (req, res) => {
  const { q, type = 'all' } = req.body;
  if (!q) return res.status(400).json({ error: 'q es obligatorio' });

  const searchWine    = type === 'all' || type === 'wine';
  const searchBeer    = type === 'all' || type === 'beer';
  const searchSpirits = type === 'all' || type === 'spirits';

  const promises = [
    searchWine
      ? fetchVivino(q, 1, 10)
          .then(m => m.map(normalizeVivino))
          .catch(err => { console.error('Vivino error:', err.message); return []; })
      : Promise.resolve([]),
    searchBeer
      ? fetchOFF(q, 'beer', 10)
          .catch(err => { console.error('OFF beer error:', err.message); return []; })
      : Promise.resolve([]),
    searchSpirits
      ? fetchOFF(q, 'spirits', 10)
          .catch(err => { console.error('OFF spirits error:', err.message); return []; })
      : Promise.resolve([]),
  ];

  const [wines, beers, spirits] = await Promise.all(promises);
  res.json([...wines, ...beers, ...spirits]);
});

// POST /api/scraper/import  — solo admins
// { q: string, type?: 'wine' | 'beer' | 'spirits', pages?: number }
router.post('/import', requireAuth, requireAdmin, async (req, res) => {
  const { q, type = 'wine', pages = 1 } = req.body;
  if (!q) return res.status(400).json({ error: 'q es obligatorio' });
  if (!['wine', 'beer', 'spirits'].includes(type)) {
    return res.status(400).json({ error: 'type debe ser wine, beer o spirits' });
  }

  let items = [];

  try {
    if (type === 'wine') {
      const maxPages = Math.min(parseInt(pages) || 1, 5);
      for (let page = 1; page <= maxPages; page++) {
        const matches = await fetchVivino(q, page, 25);
        if (!matches.length) break;
        items = items.concat(matches.map(normalizeVivino));
      }
    } else {
      items = await fetchOFF(q, type, 50);
    }
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) return res.status(429).json({ error: 'Límite de solicitudes alcanzado, intentá en un momento' });
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
