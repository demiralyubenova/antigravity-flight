import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import aiRoutes from './routes/aiRoute.js';

const app = express();
const PORT = process.env.PORT || 3011;

// Start Python vision server
const venvPython = path.resolve(process.cwd(), 'python/.venv/bin/python');
const pythonBin = fs.existsSync(venvPython) ? venvPython : 'python3';

console.log(`Starting Python server with: ${pythonBin}`);
const pyServer = spawn(pythonBin, ['-m', 'uvicorn', 'python.main:app', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
});

pyServer.stdout.on('data', (data: Buffer) => console.log(`[python] ${data.toString().trim()}`));
pyServer.stderr.on('data', (data: Buffer) => console.log(`[python] ${data.toString().trim()}`));
pyServer.on('error', (err) => console.error('[python] Failed to start:', err.message));
pyServer.on('exit', (code) => console.error(`[python] Exited with code ${code}`));

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.options('*', cors());
app.use(express.json());

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
