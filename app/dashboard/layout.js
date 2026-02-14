'use client';
import { useAuth } from '@/lib/auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from './dashboard.module.css';

const navItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/dashboard/menu', label: 'Menu Items', icon: '📋' },
    { href: '/dashboard/qrcode', label: 'QR Code', icon: '📱' },
    { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [user, loading, router]);

    if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
    if (!user) return null;

    return (
        <div className={styles.layout}>
            {/* Mobile header */}
            <header className={styles.mobileHeader}>
                <button className={styles.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
                    ☰
                </button>
                <span className={styles.mobileTitle}>Glazefy</span>
            </header>

            {/* Sidebar overlay */}
            {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
                <div className={styles.sidebarTop}>
                    <div className={styles.sidebarLogo}>
                        <span className={styles.logoIcon}>◆</span>
                        <span className={styles.logoText}>Glazefy</span>
                    </div>

                    <nav className={styles.nav}>
                        {navItems.map(item => (
                            <a
                                key={item.href}
                                href={item.href}
                                className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
                                onClick={() => setSidebarOpen(false)}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                <span>{item.label}</span>
                            </a>
                        ))}
                    </nav>
                </div>

                <div className={styles.sidebarBottom}>
                    <div className={styles.userInfo}>
                        <div className={styles.avatar}>{user.name?.charAt(0)?.toUpperCase() || '?'}</div>
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>{user.name}</span>
                            <span className={styles.userSlug}>/{user.slug}</span>
                        </div>
                    </div>
                    <button className={styles.logoutBtn} onClick={logout}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
