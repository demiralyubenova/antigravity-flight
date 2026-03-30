import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

console.log('=== SERVER STARTUP ===');
console.log('Node version:', process.version);
console.log('PORT env:', process.env.PORT);
console.log('CWD:', process.cwd());
console.log('Memory:', JSON.stringify(process.memoryUsage()));

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
});
process.on('SIGTERM', () => {
    console.error('GOT SIGTERM — process being killed');
});
process.on('SIGINT', () => {
    console.error('GOT SIGINT');
});
process.on('exit', (code) => {
    console.error('PROCESS EXIT with code:', code);
});

console.log('Loading routes...');
import aiRoutes from './routes/aiRoute.js';
console.log('Routes loaded.');

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

// Log every 5s to confirm process is alive
setInterval(() => {
    console.log(`[heartbeat] alive, memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`);
}, 5000);

const server = app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});

server.on('error', (err) => {
    console.error('SERVER LISTEN ERROR:', err);
});
