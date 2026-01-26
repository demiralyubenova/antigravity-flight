
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const removeBackgroundService = async (filePath: string, mimeType: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Paths relative to execution directory (server root)
        const pythonScript = path.resolve(process.cwd(), 'python/process_image.py');

        // We look for a .venv inside the project root or the server folder
        // For simplicity, let's try to find it in the project root first if it exists, 
        // otherwise assume a local one will be created or use system python
        const venvPython = path.resolve(process.cwd(), '../.venv/bin/python');
        const localVenvPython = path.resolve(process.cwd(), 'python/.venv/bin/python');

        const pythonExecutable = fs.existsSync(localVenvPython) ? localVenvPython :
            fs.existsSync(venvPython) ? venvPython : 'python3';

        const absoluteFilePath = path.resolve(process.cwd(), filePath);
        const ext = mimeType.split('/')[1] || 'png';
        const inputWithExt = `${absoluteFilePath}.${ext}`;
        const outputPath = `${absoluteFilePath}_processed.png`;

        try {
            fs.renameSync(absoluteFilePath, inputWithExt);
        } catch (err) {
            console.error("Failed to rename input file", err);
            reject(err);
            return;
        }

        console.log(`Processing image: ${inputWithExt} -> ${outputPath}`);
        console.log(`Using Python: ${pythonExecutable}`);

        const pythonProcess = spawn(pythonExecutable, [pythonScript, inputWithExt, outputPath]);

        let stderr = "";
        pythonProcess.stdout.on('data', (data) => console.log(`Python: ${data}`));
        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(`Python Error: ${data}`);
        });

        pythonProcess.on('close', (code) => {
            // Cleanup input
            try { if (fs.existsSync(inputWithExt)) fs.unlinkSync(inputWithExt); } catch (e) { }

            if (code !== 0) {
                reject(new Error(`Python exited with code ${code}: ${stderr}`));
                return;
            }

            try {
                if (fs.existsSync(outputPath)) {
                    const buffer = fs.readFileSync(outputPath);
                    const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
                    fs.unlinkSync(outputPath);
                    resolve(base64);
                } else {
                    reject(new Error("Output file was not created"));
                }
            } catch (err) {
                reject(err);
            }
        });
    });
};
