
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import aiRoutes from './routes/aiRoute.js';

const app = express();
const PORT = 3011;

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());

// Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api', aiRoutes);

app.get('/', (req, res) => {
    res.send('Antigravity Flight AI Backend is running.');
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
