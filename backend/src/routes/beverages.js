const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/beverages/suggestions?q=<query>  — busca entre bebidas de todos los usuarios
router.get('/suggestions', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);
  try {
    const result = await query(
      `SELECT DISTINCT ON (lower(trim(name)), lower(trim(COALESCE(producer, ''))))
         name, producer, type, country, region, grape_variety, alcohol_pct, image_url, external_url
       FROM beverages
       WHERE deleted_at IS NULL
         AND (name ILIKE $1 OR producer ILIKE $1)
       ORDER BY lower(trim(name)), lower(trim(COALESCE(producer, ''))), created_at DESC
       LIMIT 8`,
      [`%${q.trim()}%`]
    );
    res.json(result.rows.map(r => ({ ...r, source: 'community' })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/beverages
router.get('/', async (req, res) => {
  try {
    const { type, country, vintage, search } = req.query;
    const params = [req.user.userId];
    let paramIdx = 2;
    let filters = '';

    if (type)    { filters += ` AND b.type = $${paramIdx++}`;              params.push(type); }
    if (country) { filters += ` AND b.country ILIKE $${paramIdx++}`;       params.push(`%${country}%`); }
    if (vintage) { filters += ` AND b.vintage = $${paramIdx++}`;           params.push(parseInt(vintage)); }
    if (search)  { filters += ` AND (b.name ILIKE $${paramIdx} OR b.producer ILIKE $${paramIdx++})`; params.push(`%${search}%`); }

    const result = await query(
      `SELECT b.*,
              COALESCE(SUM(i.quantity), 0)::int AS total_stock
       FROM beverages b
       LEFT JOIN inventory i ON i.beverage_id = b.id
       WHERE b.user_id = $1 AND b.deleted_at IS NULL
       ${filters}
       GROUP BY b.id
       ORDER BY b.name`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/beverages/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT b.*,
              COALESCE(SUM(i.quantity), 0)::int AS total_stock,
              COALESCE(
                json_agg(
                  json_build_object(
                    'inventory_id', i.id,
                    'location_id',  i.location_id,
                    'location_name', l.name,
                    'quantity',     i.quantity
                  )
                ) FILTER (WHERE i.id IS NOT NULL),
                '[]'
              ) AS stock_by_location
       FROM beverages b
       LEFT JOIN inventory i ON i.beverage_id = b.id
       LEFT JOIN locations l ON l.id = i.location_id
       WHERE b.id = $1 AND b.user_id = $2 AND b.deleted_at IS NULL
       GROUP BY b.id`,
      [req.params.id, req.user.userId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Bebida no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/beverages
router.post('/', async (req, res) => {
  try {
    const {
      type, name, producer, country, region, vintage,
      grape_variety, alcohol_pct, personal_note, rating,
      image_url, external_url, metadata,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const result = await query(
      `INSERT INTO beverages
         (user_id, type, name, producer, country, region, vintage,
          grape_variety, alcohol_pct, personal_note, rating,
          image_url, external_url, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user.userId,
        type || 'wine', name, producer || null, country || null,
        region || null, vintage || null, grape_variety || null,
        alcohol_pct || null, personal_note || null, rating || null,
        image_url || null, external_url || null,
        JSON.stringify(metadata || {}),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/beverages/:id
router.put('/:id', async (req, res) => {
  try {
    const {
      type, name, producer, country, region, vintage,
      grape_variety, alcohol_pct, personal_note, rating,
      image_url, external_url, metadata,
    } = req.body;

    const result = await query(
      `UPDATE beverages SET
         type=$1, name=$2, producer=$3, country=$4, region=$5,
         vintage=$6, grape_variety=$7, alcohol_pct=$8,
         personal_note=$9, rating=$10, image_url=$11,
         external_url=$12, metadata=$13, updated_at=NOW()
       WHERE id=$14 AND user_id=$15 AND deleted_at IS NULL
       RETURNING *`,
      [
        type, name, producer, country, region, vintage,
        grape_variety, alcohol_pct, personal_note, rating,
        image_url, external_url, JSON.stringify(metadata || {}),
        req.params.id, req.user.userId,
      ]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Bebida no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/beverages/:id  (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `UPDATE beverages SET deleted_at=NOW()
       WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Bebida no encontrada' });
    res.json({ message: 'Eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/beverages/:id/movements
router.get('/:id/movements', async (req, res) => {
  try {
    const result = await query(
      `SELECT m.*, l.name AS location_name
       FROM inventory_movements m
       LEFT JOIN locations l ON l.id = m.location_id
       WHERE m.beverage_id = $1 AND m.user_id = $2
       ORDER BY m.date DESC, m.created_at DESC`,
      [req.params.id, req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
