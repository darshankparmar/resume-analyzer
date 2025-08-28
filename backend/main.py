from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
from uuid import uuid4
from io import BytesIO

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

app = FastAPI(title="Resume Analyzer Backend", version="1.0.0")

# CORS: allow local frontend (http://localhost:8080)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=False,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


def error_response(code: str, message: str, details: Optional[Dict[str, Any]] = None, status_code: int = 400):
    payload = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        },
    }
    return JSONResponse(content=payload, status_code=status_code)


def is_valid_pdf(mimetype: Optional[str], content: bytes) -> bool:
    # Basic checks: content type header and PDF signature
    if mimetype != "application/pdf":
        return False
    # PDF files typically start with "%PDF"
    return content.startswith(b"%PDF")


def is_valid_url(url: str) -> bool:
    # Lightweight URL validation without extra deps
    try:
        from urllib.parse import urlparse

        parsed = urlparse(url)
        return all([parsed.scheme in ("http", "https"), parsed.netloc])
    except Exception:
        return False


def _err_missing_fields(missing):
    return error_response(
        code="MISSING_FIELDS",
        message="Required fields are missing",
        details={"missing": missing},
        status_code=422,
    )


def _validate_required(job_title: str, resume: UploadFile):
    missing = []
    if not job_title:
        missing.append("jobTitle")
    if resume is None:
        missing.append("resume")
    if missing:
        return _err_missing_fields(missing)
    return None


def _validate_job_link(job_link: Optional[str]):
    if job_link and not is_valid_url(job_link):
        return error_response(
            code="INVALID_JOB_LINK",
            message="Job link must be a valid URL",
            details={"received": job_link},
            status_code=422,
        )
    return None


async def _read_resume_file(resume: UploadFile):
    try:
        contents = await resume.read(MAX_FILE_SIZE_BYTES + 1)
        return contents, None
    except Exception:
        return None, error_response(
            code="INTERNAL_ERROR",
            message="An unexpected error occurred while processing your request",
            details={"traceId": str(uuid4())},
            status_code=500,
        )


def _validate_pdf_file(contents: bytes, content_type: Optional[str]):
    size = len(contents or b"")
    if size > MAX_FILE_SIZE_BYTES:
        return error_response(
            code="FILE_TOO_LARGE",
            message="File size exceeds 10MB limit",
            details={"maxSize": "10MB", "receivedSize": f"{round(size/1024/1024, 2)}MB"},
            status_code=413,
        )

    if not is_valid_pdf(content_type, contents):
        return error_response(
            code="INVALID_FILE_TYPE",
            message="Only PDF files are allowed",
            details={"allowedTypes": ["application/pdf"], "received": content_type},
            status_code=415,
        )

    if not contents.startswith(b"%PDF") or size < 5:
        return error_response(
            code="CORRUPTED_PDF",
            message="PDF file appears to be corrupted",
            details={"reason": "Unable to extract text content"},
            status_code=400,
        )
    return None


def _extract_text_pypdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(BytesIO(data))
        try:
            # Try decrypt with empty password for lightly protected files
            if getattr(reader, "is_encrypted", False):
                reader.decrypt("")
        except Exception:
            pass

        text_parts = []
        for page in getattr(reader, "pages", []):
            try:
                txt = page.extract_text() or ""
            except Exception:
                txt = ""
            if txt:
                text_parts.append(txt)
        return "\n".join(text_parts).strip()
    except Exception:
        return ""


def _extract_text_ocr_optional(data: bytes) -> Optional[str]:
    """Attempt OCR if optional dependencies and system tools are present.

    Requires: pdf2image, pillow, pytesseract, and Poppler (poppler_path on Windows),
    plus Tesseract installed in PATH. Returns text or None if unavailable/failed.
    """
    try:
        import os
        from pdf2image import convert_from_bytes
        import pytesseract

        poppler_path = os.getenv("POPPLER_PATH")  # Needed on Windows
        images = convert_from_bytes(data, fmt="png", poppler_path=poppler_path)
        texts = []
        for img in images:
            try:
                t = pytesseract.image_to_string(img)
            except Exception:
                t = ""
            if t and t.strip():
                texts.append(t.strip())
        combined = "\n".join(texts).strip()
        return combined or None
    except Exception:
        return None


@app.post("/api/v1/analyze-resume")
async def analyze_resume(
    resume: UploadFile = File(...),
    # Accept both camelCase and snake_case inputs
    job_title_camel: Optional[str] = Form(None, alias="jobTitle"),
    job_title_snake: Optional[str] = Form(None, alias="job_title"),
    job_description_camel: Optional[str] = Form(None, alias="jobDescription"),
    job_description_snake: Optional[str] = Form(None, alias="job_description"),
    job_link_camel: Optional[str] = Form(None, alias="jobLink"),
    job_link_snake: Optional[str] = Form(None, alias="job_link"),
):
    # Normalize inputs
    job_title: Optional[str] = job_title_camel or job_title_snake
    job_description: Optional[str] = job_description_camel or job_description_snake
    job_link: Optional[str] = job_link_camel or job_link_snake
    
    # Validate required fields and optional URL
    err = _validate_required(job_title, resume)
    if err:
        return err
    err = _validate_job_link(job_link)
    if err:
        return err

    # Read file contents with size guard
    contents, err = await _read_resume_file(resume)
    if err:
        return err

    err = _validate_pdf_file(contents, resume.content_type)
    if err:
        return err

    # Extract text via pypdf, then optional OCR fallback
    extracted_text = _extract_text_pypdf(contents)
    if not extracted_text:
        ocr_text = _extract_text_ocr_optional(contents)
        if ocr_text:
            extracted_text = ocr_text
    if not extracted_text:
        return error_response(
            code="TEXT_EXTRACTION_FAILED",
            message="Could not extract text from PDF",
            details={"reason": "PDF may be image-based or corrupted"},
            status_code=422,
        )

    # Run the Gemini agent to generate the Markdown report
    try:
        from agents.resume_agent import AgentInputs, run_resume_analysis

        inputs = AgentInputs(
            resume_text=extracted_text,
            job_title=job_title,
            job_description_text=job_description,
            job_description_url=job_link,
            custom_instructions=None,
        )

        analysis_report_md = run_resume_analysis(inputs)
    except Exception:
        return error_response(
            code="ANALYSIS_FAILED",
            message="Failed to analyze resume content",
            details={"reason": "AI service unavailable", "retryAfter": "30s"},
            status_code=502,
        )

    # Success response
    return {
        "success": True,
        "data": {"analysisReport": analysis_report_md},
        "message": "Analysis completed successfully",
    }


@app.get("/")
async def health() -> Dict[str, str]:
    return {"status": "ok"}
