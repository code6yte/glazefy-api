const { dbRun, dbGet } = require('../database');

/**
 * Generate a 3D model from a product image using Meshy.ai API.
 * This is an async process — create task → poll until done → save model URL.
 *
 * Requires env: MESHY_API_KEY
 * Cost: ~$0.10 per model on the paid plan
 *
 * The generated 3D model URL (GLB format) is stored in the `model_3d_url` column.
 */

const MESHY_BASE = 'https://api.meshy.ai/openapi/v1';

async function generate3DModel(imageUrl, menuItemId) {
    const apiKey = process.env.MESHY_API_KEY;

    if (!apiKey) {
        console.log(`⚠️  MESHY_API_KEY not set — skipping 3D generation for item ${menuItemId}`);
        return;
    }

    try {
        console.log(`🔄 Starting 3D generation for item ${menuItemId}...`);

        // Step 1: Create an image-to-3D task
        const createRes = await fetch(`${MESHY_BASE}/image-to-3d`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_url: imageUrl,
                enable_pbr: true,        // physically-based rendering textures
                should_remesh: true,     // cleaner mesh
                should_texture: true,    // apply textures
            }),
        });

        if (!createRes.ok) {
            const err = await createRes.json().catch(() => ({}));
            throw new Error(`Meshy create task failed: ${createRes.status} — ${JSON.stringify(err)}`);
        }

        const { result: taskId } = await createRes.json();
        console.log(`📋 Meshy task created: ${taskId} for item ${menuItemId}`);

        // Step 2: Poll for completion (check every 10s, max 5 minutes)
        const maxAttempts = 30;
        for (let i = 0; i < maxAttempts; i++) {
            await sleep(10000); // 10 seconds

            const statusRes = await fetch(`${MESHY_BASE}/image-to-3d/${taskId}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` },
            });

            if (!statusRes.ok) {
                console.warn(`⚠️  Meshy poll error (attempt ${i + 1}): ${statusRes.status}`);
                continue;
            }

            const task = await statusRes.json();

            if (task.status === 'SUCCEEDED') {
                // Find the GLB model URL from the output
                const glbUrl = task.model_urls?.glb || task.model_url || null;

                if (glbUrl) {
                    await dbRun(
                        'UPDATE menu_items SET model_3d_url = ? WHERE id = ?',
                        [glbUrl, menuItemId]
                    );
                    console.log(`✅ 3D model ready for item ${menuItemId}: ${glbUrl}`);
                } else {
                    console.warn(`⚠️  Meshy succeeded but no GLB URL found for item ${menuItemId}`);
                }
                return;
            }

            if (task.status === 'FAILED' || task.status === 'EXPIRED') {
                throw new Error(`Meshy task ${task.status}: ${task.task_error?.message || 'unknown error'}`);
            }

            // Still PENDING or IN_PROGRESS — continue polling
            console.log(`⏳ Meshy task ${taskId}: ${task.status} (${task.progress || 0}%)`);
        }

        console.warn(`⚠️  Meshy task ${taskId} timed out after ${maxAttempts * 10}s`);
    } catch (err) {
        console.error(`❌ 3D generation failed for item ${menuItemId}:`, err.message);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { generate3DModel };
