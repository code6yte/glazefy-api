const QRCode = require('qrcode');

// ─── 5 QR Color Themes ───

const QR_THEMES = {
    purple: {
        name: 'Purple Galaxy',
        gradient: ['#6c5ce7', '#a29bfe'],
    },
    ocean: {
        name: 'Ocean Blue',
        gradient: ['#0984e3', '#00cec9'],
    },
    sunset: {
        name: 'Sunset',
        gradient: ['#e17055', '#fdcb6e'],
    },
    emerald: {
        name: 'Emerald',
        gradient: ['#00b894', '#55efc4'],
    },
    midnight: {
        name: 'Midnight',
        gradient: ['#2d3436', '#636e72'],
    },
};

const THEME_NAMES = Object.keys(QR_THEMES);

/**
 * Generate a gradient-colored QR code as SVG (no native deps!)
 * Returns both SVG string and data URL
 */
async function generateColorfulQR(url, themeName = 'purple', size = 800) {
    const theme = QR_THEMES[themeName] || QR_THEMES.purple;

    // Get QR matrix
    const qrData = QRCode.create(url, { errorCorrectionLevel: 'M' });
    const modules = qrData.modules;
    const moduleCount = modules.size;

    const margin = Math.floor(size * 0.08);
    const usable = size - margin * 2;
    const cellSize = usable / moduleCount;
    const radius = cellSize * 0.3;

    // Build SVG paths for QR modules
    let paths = '';
    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            if (modules.get(row, col)) {
                const x = (margin + col * cellSize).toFixed(2);
                const y = (margin + row * cellSize).toFixed(2);
                const w = (cellSize - 0.5).toFixed(2);
                const h = (cellSize - 0.5).toFixed(2);
                const r = Math.min(radius, cellSize / 2).toFixed(2);

                // Rounded rectangle as SVG path
                paths += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}"/>`;
            }
        }
    }

    // Full SVG with gradient
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="qrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.gradient[0]}"/>
      <stop offset="100%" stop-color="${theme.gradient[1]}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="#ffffff"/>
  <g fill="url(#qrGrad)">
    ${paths}
  </g>
</svg>`;

    const svgBase64 = Buffer.from(svg).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    return { svg, dataUrl, buffer: Buffer.from(svg) };
}

module.exports = { generateColorfulQR, QR_THEMES, THEME_NAMES };
