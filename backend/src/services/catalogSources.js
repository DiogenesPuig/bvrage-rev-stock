const axios = require('axios');

// ─── Vivino ───────────────────────────────────────────────────────────────────

const VIVINO_TYPE_MAP = {
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
    name:                 wine.name || v.name || null,
    producer:             winery.name || null,
    country:              country.name || null,
    region:               region.name || null,
    type:                 VIVINO_TYPE_MAP[wine.type_id] || 'wine',
    vintage:              v.year || null,
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
    timeout: 15000,
  });
  return (data?.explore_vintage?.matches || []).map(normalizeVivino);
}

// ─── Open Food Facts ──────────────────────────────────────────────────────────

const OFF_CATEGORY_MAP = {
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
    (product.nutriments?.['alcohol_100g']) ||
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

async function fetchOFF(q, type, perPage = 30) {
  const params = {
    search_terms: q,
    search_simple: 1,
    action: 'process',
    json: 1,
    page_size: perPage,
  };
  if (OFF_CATEGORY_MAP[type]) {
    params.tagtype_0 = 'categories';
    params.tag_0 = OFF_CATEGORY_MAP[type];
  }

  const { data } = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
    params,
    timeout: 12000,
    headers: { 'User-Agent': 'CaveBin/1.0 (diogenespuig@gmail.com)' },
  });

  return (data?.products || [])
    .map(normalizeOFF)
    .filter(p => p !== null && p.name && p.external_id);
}

module.exports = { fetchVivino, fetchOFF, normalizeVivino, normalizeOFF };
