
import express from 'express';
import multer from 'multer';
import { removeBackgroundService } from '../services/imageService.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/remove-background', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const result = await removeBackgroundService(req.file.path, req.file.mimetype);
        res.json({ result });
    } catch (error: any) {
        console.error('Error processing background removal:', error);
        res.status(500).json({ error: error.message || 'Failed to process image' });
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
