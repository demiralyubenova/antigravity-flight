
import express from 'express';
import multer from 'multer';

const PYTHON_URL = 'http://localhost:8000';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Check if Python server is reachable
async function checkPythonServer(): Promise<boolean> {
    try {
        const fetch = (await import('node-fetch')).default as any;
        const resp = await fetch(`${PYTHON_URL}/health`, { timeout: 2000 });
        return resp.ok;
    } catch {
        return false;
    }
}

router.post('/remove-background', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const healthy = await checkPythonServer();
        if (!healthy) {
            console.error('Python server not reachable at', PYTHON_URL);
            return res.status(503).json({ error: 'Background removal service is starting up, please try again in a few seconds' });
        }

        const fs = await import('fs');
        const FormData = (await import('form-data')).default;
        const fetch = (await import('node-fetch')).default as any;

        const formData = new FormData();
        formData.append('file', fs.createReadStream(req.file.path), {
            filename: req.file.originalname,
            contentType: req.file.mimetype
        });

        console.log('Sending image to Python server for background removal...');
        const pyResponse = await fetch(`${PYTHON_URL}/remove-bg`, {
            method: 'POST',
            body: formData as any,
            headers: formData.getHeaders(),
            timeout: 60000, // 60s timeout for CPU-based background removal
        });

        if (!pyResponse.ok) {
            const errorText = await pyResponse.text();
            console.error('Python server error:', pyResponse.status, errorText);
            throw new Error(`Python Vision Service Error: ${errorText}`);
        }

        // Convert PNG response to base64
        const buffer = Buffer.from(await pyResponse.arrayBuffer());
        const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
        console.log('Background removal successful, response size:', buffer.length);

        // Cleanup upload
        try { fs.unlinkSync(req.file.path); } catch(e){}

        res.json({ result: base64 });
    } catch (error: any) {
        console.error('Error processing background removal:', error.message);
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
