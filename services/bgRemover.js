const { dbRun } = require('../database');
const { put } = require('@vercel/blob');
const { v4: uuidv4 } = require('uuid');

/**
 * Remove background from an image using remove.bg API.
 * Falls back to using the original image if the API key is not configured
 * or if the API call fails.
 *
 * Requires env: REMOVE_BG_API_KEY
 * Free tier: 50 images/month (low-res preview), paid: $0.20/image (full HD)
 */
async function removeBackground(imageUrl, menuItemId) {
  const apiKey = process.env.REMOVE_BG_API_KEY;

  if (!apiKey) {
    console.log(`⚠️  REMOVE_BG_API_KEY not set — skipping bg removal for item ${menuItemId}`);
    await dbRun(
      'UPDATE menu_items SET processed_image = ?, is_processing = 0 WHERE id = ?',
      [imageUrl, menuItemId]
    );
    return;
  }

  try {
    console.log(`🔄 Removing background for item ${menuItemId}...`);

    // Call remove.bg API with the image URL
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        size: 'auto',         // auto-detect size
        type: 'product',      // optimized for product photos
        format: 'png',        // PNG for transparency
        bg_color: '',         // transparent background
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`remove.bg API error: ${response.status} — ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    // The result_b64 contains the base64-encoded image
    if (data.data && data.data.result_b64) {
      const imageBuffer = Buffer.from(data.data.result_b64, 'base64');

      // Upload the processed image to Vercel Blob
      const blob = await put(`processed/${uuidv4()}.png`, imageBuffer, {
        access: 'public',
        contentType: 'image/png',
      });

      await dbRun(
        'UPDATE menu_items SET processed_image = ?, is_processing = 0 WHERE id = ?',
        [blob.url, menuItemId]
      );
      console.log(`✅ Background removed for item ${menuItemId}`);
    } else {
      throw new Error('No result image in response');
    }
  } catch (err) {
    console.error(`❌ Background removal failed for item ${menuItemId}:`, err.message);
    // Fallback: use original image
    await dbRun(
      'UPDATE menu_items SET processed_image = ?, is_processing = 0 WHERE id = ?',
      [imageUrl, menuItemId]
    );
  }
}

module.exports = { removeBackground };
