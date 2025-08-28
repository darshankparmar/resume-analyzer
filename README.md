# Resume Analyzer

Analyze and optimize your resume for a given job. Frontend (Vite + React + TypeScript) talks to a minimal FastAPI backend with a single endpoint.

## Monorepo Layout

- `backend/` — FastAPI service exposing `POST /api/v1/analyze-resume`
- `frontend/` — Vite + React + TS app (UI for upload/analyze/view report)

---

## Backend (FastAPI)

Single, stateless API as defined in `backend/backend-structure.md`.

### Backend requirements

- Python 3.10+

### Setup and Run (Windows cmd.exe)

```bat
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API docs are available at: <http://localhost:8000/docs>

### Endpoint

- `POST /api/v1/analyze-resume` (multipart/form-data)
  - `resume`: PDF file (max 10MB, required)
  - `jobTitle`: string (required)
  - `jobDescription`: string (optional)
  - `jobLink`: URL (optional)

Responses and error formats are documented in `backend/backend-structure.md`.

### CORS

Backend allows local dev at `http://localhost:8080` by default. If your frontend runs elsewhere, add the origin in `main.py`.

---

## Frontend (Vite + React)

### Frontend requirements

- Node.js 18+

### Configure API base URL

Create `frontend/.env` (or edit it) and set the backend URL:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Install and Run (Windows cmd.exe)

```bat
cd frontend
npm install
npm run dev
```

The app will start on <http://localhost:8080> (configured in `frontend/vite.config.ts`).

### Build

```bat
cd frontend
npm run build
npm run preview
```

---

## End-to-End Usage

1. Start the backend (port 8000).
2. Start the frontend and ensure `VITE_API_BASE_URL` points to the backend.
3. In the UI:
   - Upload a PDF resume (≤ 10MB).
   - Enter Job Title (required), optionally Job Description and Job Link.
   - Click “Analyze & Generate Report”.
   - View the Markdown report; you can download or clear it.

Errors (file too large, invalid file type, bad URL, analysis failure) are surfaced via toasts, mirroring backend error messages.

---

## Troubleshooting

- 413 File too large: Ensure the PDF is ≤ 10MB.
- Invalid file type: Only `application/pdf` is accepted.
- CORS error: Add your frontend origin to allowed origins in `backend/main.py`.
- Network error: Verify `VITE_API_BASE_URL` in `frontend/.env` and backend is running.

---

## Tech Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS, shadcn-ui
- Backend: FastAPI (Python)

---

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
