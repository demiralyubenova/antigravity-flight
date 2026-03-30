
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
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fs = await import('fs');
        const FormData = (await import('form-data')).default;
        const fetch = (await import('node-fetch')).default as any;

        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path), {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        // Call the internal Python Vision server (now running on Railway in parallel)
        const visionResponse = await fetch('http://localhost:8000/analyze', {
            method: 'POST',
            body: formData as any,
            headers: formData.getHeaders()
        });

        if (!visionResponse.ok) {
            const errorText = await visionResponse.text();
            throw new Error(`Vision Service Error: ${errorText}`);
        }

        const result = await visionResponse.json();
        
        // Cleanup local upload
        try { fs.unlinkSync(req.file.path); } catch(e){}

        res.json(result);
    } catch (error: any) {
        console.error('Error processing analysis:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze image' });
    }
});

export default router;
