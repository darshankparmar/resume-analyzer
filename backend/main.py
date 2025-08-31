from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any, List
from uuid import uuid4
from io import BytesIO
import re
import os
from urllib.parse import urlparse

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB

app = FastAPI(title="Resume Analyzer Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://resume-analyzer-liard-three.vercel.app",
        "http://localhost:8080",
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


def _error_message_from_response(resp) -> str:
    """Extract a readable error message from a JSONResponse produced by error_response."""
    try:
        if isinstance(resp, JSONResponse):
            body = resp.body.decode() if isinstance(resp.body, (bytes, bytearray)) else resp.body
            import json
            data = json.loads(body)
            return data.get("error", {}).get("message") or "Validation failed"
    except Exception:
        pass
    return "Validation failed"


def is_valid_pdf(mimetype: Optional[str], content: bytes) -> bool:
    # Basic checks: content type header and PDF signature
    if mimetype != "application/pdf":
        return False
    # PDF files typically start with "%PDF"
    return content.startswith(b"%PDF")


def is_valid_url(url: str) -> bool:
    # Lightweight URL validation without extra deps
    try:
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


def _strip_html_tags(html: str) -> str:
    try:
        # Remove script and style blocks
        html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
        html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.IGNORECASE)
        # Remove all tags
        text = re.sub(r"<[^>]+>", " ", html)
        # Collapse whitespace
        text = re.sub(r"\s+", " ", text)
        return text.strip()
    except Exception:
        return ""


def _tidy_text(text: str, max_len: int = 15000) -> str:
    t = (text or "").strip()
    if len(t) > max_len:
        t = t[:max_len]
    return t


def _scrape_job_description(url: str) -> Optional[str]:
    """Best-effort server-side scrape of JD content.

    1) Try firecrawl-py if FIRECRAWL_API_KEY is set.
    2) Fallback to urllib to fetch HTML and strip tags.
    Returns plain text or None on failure.
    """
    if not url or not is_valid_url(url):
        return None

    # Try Firecrawl Cloud if configured
    try:
        api_key = os.getenv("FIRECRAWL_API_KEY")
        if api_key:
            try:
                from firecrawl import Firecrawl  # type: ignore
                client = Firecrawl(api_key=api_key)
                data = None
                try:
                    # Newer SDKs
                    data = client.scrape_url(url)  # type: ignore[attr-defined]
                except Exception:
                    try:
                        # Older SDKs
                        data = client.scrape(url)  # type: ignore[attr-defined]
                    except Exception:
                        data = None
                if isinstance(data, dict):
                    for key in ("markdown", "md", "content", "text", "html"):
                        if key in data and data[key]:
                            val = data[key]
                            if isinstance(val, str):
                                if "<" in val and "</" in val:
                                    return _tidy_text(_strip_html_tags(val))
                                return _tidy_text(val)
            except Exception:
                pass
    except Exception:
        pass

    # Fallback to stdlib fetch
    try:
        import urllib.request

        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = resp.read()
            html = raw.decode("utf-8", errors="ignore")
            return _tidy_text(_strip_html_tags(html))
    except Exception:
        return None


