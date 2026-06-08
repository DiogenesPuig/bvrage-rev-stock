const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Rutas
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/beverages', require('./routes/beverages'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/movements', require('./routes/movements'));
app.use('/api/reviews',   require('./routes/reviews'));
app.use('/api/scraper',   require('./routes/scraper'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// 404
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`CaveBin backend corriendo en http://localhost:${PORT}`);
});
