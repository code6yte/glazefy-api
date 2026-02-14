'use client';
import { useState, useEffect } from 'react';
import { qrApi, API_URL } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import styles from './qrcode.module.css';

export default function QRCodePage() {
    const { user, token } = useAuth();
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        qrApi.getQRCode()
            .then(data => setQrData(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    function copyUrl() {
        navigator.clipboard.writeText(qrData.menuUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    async function downloadQR() {
        try {
            const res = await fetch(`${API_URL}/api/qrcode/download`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${user.name.replace(/\s+/g, '-')}-qrcode.png`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download error:', err);
        }
    }

    if (loading) return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;

    return (
        <div>
            <h1 className={styles.title}>QR Code</h1>
            <p className="text-secondary mb-3">Share this QR code with your customers to view your AR catalog</p>

            <div className={styles.qrContainer}>
                <div className={`card ${styles.qrCard}`}>
                    {qrData?.qrCode && (
                        <img src={qrData.qrCode} alt="QR Code" className={styles.qrImage} />
                    )}
                    <p className={styles.qrLabel}>Scan to view your AR menu</p>
                </div>

                <div className={styles.qrDetails}>
                    <div className="card" style={{ padding: '20px' }}>
                        <label className={styles.urlLabel}>Menu URL</label>
                        <div className={styles.urlRow}>
                            <input className="input" value={qrData?.menuUrl || ''} readOnly style={{ flex: 1 }} />
                            <button className="btn btn-secondary" onClick={copyUrl}>
                                {copied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button className="btn btn-primary btn-lg" onClick={downloadQR} style={{ flex: 1 }}>
                            📥 Download QR Code
                        </button>
                        <a
                            href={qrData?.menuUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-lg"
                            style={{ flex: 1, textAlign: 'center' }}
                        >
                            🔗 Open Menu
                        </a>
                    </div>

                    <div className={`card ${styles.tips}`}>
                        <h3>💡 Tips</h3>
                        <ul>
                            <li>Print this QR code on table tents or receipts</li>
                            <li>Add it to your storefront window</li>
                            <li>Share the link on social media</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
