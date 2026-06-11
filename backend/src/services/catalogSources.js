const axios = require('axios');

// ─── Vivino ───────────────────────────────────────────────────────────────────
//
// Vivino expone dos caminos, ninguno completo:
//  - /api/explore/explore (JSON): pagina y trae datos ricos, pero IGNORA el
//    texto libre — solo filtra por parámetros estructurados (country_codes[],
//    grape_ids[], price_range_*) y solo lista vinos con ofertas de compra
//    activas (~decenas a cientos por filtro). → fetchVivinoExplore, para bulk.
//  - /es/search/wines?q= (HTML): sí respeta el texto, pero server-renderiza
//    solo los primeros ~4-12 matches y el parámetro page no cambia el SSR.
//    → fetchVivino, para búsquedas puntuales.

// Chrome/Win10 UA is blocked by Vivino's WAF (CloudFront) — use Mac UA instead
const VIVINO_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const VIVINO_HEADERS = {
  'User-Agent': VIVINO_UA,
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
  'Referer': 'https://www.vivino.com/',
};

const VIVINO_API_HEADERS = {
  'User-Agent': VIVINO_UA,
  'Accept': 'application/json',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.8',
  'Referer': 'https://www.vivino.com/',
  // Axios 1.x adds Content-Type on GET requests by default; Vivino rejects it with 415
  'Content-Type': null,
};

// IDs de uva de /api/grapes (los más comunes, para armar filtros):
//   1 Syrah · 2 Cabernet Sauvignon · 5 Chardonnay · 8 Grenache · 9 Malbec
//   10 Merlot · 12 Nebbiolo · 14 Pinot Noir · 15 Riesling · 16 Sangiovese
//   17 Sauvignon Blanc · 19 Tempranillo · 21 Zinfandel

function normalizeVivinoMatch(match) {
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
    type:                 'wine',
    vintage:              Number.isInteger(v.year) ? v.year : null,
    grape_variety:        grapes.map(g => g.name).join(', ') || null,
    alcohol_pct:          null,
    image_url:            imgPath ? `https:${imgPath}` : null,
    external_url:         wine.id ? `https://www.vivino.com/wines/${wine.id}` : null,
    vivino_rating:        stats.ratings_average || null,
    vivino_ratings_count: stats.ratings_count   || 0,
  };
}

/**
 * Bulk por filtros estructurados. `filters` admite, entre otros:
 *   country_codes: ['ar']      países de origen
 *   grape_ids:     [9]         uvas (ver tabla arriba)
 *   wine_type_ids: [1]         1 tinto, 2 blanco, 3 espumante, 4 rosado
 *   min_rating, price_range_min, price_range_max
 */
async function fetchVivinoExplore(filters = {}, page = 1, perPage = 25) {
  const params = { per_page: perPage, page, language: 'es' };
  for (const [key, val] of Object.entries(filters)) {
    if (Array.isArray(val)) params[`${key}[]`] = val;
    else params[key] = val;
  }
  const { data } = await axios.get('https://www.vivino.com/api/explore/explore', {
    params,
    headers: VIVINO_API_HEADERS,
    timeout: 15000,
  });
  return (data?.explore_vintage?.matches || [])
    .map(normalizeVivinoMatch)
    .filter(p => p.name && p.external_id);
}

