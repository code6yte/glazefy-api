const express = require('express');
const { dbGet, dbAll, dbRun } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ─── Create a category ───

router.post('/', authenticateToken, async (req, res) => {
    try {
        const { name, description, icon } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }

        // Check for duplicate name in this cafe
        const exists = await dbGet(
            'SELECT id FROM categories WHERE cafe_id = ? AND LOWER(name) = LOWER(?)',
            [req.user.id, name.trim()]
        );
        if (exists) {
            return res.status(409).json({ error: 'Category with this name already exists' });
        }

        // Get next sort order
        const last = await dbGet(
            'SELECT MAX(sort_order) as max_order FROM categories WHERE cafe_id = ?',
            [req.user.id]
        );
        const sortOrder = (last?.max_order || 0) + 1;

        const result = await dbRun(
            'INSERT INTO categories (cafe_id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, name.trim(), description || '', icon || '', sortOrder]
        );

        const category = await dbGet('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);

        res.status(201).json({ message: 'Category created', category });
    } catch (err) {
        console.error('Create category error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Get all categories for logged-in business ───

router.get('/', authenticateToken, async (req, res) => {
    try {
        const categories = await dbAll(
            'SELECT * FROM categories WHERE cafe_id = ? ORDER BY sort_order ASC',
            [req.user.id]
        );

        // Count items in each category
        const withCounts = await Promise.all(
            categories.map(async (cat) => {
                const count = await dbGet(
                    'SELECT COUNT(*) as item_count FROM menu_items WHERE category_id = ?',
                    [cat.id]
                );
                return { ...cat, item_count: count?.item_count || 0 };
            })
        );

        res.json({ categories: withCounts });
    } catch (err) {
        console.error('Get categories error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Update a category ───

router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, icon } = req.body;

        const category = await dbGet(
            'SELECT * FROM categories WHERE id = ? AND cafe_id = ?',
            [req.params.id, req.user.id]
        );

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Check for duplicate name (excluding current)
        if (name && name.trim()) {
            const dup = await dbGet(
                'SELECT id FROM categories WHERE cafe_id = ? AND LOWER(name) = LOWER(?) AND id != ?',
                [req.user.id, name.trim(), req.params.id]
            );
            if (dup) {
                return res.status(409).json({ error: 'Category with this name already exists' });
            }
        }

        await dbRun(
            'UPDATE categories SET name = ?, description = ?, icon = ? WHERE id = ? AND cafe_id = ?',
            [
                name?.trim() || category.name,
                description !== undefined ? description : category.description,
                icon !== undefined ? icon : category.icon,
                req.params.id,
                req.user.id,
            ]
        );

        const updated = await dbGet('SELECT * FROM categories WHERE id = ?', [req.params.id]);
        res.json({ message: 'Category updated', category: updated });
    } catch (err) {
        console.error('Update category error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Reorder categories ───

router.put('/reorder/batch', authenticateToken, async (req, res) => {
    try {
        const { order } = req.body;  // Array of { id, sort_order }

        if (!Array.isArray(order)) {
            return res.status(400).json({ error: 'Order must be an array of { id, sort_order }' });
        }

        for (const item of order) {
            await dbRun(
                'UPDATE categories SET sort_order = ? WHERE id = ? AND cafe_id = ?',
                [item.sort_order, item.id, req.user.id]
            );
        }

        const categories = await dbAll(
            'SELECT * FROM categories WHERE cafe_id = ? ORDER BY sort_order ASC',
            [req.user.id]
        );

        res.json({ message: 'Categories reordered', categories });
    } catch (err) {
        console.error('Reorder categories error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── Delete a category ───

router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const category = await dbGet(
            'SELECT * FROM categories WHERE id = ? AND cafe_id = ?',
            [req.params.id, req.user.id]
        );

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Items in this category get category_id set to NULL (ON DELETE SET NULL)
        await dbRun(
            'DELETE FROM categories WHERE id = ? AND cafe_id = ?',
            [req.params.id, req.user.id]
        );

        res.json({ message: 'Category deleted. Items moved to uncategorized.' });
    } catch (err) {
        console.error('Delete category error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
