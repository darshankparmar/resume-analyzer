from fastapi import APIRouter, File, Form, UploadFile
from typing import Optional, cast

from app.core.settings import MAX_FILE_SIZE_BYTES
from app.utils.responses import error_response
from app.utils.validators import is_valid_url, is_valid_pdf
from app.services.text_extraction import extract_text_pypdf, extract_text_ocr_optional


router = APIRouter(prefix="/api/v1", tags=["analysis-individual"])


def _validate_required(job_title: Optional[str], resume: Optional[UploadFile]):
    missing = []
    if not job_title:
        missing.append("jobTitle")
    if resume is None:
        missing.append("resume")
    if missing:
        return error_response(
            code="MISSING_FIELDS",
            message="Required fields are missing",
            details={"missing": missing},
            status_code=422,
        )
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
            details={},
            status_code=500,
        )


def _validate_pdf_file(contents: bytes, content_type: Optional[str]):
    size = len(contents or b"")
    if size > MAX_FILE_SIZE_BYTES:
        return error_response(
            code="FILE_TOO_LARGE",
            message="File size exceeds 10MB limit",
            details={"maxSize": "10MB"},
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


@router.post("/analyze-resume")
async def analyze_resume(
    resume: UploadFile = File(...),
    job_title_camel: Optional[str] = Form(None, alias="jobTitle"),
    job_title_snake: Optional[str] = Form(None, alias="job_title"),
    job_description_camel: Optional[str] = Form(None, alias="jobDescription"),
    job_description_snake: Optional[str] = Form(None, alias="job_description"),
    job_link_camel: Optional[str] = Form(None, alias="jobLink"),
    job_link_snake: Optional[str] = Form(None, alias="job_link")
):
    # Normalize
    job_title: Optional[str] = job_title_camel or job_title_snake
    job_description: Optional[str] = job_description_camel or job_description_snake
    job_link: Optional[str] = job_link_camel or job_link_snake

    err = _validate_required(job_title, resume)
    if err:
        return err
    err = _validate_job_link(job_link)
    if err:
        return err

    contents, err = await _read_resume_file(resume)
    if err:
        return err

    # contents is guaranteed when err is None
    contents_b: bytes = cast(bytes, contents)

    err = _validate_pdf_file(contents_b, resume.content_type)
    if err:
        return err

    extracted_text = extract_text_pypdf(contents_b)
    if not extracted_text:
        ocr_text = extract_text_ocr_optional(contents_b)
        if ocr_text:
            extracted_text = ocr_text
    if not extracted_text:
        return error_response(
            code="TEXT_EXTRACTION_FAILED",
            message="Could not extract text from PDF",
            details={"reason": "PDF may be image-based or corrupted"},
            status_code=422,
        )

    # JD pre-scrape is handled in legacy main; keep simple here (could be added via a service)
    try:
        try:
            from agents.resume_agent_individual import AgentInputs, run_individual_analysis  # type: ignore
        except Exception:
            from backend.agents.resume_agent_individual import AgentInputs, run_individual_analysis  # type: ignore

        # job_title validated earlier
        job_title_req: str = cast(str, job_title)

        inputs = AgentInputs(
            resume_text=extracted_text,
            job_title=job_title_req,
            job_description_text=job_description,
            job_description_url=job_link,
            custom_instructions=None,
        )

        analysis_report_md = run_individual_analysis(inputs)
    except Exception:
        return error_response(
            code="ANALYSIS_FAILED",
            message="Failed to analyze resume content",
            details={"reason": "AI service unavailable", "retryAfter": "30s"},
            status_code=502,
        )

    return {
        "success": True,
        "data": {"analysisReport": analysis_report_md},
        "message": "Analysis completed successfully",
    }