def _parse_score_from_markdown(md: Optional[str]) -> Optional[int]:
    """Extract a 0-100 score from a Markdown report.

    Looks for common patterns like:
      - Overall Match Score: 85%
      - Match Score: 72%
      - 90% match
    Returns an int between 0 and 100 if found; otherwise None.
    """
    if not md:
        return None
    import re
    # Normalize whitespace
    text = " ".join(md.split())
    patterns = [
        r"overall\s+match\s+score\s*[:\-]\s*(\d{1,3})%",
        r"match\s+score\s*[:\-]\s*(\d{1,3})%",
        r"(\d{1,3})%\s*(?:overall\s+)?match",
    ]
    for p in patterns:
        m = re.search(p, text, flags=re.IGNORECASE)
        if m:
            try:
                val = int(m.group(1))
                if 0 <= val <= 100:
                    return val
            except Exception:
                pass
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
    hr_focus_camel: Optional[str] = Form(None, alias="hrFocus"),
    hr_focus_snake: Optional[str] = Form(None, alias="hr_focus"),
):
    # Normalize inputs
    job_title: Optional[str] = job_title_camel or job_title_snake
    job_description: Optional[str] = job_description_camel or job_description_snake
    job_link: Optional[str] = job_link_camel or job_link_snake
    hr_focus: Optional[str] = hr_focus_camel or hr_focus_snake
    
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

    # Pre-scrape JD if link is provided and description is weak/missing
    scraped_jd: Optional[str] = None
    if job_link and (not job_description or len(job_description.strip()) < 200):
        scraped_jd = _scrape_job_description(job_link)
        if scraped_jd and len(scraped_jd) < 50:
            scraped_jd = None

    # Run the agent to generate the Markdown report
    try:
        try:
            from agents.resume_agent import AgentInputs, run_resume_analysis  # type: ignore
        except Exception:
            from backend.agents.resume_agent import AgentInputs, run_resume_analysis  # type: ignore

        # If we scraped JD successfully, pass it as text and omit URL to avoid duplicate JD scraping tool calls
        jd_text_for_agent = scraped_jd or job_description
        jd_url_for_agent = None if scraped_jd else job_link

        # Build custom instructions for the agent (server notes + optional HR focus)
        custom_notes: List[str] = []
        if scraped_jd:
            custom_notes.append(
                "Job description was pre-scraped server-side. Do NOT scrape the JD URL again; use the provided JD text."
            )
            custom_notes.append(
                "You may consult the provided reference links for resume writing guidance if needed."
            )
        if hr_focus and hr_focus.strip():
            custom_notes.append(
                "HR Focus/Questions (PRIORITY — evaluate these first; treat JD as secondary):\n" + hr_focus.strip()
            )
        custom_note = "\n".join(custom_notes) if custom_notes else None

        inputs = AgentInputs(
            resume_text=extracted_text,
            job_title=job_title,
            job_description_text=jd_text_for_agent,
            job_description_url=jd_url_for_agent,
            custom_instructions=custom_note,
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


@app.post("/api/v1/analyze-resumes-batch")
async def analyze_resumes_batch(
    resumes: List[UploadFile] = File(..., description="Up to 10 PDF resumes"),
    job_title_camel: Optional[str] = Form(None, alias="jobTitle"),
    job_title_snake: Optional[str] = Form(None, alias="job_title"),
    job_description_camel: Optional[str] = Form(None, alias="jobDescription"),
    job_description_snake: Optional[str] = Form(None, alias="job_description"),
    job_link_camel: Optional[str] = Form(None, alias="jobLink"),
    job_link_snake: Optional[str] = Form(None, alias="job_link"),
    hr_focus_camel: Optional[str] = Form(None, alias="hrFocus"),
    hr_focus_snake: Optional[str] = Form(None, alias="hr_focus"),
):
    # Normalize inputs
    job_title: Optional[str] = job_title_camel or job_title_snake
    job_description: Optional[str] = job_description_camel or job_description_snake
    job_link: Optional[str] = job_link_camel or job_link_snake
    hr_focus: Optional[str] = hr_focus_camel or hr_focus_snake

    # Validate required fields
    missing = []
    if not job_title:
        missing.append("jobTitle")
    if not resumes or len(resumes) == 0:
        missing.append("resumes")
    if missing:
        return _err_missing_fields(missing)

    # Enforce at least one of job_link or job_description
    if not (job_link and job_link.strip()) and not (job_description and job_description.strip()):
        return error_response(
            code="MISSING_JOB_INFO",
            message="Either job link or job description is required.",
            details={"jobLink": job_link, "jobDescription": job_description},
            status_code=422,
        )

    # Validate job link if provided
    err = _validate_job_link(job_link)
    if err:
        return err

    # Limit to 10 files
    if len(resumes) > 10:
        return error_response(
            code="TOO_MANY_FILES",
            message="Maximum 10 resumes allowed per batch.",
            details={"maxFiles": 10, "received": len(resumes)},
            status_code=413,
        )

    # Pre-scrape JD once for the batch if needed (avoid N network calls)
    batch_scraped_jd: Optional[str] = None
    if job_link and (not job_description or len(job_description.strip()) < 200):
        batch_scraped_jd = _scrape_job_description(job_link)
        if batch_scraped_jd and len(batch_scraped_jd) < 50:
            batch_scraped_jd = None

    results = []
    for resume in resumes:
        # Read file contents with size guard
        contents, err = await _read_resume_file(resume)
        if err:
            results.append({
                "name": resume.filename,
                "success": False,
                "error": _error_message_from_response(err),
            })
            continue

        # Enforce 2MB size limit for HR batch
        if len(contents or b"") > 2 * 1024 * 1024:
            results.append({
                "name": resume.filename,
                "success": False,
                "error": "File size exceeds 2MB limit"
            })
            continue

        # Validate PDF
        err = _validate_pdf_file(contents, resume.content_type)
        if err:
            results.append({
                "name": resume.filename,
                "success": False,
                "error": _error_message_from_response(err),
            })
            continue

        # Extract text
        extracted_text = _extract_text_pypdf(contents)
        if not extracted_text:
            ocr_text = _extract_text_ocr_optional(contents)
            if ocr_text:
                extracted_text = ocr_text
        if not extracted_text:
            results.append({
                "name": resume.filename,
                "success": False,
                "error": "Could not extract text from PDF"
            })
            continue

        # Run the Gemini agent to generate the Markdown report and score
        try:
            try:
                from agents.resume_agent import AgentInputs, run_resume_analysis  # type: ignore
            except Exception:
                from backend.agents.resume_agent import AgentInputs, run_resume_analysis  # type: ignore

            jd_text_for_agent = batch_scraped_jd or job_description
            jd_url_for_agent = None if batch_scraped_jd else job_link
            # Build custom instructions for the agent (server notes + optional HR focus)
            custom_notes: List[str] = []
            if batch_scraped_jd:
                custom_notes.append(
                    "Job description was pre-scraped server-side. Do NOT scrape the JD URL again; use the provided JD text."
                )
                custom_notes.append(
                    "You may consult the provided reference links for resume writing guidance if needed."
                )
            if hr_focus and hr_focus.strip():
                custom_notes.append(
                    "HR Focus/Questions (PRIORITY — evaluate these first; treat JD as secondary):\n" + hr_focus.strip()
                )
            custom_note = "\n".join(custom_notes) if custom_notes else None

            inputs = AgentInputs(
                resume_text=extracted_text,
                job_title=job_title,
                job_description_text=jd_text_for_agent,
                job_description_url=jd_url_for_agent,
                custom_instructions=custom_note,
            )

            analysis_report_md = run_resume_analysis(inputs)
            # Try to compute a score if the function exists
            score = None
            try:
                # Import lazily to avoid hard dependency
                try:
                    from agents.resume_agent import run_resume_score  # type: ignore
                except Exception:
                    from backend.agents.resume_agent import run_resume_score  # type: ignore
                try:
                    score = run_resume_score(inputs)  # pyright: ignore
                except Exception:
                    score = None
            except Exception:
                score = None

            if score is None:
                # Prefer parsing score from the agent's Markdown report if present
                parsed = _parse_score_from_markdown(analysis_report_md)
                if parsed is not None:
                    score = parsed

            results.append({
                "name": resume.filename,
                "success": True,
                "score": score,
                "report": analysis_report_md,
            })
        except Exception as e:
            results.append({
                "name": resume.filename,
                "success": False,
                "error": f"Analysis failed: {str(e)}"
            })

    return {"success": True, "results": results, "message": "Batch analysis completed."}


@app.get("/")
@app.head("/")
async def health() -> Dict[str, str]:
    return {"status": "ok"}
