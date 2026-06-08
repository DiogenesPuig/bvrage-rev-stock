const express = require('express');
const { query } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/locations
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT l.*, COALESCE(SUM(i.quantity), 0)::int AS total_bottles
       FROM locations l
       LEFT JOIN inventory i ON i.location_id = l.id
       WHERE l.user_id = $1 AND l.deleted_at IS NULL
       GROUP BY l.id
       ORDER BY l.name`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/locations/:id/inventory  — qué hay en esta ubicación
router.get('/:id/inventory', async (req, res) => {
  try {
    // Verificar que la ubicación pertenece al usuario
    const loc = await query(
      'SELECT id FROM locations WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL',
      [req.params.id, req.user.userId]
    );
    if (!loc.rows[0]) return res.status(404).json({ error: 'Ubicación no encontrada' });

    const result = await query(
      `SELECT i.id AS inventory_id, i.quantity,
              b.id AS beverage_id, b.name, b.type, b.producer, b.vintage, b.image_url
       FROM inventory i
       JOIN beverages b ON b.id = i.beverage_id
       WHERE i.location_id = $1 AND b.deleted_at IS NULL AND i.quantity > 0
       ORDER BY b.name`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/locations
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const result = await query(
      'INSERT INTO locations (user_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [req.user.userId, name, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/locations/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, description } = req.body;
    const result = await query(
      `UPDATE locations SET name=$1, description=$2
       WHERE id=$3 AND user_id=$4 AND deleted_at IS NULL
       RETURNING *`,
      [name, description || null, req.params.id, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Ubicación no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/locations/:id  (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      `UPDATE locations SET deleted_at=NOW()
       WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.user.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Ubicación no encontrada' });
    res.json({ message: 'Eliminada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
