# Antigravity Flight (Wearwise)

This project consists of a React frontend, a Node.js API server, a Python AI Background Removal service, and Supabase Edge Functions. To run the full stack locally, you need to start these components.

## 1. Start the React Frontend

The main frontend runs on Vite. In the root directory, install dependencies and start the development server:

```bash
npm install
npm run dev
```

The frontend will typically be available at `http://localhost:8080`.

## 2. Start the Python Vision Service (Background Removal)

This service uses `rembg` to process and strip backgrounds from clothing images.

Open a new terminal window, navigate to the Python directory, create a virtual environment, install the requirements, and run the FastAPI server:

```bash
cd server/python
python3 -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
*(Alternatively, you can run `npm run vision` from the `server` directory if your python environment is already configured).*

The python vision service should now be running on `http://localhost:8000`.

## 3. Start the Node.js Backend Server

This server provides proxy routes, communicates with the Gemini APIs, and connects to your Python vision service.

Open a new terminal window, navigate to the `server` directory, install dependencies, and start the development server:

```bash
cd server
npm install
npm run dev
```

The backend server will run on `http://localhost:3011`.

## 4. Supabase Edge Functions (Optional for Local Testing)

If you are developing or testing edge functions locally instead of pointing to the deployed Supabase project, you can serve them locally using the Supabase CLI (requires Docker to be running):

```bash
npx supabase start
npx supabase functions serve
```

## Production Deployment

- **Frontend**: Automatically deployed via Vercel on commits to the `main` branch.
- **Node.js/Python Backend**: Configured for deployment on Railway (`railway.json`).
- **Edge Functions**: Deploy using `npx supabase functions deploy`.
