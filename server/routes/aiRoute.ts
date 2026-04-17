
import express from 'express';
import multer from 'multer';
import { removeBackground } from '@imgly/background-removal-node';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

/**
 * POST /api/remove-background
 * 
 * Accepts either:
 *   - JSON body: { imageUrl: "data:image/jpeg;base64,..." }
 *   - Multipart form: file field with image
 * 
 * Returns: { result: "data:image/png;base64,..." }
 * 
 * Uses @imgly/background-removal-node — the Node.js version of the same
 * library the web app uses client-side (@imgly/background-removal).
 */
router.post('/remove-background', upload.single('file'), async (req, res) => {
    try {
        let imageInput: Blob | string;

        if (req.body?.imageUrl) {
            // JSON body with base64 data URL (from mobile app)
            const dataUrl = req.body.imageUrl as string;
            console.log('Received base64 image for background removal, length:', dataUrl.length);

            // Convert data URL to Blob for imgly
            const base64Data = dataUrl.split(',')[1];
            const mimeMatch = dataUrl.match(/data:([^;]+);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const binaryData = Buffer.from(base64Data, 'base64');
            imageInput = new Blob([binaryData], { type: mimeType });

        } else if (req.file) {
            // Multipart file upload (from web app or other clients)
            const fs = await import('fs');
            const fileBuffer = fs.readFileSync(req.file.path);
            imageInput = new Blob([fileBuffer], { type: req.file.mimetype || 'image/jpeg' });

            // Cleanup uploaded temp file
            try { fs.unlinkSync(req.file.path); } catch (e) { }

        } else {
            return res.status(400).json({ error: 'No image provided. Send either { imageUrl: "data:..." } or a file upload.' });
        }

        console.log('Starting background removal with @imgly/background-removal-node...');
        const startTime = Date.now();

        // Run background removal — same library as the web app
        const resultBlob = await removeBackground(imageInput, {
            model: 'medium',
            output: {
                format: 'image/png',
                quality: 0.9,
            },
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`Background removal complete in ${elapsed}s`);

        // Convert result Blob to base64 data URL
        const arrayBuffer = await resultBlob.arrayBuffer();
        const resultBuffer = Buffer.from(arrayBuffer);
        const base64Result = `data:image/png;base64,${resultBuffer.toString('base64')}`;

        console.log('Result size:', resultBuffer.length, 'bytes');
        res.json({ result: base64Result });

    } catch (error: any) {
        console.error('Error in background removal:', error.message || error);
        res.status(500).json({ error: error.message || 'Failed to remove background' });
    }
});

router.post('/analyze', upload.single('file'), async (req, res) => {
    // The Python vision server (FashionCLIP) is not running in this deployment.
    // The frontend will fall back to the Supabase edge function for analysis.
    if (req.file) {
        try {
            const fs = await import('fs');
            fs.unlinkSync(req.file.path);
        } catch(e) {}
    }
    res.status(503).json({ error: 'Vision service unavailable — use edge function fallback' });
});

export default router;
