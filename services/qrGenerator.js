const QRCode = require('qrcode');
const { createCanvas } = require('canvas');

// ─── 5 QR Color Themes ───

const QR_THEMES = {
    purple: {
        name: 'Purple Galaxy',
        gradient: ['#6c5ce7', '#a29bfe'],
        bg: '#ffffff',
    },
    ocean: {
        name: 'Ocean Blue',
        gradient: ['#0984e3', '#00cec9'],
        bg: '#ffffff',
    },
    sunset: {
        name: 'Sunset',
        gradient: ['#e17055', '#fdcb6e'],
        bg: '#ffffff',
    },
    emerald: {
        name: 'Emerald',
        gradient: ['#00b894', '#55efc4'],
        bg: '#ffffff',
    },
    midnight: {
        name: 'Midnight',
        gradient: ['#2d3436', '#636e72'],
        bg: '#ffffff',
    },
};

const THEME_NAMES = Object.keys(QR_THEMES);

/**
 * Generate a gradient-colored QR code
 * @param {string} url - URL to encode
 * @param {string} themeName - Theme key (purple, ocean, sunset, emerald, midnight)
 * @param {number} size - Image width/height in px
 * @returns {{ buffer: Buffer, dataUrl: string }}
 */
async function generateColorfulQR(url, themeName = 'purple', size = 800) {
    const theme = QR_THEMES[themeName] || QR_THEMES.purple;

    // Generate QR matrix
    const qrData = QRCode.create(url, { errorCorrectionLevel: 'M' });
    const modules = qrData.modules;
    const moduleCount = modules.size;

    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Module size & margin
    const margin = Math.floor(size * 0.08);
    const usable = size - margin * 2;
    const cellSize = usable / moduleCount;

    // Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, size, size);

    // Gradient for QR dots
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, theme.gradient[0]);
    grad.addColorStop(1, theme.gradient[1]);
    ctx.fillStyle = grad;

    // Draw rounded QR modules
    const radius = cellSize * 0.3;

    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            if (modules.get(row, col)) {
                const x = margin + col * cellSize;
                const y = margin + row * cellSize;
                const w = cellSize - 0.5;
                const h = cellSize - 0.5;

                // Rounded rectangle
                ctx.beginPath();
                ctx.moveTo(x + radius, y);
                ctx.lineTo(x + w - radius, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
                ctx.lineTo(x + w, y + h - radius);
                ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
                ctx.lineTo(x + radius, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.closePath();
                ctx.fill();
            }
        }
    }

    const buffer = canvas.toBuffer('image/png');
    const dataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

    return { buffer, dataUrl };
}

module.exports = { generateColorfulQR, QR_THEMES, THEME_NAMES };
