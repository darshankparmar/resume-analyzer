# Resume Analyzer Backend (FastAPI)

Single, stateless API to analyze a resume PDF. Core analysis logic is stubbed for now.

## Endpoint

POST /api/v1/analyze-resume (multipart/form-data)

- resume: PDF file, required, max 10MB
- jobTitle: string, required
- jobDescription: string, optional
- jobLink: URL, optional

Responses follow the schema described in `backend-structure.md`.

## Run locally

1. Create a virtual environment (optional) and install deps

```cmd
python -m pip install --upgrade pip
pip install -r requirements.txt
```

2. Start server

```cmd
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open <http://localhost:8000/docs> for Swagger UI.

## Notes

- File size and type are validated.
- PDF signature check is heuristic.
- Text extraction is implemented (pypdf with optional OCR fallback). If both fail, the API returns TEXT_EXTRACTION_FAILED.

## Agent (Gemini via agno)

Set your Gemini API key as an environment variable:

```cmd
set GOOGLE_API_KEY=your_api_key_here
```

Example usage in code:

```python
from agents.resume_agent import AgentInputs, run_resume_analysis
import asyncio

inputs = AgentInputs(
	resume_text="<extracted resume text>",
	job_title="Senior Software Engineer",
	job_description_text="Optional JD text...",
	job_description_url="https://company.com/careers/123",
)

md = asyncio.run(run_resume_analysis(inputs))
print(md)
```

The FastAPI route now extracts PDF text and invokes the agent to return Markdown.

### Optional OCR fallback

If your PDFs are image-based, enable OCR:

1. Install optional Python deps (uncomment in `requirements.txt` or install directly):
   - pdf2image, pillow, pytesseract
2. Install system tools:
   - Windows: Install Poppler and set `POPPLER_PATH` to its bin folder.
   - Install Tesseract OCR and ensure `tesseract.exe` is in PATH.

Set environment variable (example Windows cmd):

```cmd
set POPPLER_PATH=C:\poppler-24.08.0\Library\bin
```
