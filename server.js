const express = require('express');
const cors = require('cors');
const path = require('path');
const QRCode = require('qrcode');
const { initDatabase, dbGet } = require('./database');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database on startup
let dbReady = initDatabase()
  .then(() => console.log('✅ Database initialized'))
  .catch(err => console.error('❌ Database init failed:', err));

// Middleware to ensure DB is ready
app.use(async (req, res, next) => {
  await dbReady;
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);

// QR Code generation endpoint
app.get('/api/qrcode', authenticateToken, async (req, res) => {
  try {
    const cafe = await dbGet('SELECT slug FROM cafes WHERE id = ?', [req.user.id]);
    if (!cafe) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const menuUrl = `${baseUrl}/menu/${cafe.slug}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff'
      }
    });

    res.json({
      qrCode: qrDataUrl,
      menuUrl
    });
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Download QR code as base64
app.get('/api/qrcode/download', authenticateToken, async (req, res) => {
  try {
    const cafe = await dbGet('SELECT slug, name FROM cafes WHERE id = ?', [req.user.id]);
    if (!cafe) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const menuUrl = `${baseUrl}/menu/${cafe.slug}`;

    // Generate QR as buffer and send as download
    const qrBuffer = await QRCode.toBuffer(menuUrl, {
      width: 800,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff'
      }
    });

    const filename = `${cafe.name.replace(/\s+/g, '-')}-qrcode.png`;
    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': qrBuffer.length,
    });
    res.send(qrBuffer);
  } catch (err) {
    console.error('QR download error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback for dashboard
app.get('/dashboard*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SPA fallback for AR menu
app.get('/menu/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'ar-menu.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Only listen when not on Vercel (local dev)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════════════════════════════╗
  ║                    AR Cafe Menu Server                        ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  Server running on: http://localhost:${PORT}                    ║
  ║  Dashboard:          http://localhost:${PORT}/dashboard         ║
  ║  AR Menu:            http://localhost:${PORT}/menu/:slug       ║
  ╚══════════════════════════════════════════════════════════════╝
    `);
  });
}

// Export for Vercel serverless
module.exports = app;