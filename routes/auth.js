const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const slugify = require('slugify');
const { dbGet, dbRun } = require('../database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register a new cafe
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, description } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if email already exists
    const existing = await dbGet('SELECT id FROM cafes WHERE email = ?', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create slug from cafe name
    let slug = slugify(name, { lower: true, strict: true });
    const slugExists = await dbGet('SELECT id FROM cafes WHERE slug = ?', [slug]);
    if (slugExists) {
      slug = slug + '-' + Date.now().toString(36);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert cafe
    const result = await dbRun(
      'INSERT INTO cafes (name, email, password, slug, description) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, slug, description || '']
    );

    // Generate token
    const token = jwt.sign(
      { id: result.lastInsertRowid, email, slug },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Cafe registered successfully',
      token,
      cafe: {
        id: result.lastInsertRowid,
        name,
        email,
        slug,
        description: description || ''
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cafe = await dbGet('SELECT * FROM cafes WHERE email = ?', [email]);
    if (!cafe) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, cafe.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: cafe.id, email: cafe.email, slug: cafe.slug },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      token,
      cafe: {
        id: cafe.id,
        name: cafe.name,
        email: cafe.email,
        slug: cafe.slug,
        description: cafe.description
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current cafe profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const cafe = await dbGet(
      'SELECT id, name, email, slug, description, logo, created_at FROM cafes WHERE id = ?',
      [req.user.id]
    );

    if (!cafe) {
      return res.status(404).json({ error: 'Cafe not found' });
    }

    res.json({ cafe });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update cafe profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (name) {
      await dbRun(
        'UPDATE cafes SET name = ?, description = ? WHERE id = ?',
        [name, description || '', req.user.id]
      );
    }

    const cafe = await dbGet(
      'SELECT id, name, email, slug, description, logo, created_at FROM cafes WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: 'Profile updated', cafe });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
