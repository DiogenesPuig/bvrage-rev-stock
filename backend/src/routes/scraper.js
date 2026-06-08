const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/scraper/search  — Fase 3
router.post('/search', requireAuth, (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'query es obligatorio' });

  // TODO: Fase 3 — implementar scraping en Vivino / Wine-Searcher
  res.status(501).json({
    message: 'Scraping aún no implementado (Fase 3)',
    query,
  });
});

module.exports = router;
