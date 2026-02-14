'use client';
import { useAuth } from '@/lib/auth';
import { useMenu } from '@/lib/use-menu';
import styles from './overview.module.css';
import Skeleton from '@/components/Skeleton';

export default function DashboardOverview() {
    const { user } = useAuth();
    const { items, isLoading, error } = useMenu();

    const totalItems = items.length;
    const categories = [...new Set(items.map(i => i.category))];
    const arReady = items.filter(i => !i.is_processing).length;

    return (
        <div className="animate-in">
            <div className={styles.welcome}>
                <h1>Welcome back, {user?.name} 👋</h1>
                <p className="text-secondary">Here&apos;s what&apos;s happening with your store</p>
            </div>

            {/* Stats */}
            <div className={styles.statsGrid}>
                <StatsCard icon="🍽️" value={totalItems} label="Total Items" loading={isLoading} />
                <StatsCard icon="📁" value={categories.length} label="Categories" loading={isLoading} />
                <StatsCard icon="✨" value={arReady} label="AR Ready" loading={isLoading} />
            </div>

            {/* Quick Actions */}
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.actionsGrid}>
                <a href="/dashboard/menu" className={styles.actionCard} style={{ background: 'linear-gradient(135deg, var(--primary), #8b5cf6)' }}>
                    <span className={styles.actionIcon}>➕</span>
                    <span className={styles.actionTitle}>Add Product</span>
                    <span className={styles.actionSub}>Upload a new item with image</span>
                </a>
                <a href="/dashboard/qrcode" className={styles.actionCard} style={{ background: 'linear-gradient(135deg, var(--secondary), #06b6d4)' }}>
                    <span className={styles.actionIcon}>📱</span>
                    <span className={styles.actionTitle}>View QR Code</span>
                    <span className={styles.actionSub}>Share your AR catalog</span>
                </a>
            </div>

            {/* Recent Items */}
            {(isLoading || items.length > 0) && (
                <>
                    <h2 className={styles.sectionTitle}>Recent Items</h2>
                    <div className={styles.recentList}>
                        {isLoading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className={`card ${styles.recentItem}`} style={{ height: '80px', display: 'flex', alignItems: 'center' }}>
                                    <Skeleton style={{ width: '40%', height: '20px' }} />
                                    <Skeleton style={{ width: '20%', height: '20px', marginLeft: 'auto' }} />
                                </div>
                            ))
                        ) : (
                            items.slice(0, 5).map(item => (
                                <div key={item.id} className={`card ${styles.recentItem}`}>
                                    <div className={styles.recentInfo}>
                                        <span className={styles.recentName}>{item.name}</span>
                                        <span className={styles.recentCategory}>{item.category}</span>
                                    </div>
                                    <div className={styles.recentRight}>
                                        <span className={styles.recentPrice}>${parseFloat(item.price).toFixed(2)}</span>
                                        <span className={`badge ${item.is_processing ? 'badge-warning' : 'badge-success'}`}>
                                            {item.is_processing ? 'Processing' : 'Ready'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {!isLoading && items.length === 0 && (
                <div className={styles.empty}>
                    <div className={styles.emptyIcon}>🚀</div>
                    <h3>Let&apos;s get started!</h3>
                    <p className="text-secondary">Add your first product to see it here</p>
                    <a href="/dashboard/menu" className="btn btn-primary mt-2">Add Your First Product</a>
                </div>
            )}
        </div>
    );
}

function StatsCard({ icon, value, label, loading }) {
    return (
        <div className={`card ${styles.statCard}`}>
            <div className={styles.statIcon}>{icon}</div>
            <div className={styles.statNumber}>
                {loading ? <Skeleton style={{ width: '40px', height: '32px' }} /> : value}
            </div>
            <div className={styles.statLabel}>{label}</div>
        </div>
    );
}
