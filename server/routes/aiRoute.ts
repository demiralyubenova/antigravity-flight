
import express from 'express';
import multer from 'multer';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/remove-background', upload.single('file'), async (req, res) => {
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

        const pyResponse = await fetch('http://localhost:8000/remove-bg', {
            method: 'POST',
            body: formData as any,
            headers: formData.getHeaders()
        });

        if (!pyResponse.ok) {
            const errorText = await pyResponse.text();
            throw new Error(`Python Vision Service Error: ${errorText}`);
        }

        // Convert PNG response to base64
        const buffer = Buffer.from(await pyResponse.arrayBuffer());
        const base64 = `data:image/png;base64,${buffer.toString('base64')}`;

        // Cleanup upload
        try { fs.unlinkSync(req.file.path); } catch(e){}

        res.json({ result: base64 });
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
