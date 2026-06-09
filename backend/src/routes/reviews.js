const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/reviews/featured — top bebidas por nro de reseñas, público
router.get('/featured', async (req, res) => {
  try {
    const result = await query(
      `SELECT
         beverage_ref,
         COUNT(*)::int                          AS review_count,
         ROUND(AVG(rating) FILTER (WHERE rating IS NOT NULL), 1) AS avg_rating,
         MAX(created_at)                        AS last_reviewed_at,
         (ARRAY_AGG(body ORDER BY created_at DESC) FILTER (WHERE body IS NOT NULL))[1] AS latest_body,
         (ARRAY_AGG(u.display_name ORDER BY r.created_at DESC))[1] AS latest_author
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.deleted_at IS NULL
       GROUP BY beverage_ref
       ORDER BY review_count DESC, avg_rating DESC NULLS LAST
       LIMIT 30`,
      []
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/reviews?q=nombre  — público, sin auth
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    const params = [];
    let filter = '';

    if (q) {
      filter = 'AND r.beverage_ref ILIKE $1';
      params.push(`%${q}%`);
    }

    const result = await query(
      `SELECT r.id, r.beverage_ref, r.body, r.rating, r.created_at, r.updated_at,
              u.display_name AS author_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.deleted_at IS NULL ${filter}
       ORDER BY r.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/reviews  — requiere auth
router.post('/', requireAuth, async (req, res) => {
  try {
    const { beverage_ref, body, rating } = req.body;
    if (!beverage_ref) return res.status(400).json({ error: 'beverage_ref es obligatorio' });

    const result = await query(
      `INSERT INTO reviews (user_id, beverage_ref, body, rating)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.userId, beverage_ref, body || null, rating || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/reviews/:id  — solo el autor
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { body, rating } = req.body;
    const result = await query(
      `UPDATE reviews SET body=$1, rating=$2, updated_at=NOW()
       WHERE id=$3 AND user_id=$4 AND deleted_at IS NULL
       RETURNING *`,
      [body || null, rating || null, req.params.id, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Reseña no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/reviews/:id  — soft delete, solo el autor
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const result = await query(
      `UPDATE reviews SET deleted_at=NOW()
       WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Reseña no encontrada' });
    res.json({ message: 'Eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
