'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from '../login/auth.module.css';

export default function RegisterPage() {
    const { register } = useAuth();
    const router = useRouter();
    const [form, setForm] = useState({ name: '', email: '', password: '', description: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    function update(key, val) {
        setForm(prev => ({ ...prev, [key]: val }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        if (form.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        try {
            await register(form.name, form.email, form.password, form.description);
            router.push('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.authPage}>
            <a href="/" className={styles.backLink}>← Back to Glazefy</a>
            <div className={styles.authCard}>
                <div className={styles.authHeader}>
                    <span className={styles.authLogo}>◆</span>
                    <h1>Create your account</h1>
                    <p>Get your AR product display live in minutes</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.authForm}>
                    {error && <div className={styles.error}>{error}</div>}

                    <div className="input-group">
                        <label>Business Name</label>
                        <input className="input" placeholder="My Awesome Store" value={form.name} onChange={e => update('name', e.target.value)} required />
                    </div>

                    <div className="input-group">
                        <label>Email</label>
                        <input type="email" className="input" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} required />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input type="password" className="input" placeholder="At least 6 characters" value={form.password} onChange={e => update('password', e.target.value)} required />
                    </div>

                    <div className="input-group">
                        <label>Description (optional)</label>
                        <textarea className="input" placeholder="Tell customers about your business" value={form.description} onChange={e => update('description', e.target.value)} rows={2} />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? <div className="spinner" /> : 'Create Account'}
                    </button>
                </form>

                <p className={styles.authSwitch}>
                    Already have an account? <a href="/login">Sign in</a>
                </p>
            </div>
        </div>
    );
}
