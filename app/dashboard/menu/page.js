'use client';
import { useState } from 'react';
import Image from 'next/image';
import { useMenu } from '@/lib/use-menu';
import { API_URL } from '@/lib/api';
import styles from './menu.module.css';
import Skeleton from '@/components/Skeleton';

export default function MenuPage() {
    const { items, isLoading, error, deleteItem, refresh } = useMenu();
    const [modal, setModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [toast, setToast] = useState(null);
    const [filter, setFilter] = useState('all');

    const categories = ['all', ...new Set(items.map(i => i.category))];
    const filtered = filter === 'all' ? items : items.filter(i => i.category === filter);

    function showToast(msg, type = 'success') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    function openAdd() {
        setEditItem(null);
        setModal(true);
    }

    function openEdit(item) {
        setEditItem(item);
        setModal(true);
    }

    async function handleDelete(id) {
        if (!confirm('Delete this item?')) return;
        try {
            await deleteItem(id);
            showToast('Item deleted');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function getImageUrl(item) {
        const img = item.processed_image && !item.is_processing ? item.processed_image : item.original_image;
        if (!img) return null;
        return img.startsWith('http') ? img : `${API_URL}/${img}`;
    }

    return (
        <div className="animate-in">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Menu Items</h1>
                    <p className="text-secondary">
                        {isLoading ? <Skeleton style={{ width: '150px', height: '20px' }} /> : `${items.length} products in your catalog`}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Product</button>
            </div>

            {/* Filters */}
            {(isLoading || categories.length > 1) && (
                <div className={styles.filters}>
                    {isLoading ? (
                        Array(3).fill(0).map((_, i) => <Skeleton key={i} style={{ width: '60px', height: '32px', borderRadius: '16px' }} />)
                    ) : (
                        categories.map(c => (
                            <button
                                key={c}
                                className={`${styles.filterBtn} ${filter === c ? styles.filterActive : ''}`}
                                onClick={() => setFilter(c)}
                            >
                                {c === 'all' ? 'All' : c}
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Grid */}
            <div className={styles.grid}>
                {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className={`card ${styles.itemCard}`} style={{ height: '320px' }}>
                            <Skeleton style={{ width: '100%', height: '180px', borderRadius: '12px' }} />
                            <div style={{ padding: '12px 0' }}>
                                <Skeleton style={{ width: '70%', height: '24px', marginBottom: '8px' }} />
                                <Skeleton style={{ width: '40%', height: '16px' }} />
                            </div>
                        </div>
                    ))
                ) : filtered.length > 0 ? (
                    filtered.map(item => (
                        <div key={item.id} className={`card ${styles.itemCard}`}>
                            <div className={styles.itemImage}>
                                {getImageUrl(item) ? (
                                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                                        <Image
                                            src={getImageUrl(item)}
                                            alt={item.name}
                                            fill
                                            style={{ objectFit: 'cover' }}
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    </div>
                                ) : (
                                    <div className={styles.noImage}>📷</div>
                                )}
                                <span className={`badge ${item.is_processing ? 'badge-warning' : 'badge-success'} ${styles.itemBadge}`}>
                                    {item.is_processing ? 'Processing' : 'Ready'}
                                </span>
                            </div>
                            <div className={styles.itemInfo}>
                                <h3>{item.name}</h3>
                                <p className="text-secondary">{item.description || 'No description'}</p>
                                <div className={styles.itemMeta}>
                                    <span className={styles.itemPrice}>${parseFloat(item.price).toFixed(2)}</span>
                                    <span className={styles.itemCategory}>{item.category}</span>
                                </div>
                            </div>
                            <div className={styles.itemActions}>
                                <button className="btn btn-ghost" onClick={() => openEdit(item)}>Edit</button>
                                <button className="btn btn-danger" onClick={() => handleDelete(item.id)}>Delete</button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.empty} style={{ gridColumn: '1 / -1' }}>
                        <div className={styles.emptyIcon}>📦</div>
                        <h3>No products yet</h3>
                        <p className="text-secondary">Add your first product to get started</p>
                        <button className="btn btn-primary mt-2" onClick={openAdd}>+ Add Product</button>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modal && (
                <ItemModal
                    item={editItem}
                    onClose={() => setModal(false)}
                    onDone={() => { setModal(false); refresh(); showToast(editItem ? 'Item updated!' : 'Item added!'); }}
                    onError={(msg) => showToast(msg, 'error')}
                />
            )}

            {/* Toast */}
            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}

function ItemModal({ item, onClose, onDone, onError }) {
    const [form, setForm] = useState({
        name: item?.name || '',
        description: item?.description || '',
        price: item?.price || '',
        category: item?.category || 'General',
    });
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState(null);
    const [saving, setSaving] = useState(false);

    function update(key, val) { setForm(p => ({ ...p, [key]: val })); }

    function handleImage(e) {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            const reader = new FileReader();
            reader.onload = ev => setPreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setSaving(true);
        try {
            if (item) {
                // For update, we might need a separate API call or update the useMenu hook to handle updates
                // But for now, let's assume menuApi.updateItem works as before
                // We should really move this logic to useMenu hook completely if we want to be pure
                // But let's stick to the existing pattern for now, just refreshing the cache
                const { menuApi } = require('@/lib/api'); // Dynamic import to avoid circular dep if any
                await menuApi.updateItem(item.id, form);
            } else {
                if (!image) { onError('Please select an image'); setSaving(false); return; }
                const fd = new FormData();
                fd.append('name', form.name);
                fd.append('description', form.description);
                fd.append('price', form.price);
                fd.append('category', form.category);
                fd.append('image', image);
                const { menuApi } = require('@/lib/api');
                await menuApi.addItem(fd);
            }
            onDone();
        } catch (err) {
            onError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <h2>{item ? 'Edit Product' : 'Add Product'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="input-group">
                        <label>Product Name</label>
                        <input className="input" placeholder="e.g. Cappuccino" value={form.name} onChange={e => update('name', e.target.value)} required />
                    </div>
                    <div className="input-group">
                        <label>Description</label>
                        <textarea className="input" placeholder="Describe this product" value={form.description} onChange={e => update('description', e.target.value)} rows={2} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div className="input-group">
                            <label>Price ($)</label>
                            <input type="number" step="0.01" className="input" placeholder="9.99" value={form.price} onChange={e => update('price', e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label>Category</label>
                            <input className="input" placeholder="General" value={form.category} onChange={e => update('category', e.target.value)} />
                        </div>
                    </div>

                    {!item && (
                        <div className="input-group">
                            <label>Product Image</label>
                            <div className={styles.uploadArea} onClick={() => document.getElementById('file-input').click()}>
                                {preview ? (
                                    <div style={{ width: '100%', height: '200px', position: 'relative' }}>
                                        <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px', border: '2px dashed var(--border)', borderRadius: '12px', cursor: 'pointer' }}>
                                        <span style={{ fontSize: '32px' }}>📷</span>
                                        <p className="text-secondary" style={{ fontSize: '13px' }}>Click to select image</p>
                                    </div>
                                )}
                                <input id="file-input" type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? <div className="spinner" /> : item ? 'Save Changes' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