function decodeEntities(s) {
  if (!s) return s;
  return s
    .replace(/<!--\s*-->/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'")
    .trim();
}

function parseVivinoCard(card) {
  const link = card.match(/data-testid="vintagePageLink"\s+href="([^"]+)"/);
  if (!link) return null;
  const href   = decodeEntities(link[1]);
  const wineId = href.match(/\/w\/(\d+)/)?.[1];
  if (!wineId) return null;
  const year = href.match(/[?&]year=(\d{4})/)?.[1];

  const producer    = card.match(/wineInfoVintage__truncate--[\w-]+">([^<]+)</)?.[1];
  const nameVintage = card.match(/wineInfoVintage__vintage--[\w-]+[^"]*">([^<]+)</)?.[1];
  let name = decodeEntities(nameVintage || '');
  // El div de nombre incluye la añada al final ("Malbec 2022") — separarla
  name = name.replace(/\s+\d{4}$/, '').trim();

  const regionCountry = card.match(/wineInfoLocation__regionAndCountry--[\w-]+">(.*?)<\/div>/)?.[1];
  let region = null, country = null;
  if (regionCountry) {
    const parts = decodeEntities(regionCountry).split(',').map(s => s.trim()).filter(Boolean);
    country = parts.pop() || null;
    region  = parts.join(', ') || null;
  }

  const rating = card.match(/vivinoRating__averageValue--[\w-]+">([\d.,]+)</)?.[1];
  const img    = card.match(/<img src="(\/\/images\.vivino\.com[^"]+)"/)?.[1];

  return {
    source:               'vivino',
    external_id:          year ? `${wineId}_${year}` : wineId,
    vivino_vintage_id:    null,
    name:                 name || null,
    producer:             producer ? decodeEntities(producer) : null,
    country,
    region,
    type:                 'wine',
    vintage:              year ? parseInt(year) : null,
    grape_variety:        null,
    alcohol_pct:          null,
    image_url:            img ? `https:${img}` : null,
    external_url:         `https://www.vivino.com${href.split('?')[0]}`,
    vivino_rating:        rating ? parseFloat(rating.replace(',', '.')) : null,
    vivino_ratings_count: 0,
  };
}

async function fetchVivino(q, page = 1) {
  const { data: html } = await axios.get('https://www.vivino.com/es/search/wines', {
    params: { q, page },
    headers: VIVINO_HEADERS,
    timeout: 20000,
    maxRedirects: 5,
  });

  // Cada card empieza en data-testid="wineCard"; el split descarta el preámbulo
  const cards = String(html).split('data-testid="wineCard"').slice(1);
  return cards
    .map(parseVivinoCard)
    .filter(p => p !== null && p.name && p.external_id);
}

// ─── Open Food Facts ──────────────────────────────────────────────────────────

const OFF_CATEGORY_MAP = {
  beer:    'beers',
  spirits: 'spirits',
};

function normalizeOFF(product, requestedType = 'other') {
  if (!product.product_name?.trim()) return null;

  // Muchos productos traen categorías vacías o en otros idiomas — si no se
  // puede detectar, usar el tipo solicitado (la API ya filtró por categoría)
  const cats = (product.categories || '').toLowerCase();
  let type = requestedType;
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

  // El search de OFF devuelve 503 intermitentes bajo carga — reintentar con backoff
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 3000 * attempt));
    try {
      const { data } = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
        params,
        timeout: 12000,
        headers: { 'User-Agent': 'CaveBin/1.0 (diogenespuig@gmail.com)' },
      });
      return (data?.products || [])
        .map(p => normalizeOFF(p, type))
        .filter(p => p !== null && p.name && p.external_id);
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if (status !== 503 && status !== 429) throw err;
    }
  }
  throw lastErr;
}

// ─── Open Food Facts: bulk por categoría (search-a-licious) ──────────────────
//
// search.openfoodfacts.org es infraestructura separada del cgi/search.pl
// (que sufre 503 crónicos) y expone hasta ~10.000 ítems por categoría,
// paginados y ordenables por popularidad (cantidad de escaneos).
// Categorías útiles: en:beers, en:wines, en:hard-liquors, en:whisky, en:gins,
// en:rums, en:liqueurs, en:tequilas — ver https://world.openfoodfacts.org/categories

function offTagToText(tag) {
  if (!tag) return null;
  return tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ');
}

function normalizeOFFBulk(hit, requestedType) {
  if (!hit.product_name || typeof hit.product_name !== 'string' || !hit.product_name.trim()) return null;

  const tags = hit.categories_tags || [];
  let type = requestedType;
  if (tags.includes('en:beers')) type = 'beer';
  else if (tags.includes('en:wines')) type = 'wine';
  else if (tags.includes('en:hard-liquors') || tags.includes('en:whisky') || tags.includes('en:eaux-de-vie') || tags.includes('en:liqueurs')) type = 'spirits';

  const abv =
    hit.nutriments?.['alcohol_100g'] ??
    (hit.alcohol_value ? parseFloat(hit.alcohol_value) : null) ?? null;

  return {
    source:               'openfoodfacts',
    external_id:          hit.code || null,
    vivino_vintage_id:    null,
    name:                 hit.product_name.trim(),
    producer:             (Array.isArray(hit.brands) ? hit.brands[0] : hit.brands)?.trim() || null,
    country:              offTagToText(hit.countries_tags?.[0]),
    region:               null,
    type,
    vintage:              null,
    grape_variety:        null,
    alcohol_pct:          abv ? parseFloat(abv) : null,
    image_url:            hit.image_front_url || hit.image_url || null,
    external_url:         hit.code ? `https://world.openfoodfacts.org/product/${hit.code}` : null,
    vivino_rating:        null,
    vivino_ratings_count: 0,
  };
}

async function fetchOFFCategory(category, type, page = 1, pageSize = 50) {
  const { data } = await axios.get('https://search.openfoodfacts.org/search', {
    params: {
      q: `categories_tags:"${category}"`,
      page_size: pageSize,
      page,
      sort_by: '-unique_scans_n',
    },
    timeout: 20000,
    headers: { 'User-Agent': 'CaveBin/1.0 (diogenespuig@gmail.com)' },
  });
  return (data?.hits || [])
    .map(h => normalizeOFFBulk(h, type))
    .filter(p => p !== null && p.name && p.external_id);
}

module.exports = {
  fetchVivino, fetchVivinoExplore, fetchOFF, fetchOFFCategory,
  parseVivinoCard, normalizeOFF, normalizeOFFBulk,
};
