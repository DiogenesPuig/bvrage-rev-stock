const express = require('express');
const { query, pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// POST /api/movements  — registrar compra, consumo o transferencia
router.post('/', async (req, res) => {
  const { beverage_id, location_id, type, quantity, date, price, occasion, notes } = req.body;

  if (!beverage_id || !type || !quantity) {
    return res.status(400).json({ error: 'beverage_id, type y quantity son obligatorios' });
  }
  if (!['purchase', 'consumption', 'transfer'].includes(type)) {
    return res.status(400).json({ error: 'type debe ser purchase, consumption o transfer' });
  }
  if (quantity <= 0) {
    return res.status(400).json({ error: 'quantity debe ser mayor que 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verificar que la bebida pertenece al usuario
    const bev = await client.query(
      'SELECT id FROM beverages WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL',
      [beverage_id, req.user.userId]
    );
    if (!bev.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bebida no encontrada' });
    }

    // Consumptions se guardan como cantidad negativa
    const actualQty = type === 'consumption' ? -Math.abs(quantity) : Math.abs(quantity);
    const locId = location_id || null;

    // Insertar movimiento
    const movement = await client.query(
      `INSERT INTO inventory_movements
         (beverage_id, location_id, user_id, type, quantity, date, price, occasion, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        beverage_id, locId, req.user.userId, type,
        actualQty,
        date || new Date().toISOString().split('T')[0],
        price || null, occasion || null, notes || null,
      ]
    );

    // Actualizar tabla inventory (upsert manual para manejar location_id NULL)
    const existing = await client.query(
      `SELECT id, quantity FROM inventory
       WHERE beverage_id=$1 AND location_id IS NOT DISTINCT FROM $2`,
      [beverage_id, locId]
    );

    if (existing.rows[0]) {
      await client.query(
        'UPDATE inventory SET quantity=$1, updated_at=NOW() WHERE id=$2',
        [existing.rows[0].quantity + actualQty, existing.rows[0].id]
      );
    } else {
      await client.query(
        'INSERT INTO inventory (beverage_id, location_id, quantity) VALUES ($1,$2,$3)',
        [beverage_id, locId, actualQty]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(movement.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
