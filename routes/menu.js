const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { put, del } = require('@vercel/blob');
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { removeBackground } = require('../services/bgRemover');
const { generate3DModel } = require('../services/meshGenerator');

const router = express.Router();

// Configure multer for memory storage (serverless-friendly)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, webp) are allowed'));
    }
  }
});

// Upload a menu item with image
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { name, description, price, category } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    // Upload image to Vercel Blob
    const filename = `menu/${uuidv4()}-${req.file.originalname}`;
    const blob = await put(filename, req.file.buffer, {
      access: 'public',
      contentType: req.file.mimetype,
    });

    const imageUrl = blob.url;

    // Insert menu item (is_processing = 1 while bg removal runs)
    const result = await dbRun(
      'INSERT INTO menu_items (cafe_id, name, description, price, category, original_image, processed_image, is_processing) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [
        req.user.id,
        name,
        description || '',
        parseFloat(price),
        category || 'General',
        imageUrl,
        imageUrl,  // placeholder until bg removal finishes
      ]
    );

    const menuItemId = result.lastInsertRowid;
    const menuItem = await dbGet('SELECT * FROM menu_items WHERE id = ?', [menuItemId]);

    // Trigger background removal + 3D generation in background (non-blocking)
    // These run AFTER the response is sent so the user doesn't wait
    removeBackground(imageUrl, menuItemId).catch(console.error);
    generate3DModel(imageUrl, menuItemId).catch(console.error);

    res.status(201).json({
      message: 'Menu item uploaded! Processing image...',
      menuItem
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Server error during upload' });
  }
});

// Get all menu items for the logged-in cafe
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await dbAll(
      'SELECT * FROM menu_items WHERE cafe_id = ? ORDER BY category, created_at DESC',
      [req.user.id]
    );

    res.json({ menuItems: items });
  } catch (err) {
    console.error('Get menu error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get menu items for a specific cafe (public - for customers)
router.get('/public/:slug', async (req, res) => {
  try {
    const cafe = await dbGet('SELECT * FROM cafes WHERE slug = ?', [req.params.slug]);
    if (!cafe) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    const items = await dbAll(
      'SELECT id, name, description, price, category, processed_image, original_image, model_3d_url, is_processing FROM menu_items WHERE cafe_id = ? ORDER BY category, created_at DESC',
      [cafe.id]
    );

    res.json({
      cafe: {
        name: cafe.name,
        description: cafe.description,
        slug: cafe.slug
      },
      menuItems: items
    });
  } catch (err) {
    console.error('Public menu error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a menu item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await dbGet(
      'SELECT * FROM menu_items WHERE id = ? AND cafe_id = ?',
      [req.params.id, req.user.id]
    );

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Delete blob images (best effort)
    try {
      if (item.original_image && item.original_image.includes('blob.vercel-storage.com')) {
        await del(item.original_image);
      }
      if (item.processed_image && item.processed_image !== item.original_image && item.processed_image.includes('blob.vercel-storage.com')) {
        await del(item.processed_image);
      }
    } catch (blobErr) {
      console.error('Blob delete error (non-fatal):', blobErr);
    }

    // Delete from database
    await dbRun(
      'DELETE FROM menu_items WHERE id = ? AND cafe_id = ?',
      [req.params.id, req.user.id]
    );

    res.json({ message: 'Menu item deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Server error during deletion' });
  }
});

// Update a menu item
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, price, category } = req.body;

    const item = await dbGet(
      'SELECT * FROM menu_items WHERE id = ? AND cafe_id = ?',
      [req.params.id, req.user.id]
    );

    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await dbRun(
      'UPDATE menu_items SET name = ?, description = ?, price = ?, category = ? WHERE id = ? AND cafe_id = ?',
      [
        name || item.name,
        description !== undefined ? description : item.description,
        price ? parseFloat(price) : item.price,
        category || item.category,
        req.params.id,
        req.user.id
      ]
    );

    const updated = await dbGet('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Menu item updated', menuItem: updated });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Server error during update' });
  }
});

// Get categories for a cafe
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await dbAll(
      'SELECT DISTINCT category FROM menu_items WHERE cafe_id = ? ORDER BY category',
      [req.user.id]
    );

    res.json({ categories: categories.map(c => c.category) });
  } catch (err) {
    console.error('Categories error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
