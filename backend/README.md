# Resume Analyzer Backend (FastAPI)

Modular FastAPI service exposing two endpoints: individual analysis for job seekers and batch analysis for HR recruiters.

## Project structure

```
backend/
	app/
		api/
			routes_individual.py   # POST /api/v1/analyze-resume
			routes_batch.py        # POST /api/v1/analyze-resumes-batch
		core/
			settings.py            # CORS origins, size limits, etc.
		services/
			text_extraction.py     # pypdf + optional OCR
			scrape.py              # optional JD scraping helpers
		utils/
			responses.py           # error helpers
			validators.py          # URL/PDF validators
			scoring.py             # parse score from Markdown
		main_app.py              # app factory, CORS + routers
	main.py                    # entrypoint: `uvicorn main:app`
```

## Endpoints

- POST /api/v1/analyze-resume (multipart/form-data)

  - resume: PDF file, required, max 10MB
  - jobTitle: string, required
  - jobDescription: string, optional
  - jobLink: URL, optional

- POST /api/v1/analyze-resumes-batch (multipart/form-data)
  - resumes: list of up to 10 PDF files, each ≤ 2MB
  - jobTitle: string, required
  - jobDescription OR jobLink: required (one of them)

Responses follow the schema in `backend-structure.md`.

## Run locally

1. Install deps

```cmd
python -m pip install --upgrade pip
pip install -r requirements.txt
```

2. Start server

```cmd
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open <http://localhost:8000/docs> for Swagger UI.

## Configuration

- CORS: set additional origins via env var `ALLOWED_ORIGINS` (comma-separated). Defaults include `http://localhost:8080` and your Vercel URL.
- OCR: optional dependencies (pdf2image, pillow, pytesseract) and system tools (Poppler, Tesseract). On Windows, set `POPPLER_PATH` to the Poppler bin directory.

## Agent (Gemini or OpenAI via agno)

Provider is selected via environment variables. Example (Windows cmd):

```cmd
REM Choose provider: gemini (default) or openai
set AI_PROVIDER=gemini

REM For Gemini
set GOOGLE_API_KEY=your_gemini_api_key
set GEMINI_MODEL=gemini-1.5-flash

REM For OpenAI (optional)
set OPENAI_API_KEY=your_openai_api_key
set OPENAI_MODEL=gpt-5-mini

REM For Firecrawl
set FIRECRAWL_API_KEY=your_firecrawl_api_key

REM For Allowed Origins
set ALLOWED_ORIGINS=http://localhost:8080

REM For google sign in
set GOOGLE_CLIENT_ID=xyz.apps.googleusercontent.com

REM For firebase database
set GOOGLE_APPLICATION_CREDENTIALS=D:\secure\firebase\service-account.json
set FIREBASE_PROJECT_ID=<your-firebase-project-id>
```
