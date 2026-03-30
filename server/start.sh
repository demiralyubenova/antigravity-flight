#!/bin/bash
set -e

echo "=== Starting services ==="

# Check if Python venv exists
if [ -f "python/.venv/bin/python" ]; then
    echo "Starting Python vision server..."
    python/.venv/bin/python -m uvicorn python.main:app --host 0.0.0.0 --port 8000 &
    PYTHON_PID=$!
    echo "Python server started with PID $PYTHON_PID"
else
    echo "WARNING: Python venv not found, skipping vision server"
    ls -la python/ 2>/dev/null || echo "python/ directory does not exist"
fi

echo "Starting Node server..."
exec tsx server.ts
