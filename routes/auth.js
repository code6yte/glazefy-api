const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const slugify = require('slugify');
const { dbGet, dbRun } = require('../database');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─── Validation helpers ───

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

const BUSINESS_TYPES = ['cafe', 'restaurant', 'clothing', 'retail', 'bakery', 'other'];

// ─── Register a new business ───

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, description, business_type, phone, address } = req.body;

    // Required fields
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Validate name length
    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Business name must be 2-100 characters' });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password strength
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Validate business type
    const bizType = business_type || 'cafe';
    if (!BUSINESS_TYPES.includes(bizType)) {
      return res.status(400).json({ error: `Business type must be one of: ${BUSINESS_TYPES.join(', ')}` });
    }

    // Check if email already exists
    const existing = await dbGet('SELECT id FROM cafes WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create slug from business name
    let slug = slugify(name, { lower: true, strict: true });
    const slugExists = await dbGet('SELECT id FROM cafes WHERE slug = ?', [slug]);
    if (slugExists) {
      slug = slug + '-' + Date.now().toString(36);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert business
    const result = await dbRun(
      'INSERT INTO cafes (name, email, password, slug, description, business_type, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        name.trim(),
        email.toLowerCase().trim(),
        hashedPassword,
        slug,
        description || '',
        bizType,
        phone || '',
        address || '',
      ]
    );

    // Generate token
    const token = jwt.sign(
      { id: result.lastInsertRowid, email: email.toLowerCase().trim(), slug },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Business registered successfully',
      token,
      cafe: {
        id: result.lastInsertRowid,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        slug,
        description: description || '',
        business_type: bizType,
        phone: phone || '',
        address: address || '',
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// ─── Login ───

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const cafe = await dbGet('SELECT * FROM cafes WHERE email = ?', [email.toLowerCase().trim()]);
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
        description: cafe.description,
        business_type: cafe.business_type,
        phone: cafe.phone,
        address: cafe.address,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ─── Get profile ───

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const cafe = await dbGet(
      'SELECT id, name, email, slug, description, logo, business_type, phone, address, created_at FROM cafes WHERE id = ?',
      [req.user.id]
    );

    if (!cafe) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ cafe });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Update profile ───

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, description, business_type, phone, address } = req.body;

    // Validate business type if provided
    if (business_type && !BUSINESS_TYPES.includes(business_type)) {
      return res.status(400).json({ error: `Business type must be one of: ${BUSINESS_TYPES.join(', ')}` });
    }

    // Get current values
    const current = await dbGet('SELECT * FROM cafes WHERE id = ?', [req.user.id]);
    if (!current) {
      return res.status(404).json({ error: 'Business not found' });
    }

    await dbRun(
      'UPDATE cafes SET name = ?, description = ?, business_type = ?, phone = ?, address = ? WHERE id = ?',
      [
        name || current.name,
        description !== undefined ? description : current.description,
        business_type || current.business_type,
        phone !== undefined ? phone : current.phone,
        address !== undefined ? address : current.address,
        req.user.id,
      ]
    );

    const cafe = await dbGet(
      'SELECT id, name, email, slug, description, logo, business_type, phone, address, created_at FROM cafes WHERE id = ?',
      [req.user.id]
    );

    res.json({ message: 'Profile updated', cafe });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Change password ───

router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const passwordError = validatePassword(new_password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const cafe = await dbGet('SELECT password FROM cafes WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(current_password, cafe.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await dbRun('UPDATE cafes SET password = ? WHERE id = ?', [hashed, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
