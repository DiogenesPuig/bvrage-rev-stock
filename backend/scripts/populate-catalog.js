#!/usr/bin/env node
/**
 * Populate the beverage_catalog from external sources.
 *
 * Usage:
 *   node scripts/populate-catalog.js --type wine    --query "malbec argentina" [--pages 5]
 *   node scripts/populate-catalog.js --type beer    --query "ipa craft"
 *   node scripts/populate-catalog.js --type spirits --query "single malt scotch"
 *   node scripts/populate-catalog.js --file scripts/queries.json
 *
 * queries.json format:
 *   [
 *     { "type": "wine",    "query": "malbec argentina", "pages": 5 },
 *     { "type": "beer",    "query": "pale ale" },
 *     { "type": "spirits", "query": "bourbon whiskey" }
 *   ]
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');
const { fetchVivino, fetchOFF } = require('../src/services/catalogSources');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Arg parsing ─────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      args[key] = argv[i + 1] || true;
      i++;
    }
  }
  return args;
}

// ─── DB upsert ───────────────────────────────────────────────────────────────

async function upsertItem(item) {
  if (!item.name || !item.external_id) return null;
  const result = await pool.query(
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
  return result.rows[0]?.inserted ? 'imported' : 'updated';
}

// ─── Run a single query ───────────────────────────────────────────────────────

async function runQuery({ type, query: q, pages = 1 }) {
  console.log(`\n  [${type}] "${q}"${type === 'wine' ? ` (${pages} página/s)` : ''}`);

  let items = [];
  if (type === 'wine') {
    const maxPages = Math.min(parseInt(pages) || 1, 10);
    for (let page = 1; page <= maxPages; page++) {
      process.stdout.write(`    Vivino página ${page}... `);
      const batch = await fetchVivino(q, page, 25);
      console.log(`${batch.length} resultados`);
      if (!batch.length) break;
      items = items.concat(batch);
      if (page < maxPages) await new Promise(r => setTimeout(r, 1200));
    }
  } else if (type === 'beer' || type === 'spirits') {
    process.stdout.write(`    Open Food Facts... `);
    items = await fetchOFF(q, type, 50);
    console.log(`${items.length} resultados`);
  } else {
    console.log(`    Tipo desconocido: ${type}`);
    return { imported: 0, updated: 0 };
  }

  let imported = 0;
  let updated  = 0;
  let errors   = 0;

  for (const item of items) {
    try {
      const outcome = await upsertItem(item);
      if (outcome === 'imported') imported++;
      else if (outcome === 'updated') updated++;
    } catch (err) {
      errors++;
      if (process.env.VERBOSE) console.error(`    ! ${item.name}: ${err.message}`);
    }
  }

  console.log(`    ✓ ${imported} nuevos, ${updated} actualizados${errors ? `, ${errors} errores` : ''}`);
  return { imported, updated };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  let queries = [];

  if (args.file) {
    const filePath = path.resolve(args.file);
    queries = JSON.parse(require('fs').readFileSync(filePath, 'utf8'));
  } else if (args.type && args.query) {
    queries = [{ type: args.type, query: args.query, pages: parseInt(args.pages) || 1 }];
  } else {
    console.error(`
Uso:
  node scripts/populate-catalog.js --type wine    --query "malbec argentina" [--pages 5]
  node scripts/populate-catalog.js --type beer    --query "ipa craft"
  node scripts/populate-catalog.js --type spirits --query "single malt scotch"
  node scripts/populate-catalog.js --file scripts/queries.json

Variables de entorno:
  VERBOSE=1   muestra errores detallados por ítem
    `);
    process.exit(1);
  }

  console.log(`\nCaveBin — Populate Catalog`);
  console.log(`Fuentes: Vivino (vinos) · Open Food Facts (cervezas y destilados)`);
  console.log(`─────────────────────────────────────────`);

  let totalImported = 0;
  let totalUpdated  = 0;

  for (const q of queries) {
    const { imported, updated } = await runQuery(q);
    totalImported += imported;
    totalUpdated  += updated;
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`Total: ${totalImported} nuevos, ${totalUpdated} actualizados\n`);

  await pool.end();
}

main().catch(err => {
  console.error('Error fatal:', err.message);
  process.exit(1);
});
