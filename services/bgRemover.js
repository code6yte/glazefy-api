const { dbRun } = require('../database');

/**
 * Background removal stub for serverless deployment.
 * On Vercel there's no Python runtime, so we simply mark the item as processed
 * and use the original image as the display image.
 */
async function removeBackground(imageUrl, menuItemId) {
  try {
    await dbRun(
      'UPDATE menu_items SET processed_image = ?, is_processing = 0 WHERE id = ?',
      [imageUrl, menuItemId]
    );
    console.log(`✅ Item ${menuItemId} marked as processed (using original image)`);
  } catch (err) {
    console.error(`❌ Failed to update item ${menuItemId}:`, err);
  }
}

module.exports = { removeBackground };
