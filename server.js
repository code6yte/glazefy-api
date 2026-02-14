const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, dbGet, dbRun } = require('./database');
const { authenticateToken } = require('./middleware/auth');
const { generateColorfulQR, QR_THEMES, THEME_NAMES } = require('./services/qrGenerator');

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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Import routes
const authRoutes = require('./routes/auth');
const menuRoutes = require('./routes/menu');
const categoryRoutes = require('./routes/categories');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/categories', categoryRoutes);

// ─── QR Code Themes ───

// List available themes
app.get('/api/qrcode/themes', (req, res) => {
  const themes = THEME_NAMES.map(key => ({
    id: key,
    name: QR_THEMES[key].name,
    colors: QR_THEMES[key].gradient,
  }));
  res.json({ themes });
});

// Set owner's preferred theme
app.put('/api/qrcode/theme', authenticateToken, async (req, res) => {
  try {
    const { theme } = req.body;
    if (!theme || !THEME_NAMES.includes(theme)) {
      return res.status(400).json({ error: `Theme must be one of: ${THEME_NAMES.join(', ')}` });
    }
    await dbRun('UPDATE cafes SET qr_theme = ? WHERE id = ?', [theme, req.user.id]);
    res.json({ message: 'QR theme updated', theme });
  } catch (err) {
    console.error('Theme update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate colorful QR code (uses owner's saved theme, or ?theme= override)
app.get('/api/qrcode', authenticateToken, async (req, res) => {
  try {
    const cafe = await dbGet('SELECT slug, name, qr_theme FROM cafes WHERE id = ?', [req.user.id]);
    if (!cafe) return res.status(404).json({ error: 'Business not found' });

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const menuUrl = `${baseUrl}/menu/${cafe.slug}`;
    const theme = req.query.theme || cafe.qr_theme || 'purple';

    const { dataUrl } = await generateColorfulQR(menuUrl, theme, 400);

    res.json({
      qrCode: dataUrl,
      menuUrl,
      businessName: cafe.name,
      theme,
    });
  } catch (err) {
    console.error('QR generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Download colorful QR code as SVG
app.get('/api/qrcode/download', authenticateToken, async (req, res) => {
  try {
    const cafe = await dbGet('SELECT slug, name, qr_theme FROM cafes WHERE id = ?', [req.user.id]);
    if (!cafe) return res.status(404).json({ error: 'Business not found' });

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const menuUrl = `${baseUrl}/menu/${cafe.slug}`;
    const theme = req.query.theme || cafe.qr_theme || 'purple';

    const { buffer } = await generateColorfulQR(menuUrl, theme, 800);

    const filename = `${cafe.name.replace(/\s+/g, '-')}-menu-qrcode.svg`;
    res.set({
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
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
  ║                    Glazefy Server                             ║
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