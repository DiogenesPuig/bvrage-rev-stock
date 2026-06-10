const express = require('express');
const axios = require('axios');
const { requireAuth } = require('../middleware/auth');

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
  const v     = match.vintage || {};
  const wine  = v.wine        || {};
  const winery  = wine.winery  || {};
  const region  = wine.region  || {};
  const country = region.country || {};
  const image   = v.image     || {};
  const grapes  = wine.grapes  || [];

  const imgPath = image.variations?.bottle_medium_square || image.location;

  return {
    source:       'vivino',
    name:         wine.name  || v.name  || null,
    producer:     winery.name            || null,
    country:      country.name           || null,
    region:       region.name            || null,
    type:         VIVINO_TYPES[wine.type_id] || 'wine',
    vintage:      v.year                 || null,
    grape_variety: grapes.map(g => g.name).join(', ') || null,
    alcohol_pct:  null,
    image_url:    imgPath ? `https:${imgPath}` : null,
    external_url: wine.id ? `https://www.vivino.com/wines/${wine.id}` : null,
    vivino_rating:        v.ratings_average || null,
    vivino_ratings_count: v.ratings_count   || 0,
  };
}

// POST /api/scraper/search
router.post('/search', requireAuth, async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query es obligatorio' });

  try {
    const { data } = await axios.get('https://www.vivino.com/api/explore/explore', {
      params: { q: query, per_page: 10, language: 'es' },
      headers: VIVINO_HEADERS,
      timeout: 10000,
    });

    const matches = data?.explore_vintage?.matches || [];
    res.json(matches.map(normalizeMatch));
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) return res.status(429).json({ error: 'Vivino limitó las búsquedas, intentá en un momento' });
    if (status === 403) return res.status(503).json({ error: 'Vivino bloqueó la solicitud' });
    console.error('Vivino error:', err.message);
    res.status(503).json({ error: 'No se pudo conectar con Vivino' });
  }
});

module.exports = router;
