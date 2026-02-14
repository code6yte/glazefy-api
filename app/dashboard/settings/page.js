'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import styles from './settings.module.css';

export default function SettingsPage() {
    const { user, updateProfile, logout } = useAuth();
    const [form, setForm] = useState({ name: user?.name || '', description: user?.description || '' });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    function update(key, val) { setForm(p => ({ ...p, [key]: val })); }

    function showToast(msg, type = 'success') {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        try {
            await updateProfile(form);
            showToast('Settings saved!');
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    }

    function handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            logout();
            window.location.href = '/';
        }
    }

    return (
        <div>
            <h1 className={styles.title}>Settings</h1>
            <p className="text-secondary mb-3">Manage your business profile and account</p>

            <div className={styles.sections}>
                {/* Profile */}
                <div className="card">
                    <h2 className={styles.sectionTitle}>Business Profile</h2>
                    <form onSubmit={handleSave} className={styles.form}>
                        <div className="input-group">
                            <label>Business Name</label>
                            <input className="input" value={form.name} onChange={e => update('name', e.target.value)} required />
                        </div>
                        <div className="input-group">
                            <label>Description</label>
                            <textarea className="input" value={form.description} onChange={e => update('description', e.target.value)} rows={3} />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? <div className="spinner" /> : 'Save Changes'}
                        </button>
                    </form>
                </div>

                {/* Account Info */}
                <div className="card">
                    <h2 className={styles.sectionTitle}>Account Info</h2>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Email</span>
                            <span className={styles.infoValue}>{user?.email}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Slug</span>
                            <span className={styles.infoValue}>/{user?.slug}</span>
                        </div>
                        <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>Member since</span>
                            <span className={styles.infoValue}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Danger */}
                <div className="card" style={{ borderColor: 'rgba(255,118,117,0.2)' }}>
                    <h2 className={styles.sectionTitle}>Account</h2>
                    <p className="text-secondary mb-2" style={{ fontSize: '14px' }}>Sign out of your Glazefy account on this device.</p>
                    <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
                </div>
            </div>

            {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
