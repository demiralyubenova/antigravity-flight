import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import aiRoutes from './routes/aiRoute.js';

const app = express();
const PORT = process.env.PORT || 3011;

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.options('*', cors());
app.use(express.json({ limit: '50mb' }));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use('/api', aiRoutes);

app.get('/', (req, res) => {
    res.send('Antigravity Flight AI Backend is running.');
});

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
