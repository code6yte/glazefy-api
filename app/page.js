'use client';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import styles from './page.module.css';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard');
  }, [user, loading, router]);

  if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;

  return (
    <div className={styles.landing}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◆</span>
          <span className={styles.logoText}>Glazefy</span>
        </div>
        <div className={styles.navLinks}>
          <a href="/login" className="btn btn-ghost">Log in</a>
          <a href="/register" className="btn btn-primary">Get Started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>✨ AR-Powered Product Display</div>
        <h1 className={styles.heroTitle}>
          Your products,<br />
          <span className={styles.heroGradient}>in augmented reality</span>
        </h1>
        <p className={styles.heroSub}>
          Upload your products, generate a QR code, and let customers view them
          in AR — right from their phone. No app needed.
        </p>
        <div className={styles.heroCTA}>
          <a href="/register" className="btn btn-primary btn-lg">Start for Free →</a>
          <a href="#features" className="btn btn-secondary btn-lg">See How It Works</a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📸</div>
            <h3>Upload Products</h3>
            <p>Add photos of your dishes, clothing, or products. We handle the rest.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📱</div>
            <h3>QR Code Menu</h3>
            <p>Get a unique QR code that links to your interactive AR catalog.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔮</div>
            <h3>AR Preview</h3>
            <p>Customers see your products floating in their space — before buying.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Dashboard</h3>
            <p>Manage everything from one clean dashboard. Works on any device.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>© 2026 Glazefy. Built for the future of commerce.</p>
      </footer>
    </div>
  );
}
