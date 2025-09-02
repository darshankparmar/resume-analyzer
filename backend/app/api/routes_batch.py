from fastapi import APIRouter, File, Form, UploadFile
from typing import Optional, List, cast

from app.core.settings import HR_BATCH_MAX_FILE_SIZE_BYTES, HR_BATCH_MAX_FILES
from app.utils.responses import error_response, error_message_from_json_response
from app.utils.validators import is_valid_url
from app.services.text_extraction import extract_text_pypdf, extract_text_ocr_optional
from app.services.scrape import scrape_job_description


router = APIRouter(prefix="/api/v1", tags=["analysis-batch"])


@router.post("/analyze-resumes-batch")
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
    hr_questions_camel: Optional[str] = Form(None, alias="hrQuestions"),
    hr_questions_snake: Optional[str] = Form(None, alias="hr_questions"),
):
    job_title: Optional[str] = job_title_camel or job_title_snake
    job_description: Optional[str] = job_description_camel or job_description_snake
    job_link: Optional[str] = job_link_camel or job_link_snake
    hr_focus: Optional[str] = hr_focus_camel or hr_focus_snake
    hr_questions_raw: Optional[str] = hr_questions_camel or hr_questions_snake
    hr_questions: Optional[List[str]] = None
    if hr_questions_raw:
        try:
            import json
            parsed = json.loads(hr_questions_raw)
            if isinstance(parsed, list):
                hr_questions = [str(x) for x in parsed][:5]
        except Exception:
            hr_questions = None

    missing = []
    if not job_title:
        missing.append("jobTitle")
    if not resumes or len(resumes) == 0:
        missing.append("resumes")
    if missing:
        return error_response(
            code="MISSING_FIELDS",
            message="Required fields are missing",
            details={"missing": missing},
            status_code=422,
        )

    if not (job_link and job_link.strip()) and not (job_description and job_description.strip()):
        return error_response(
            code="MISSING_JOB_INFO",
            message="Either job link or job description is required.",
            details={"jobLink": job_link, "jobDescription": job_description},
            status_code=422,
        )

    if job_link and not is_valid_url(job_link):
        return error_response(
            code="INVALID_JOB_LINK",
            message="Job link must be a valid URL",
            details={"received": job_link},
            status_code=422,
        )

    if len(resumes) > HR_BATCH_MAX_FILES:
        return error_response(
            code="TOO_MANY_FILES",
            message=f"Maximum {HR_BATCH_MAX_FILES} resumes allowed per batch.",
            details={"maxFiles": HR_BATCH_MAX_FILES, "received": len(resumes)},
            status_code=413,
        )

    # Pre-scrape JD once for the batch if needed (avoid N network calls)
    batch_scraped_jd: Optional[str] = None
    if job_link and (not job_description or len(job_description.strip()) < 200):
        batch_scraped_jd = scrape_job_description(job_link)
        if batch_scraped_jd and len(batch_scraped_jd) < 50:
            batch_scraped_jd = None

    # At this point, job_title is guaranteed by earlier validation
    job_title_required: str = cast(str, job_title)
    results = []
    for resume in resumes:
        try:
            contents = await resume.read(HR_BATCH_MAX_FILE_SIZE_BYTES + 1)
        except Exception as e:
            results.append({"name": resume.filename, "success": False, "error": "Read error"})
            continue

        if len(contents or b"") > HR_BATCH_MAX_FILE_SIZE_BYTES:
            results.append({"name": resume.filename, "success": False, "error": "File size exceeds 2MB limit"})
            continue

        from app.utils.validators import is_valid_pdf

        if not is_valid_pdf(getattr(resume, "content_type", None), contents):
            results.append({"name": resume.filename, "success": False, "error": "Only PDF files are allowed"})
            continue

        text = extract_text_pypdf(contents)
        if not text:
            ocr_text = extract_text_ocr_optional(contents)
            if ocr_text:
                text = ocr_text
        if not text:
            results.append({"name": resume.filename, "success": False, "error": "Could not extract text from PDF"})
            continue

        try:
            try:
                from agents.resume_agent_recruiter import AgentInputs, run_recruiter_analysis  # type: ignore
            except Exception:
                from backend.agents.resume_agent_recruiter import AgentInputs, run_recruiter_analysis  # type: ignore

            # Build JD and custom instructions
            jd_text_for_agent = batch_scraped_jd or job_description
            jd_url_for_agent = None if batch_scraped_jd else job_link

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
                resume_text=text,
                job_title=job_title_required,
                job_description_text=jd_text_for_agent,
                job_description_url=jd_url_for_agent,
                custom_instructions=custom_note,
                hr_questions=hr_questions,
            )

            analysis_report_md = run_recruiter_analysis(inputs)

            # Optional score parse
            score = None
            try:
                from app.utils.scoring import parse_score_from_markdown
                score = parse_score_from_markdown(analysis_report_md)
            except Exception:
                score = None

            results.append({
                "name": resume.filename,
                "success": True,
                "score": score,
                "report": analysis_report_md,
            })
        except Exception as e:
            results.append({"name": resume.filename, "success": False, "error": f"Analysis failed: {str(e)}"})

    return {"success": True, "results": results, "message": "Batch analysis completed."}
