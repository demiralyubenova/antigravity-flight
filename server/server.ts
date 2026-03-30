
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

// Allow all origins for CORS (permissive for production compatibility)
app.use(cors());
app.options('*', cors()); // Handle preflight requests
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

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
