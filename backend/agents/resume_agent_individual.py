"""
Agent for individual job seekers. Emphasizes personalized guidance and resume improvements.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, List
import os

try:
    from agno.agent import Agent, RunResponse
    from agno.models.google import Gemini
    from agno.utils.pprint import pprint_run_response
    from agno.tools.firecrawl import FirecrawlTools
    from agno.tools.duckduckgo import DuckDuckGoTools
except Exception as e:  # pragma: no cover
    raise ImportError(
        "Required package 'agno' not found. Install with: pip install agno google-genai firecrawl-py duckduckgo-search"
    ) from e


REPORT_TEMPLATE = (
    "# Resume Analysis Report\n\n"
    "## 📊 Overall Match Score: {overall_score}%\n\n"
    "## ✅ Strengths\n{strengths}\n\n"
    "## 🔧 Areas for Improvement\n{improvements}\n\n"
    "## 🎯 Recommendations\n{recommendations}\n\n"
    "## 📈 Competency Analysis\n{competency}\n"
)

FALLBACK_ITEM = "- Not enough information."

REF_LINKS: List[str] = [
    "https://drive.google.com/file/d/1F6FXFEuX1J_3XRZiGxXvx4uzmoDBRqpD/view",
    "https://www.themuse.com/advice/185-powerful-verbs-that-will-make-your-resume-awesome",
    "https://docs.google.com/document/d/e/2PACX-1vQa16NRCkScrUDW9bZGMRDgSVBgigzFFU6j8AI_jrAcRIkmKKyPAq4ZLbKVrWl3S8tTj3XiscHmJvL9/pub",
]


@dataclass
class AgentInputs:
    resume_text: str
    job_title: str
    job_description_text: Optional[str] = None
    job_description_url: Optional[str] = None
    custom_instructions: Optional[str] = None


def build_agent() -> Agent:
    provider = (os.getenv("AI_PROVIDER") or os.getenv("MODEL_PROVIDER") or "gemini").strip().lower()
    if provider == "openai":
        openai_model_id = os.getenv("OPENAI_MODEL") or "gpt-5-mini"
        try:
            try:
                from agno.models.openai import OpenAIChat as OpenAIModel  # type: ignore
            except Exception:
                from agno.models.openai import OpenAI as OpenAIModel  # type: ignore
            model = OpenAIModel(id=openai_model_id, temperature=0.2)
        except Exception:
            model = Gemini(id=os.getenv("GEMINI_MODEL") or "gemini-1.5-flash", temperature=0.2, max_output_tokens=3000)
    else:
        model = Gemini(id=os.getenv("GEMINI_MODEL") or "gemini-1.5-flash", temperature=0.2, max_output_tokens=3000)

    system_prompt = (
        "You are an AI Resume Coach for individual job seekers. "
        "Your role is to analyze a resume against a target job description (JD) "
        "and generate a structured, professional, and ATS-friendly analysis report "
        "with clear, actionable guidance.\n\n"
        
        "Data Rules:\n"
        "- Use ONLY the provided resume text and JD (or scraped JD content if a URL is given).\n"
        "- If a JD URL is provided, first call the scrape_website tool with that exact URL and wait for its result.\n"
        "- Do NOT invent skills, companies, or dates not present in the resume.\n"
        "- If JD is missing or very short (<200 chars), proceed and include an 'Assumptions' section.\n"
        "- Avoid bias (gender, age, ethnicity, personal photos, names).\n\n"
        
        "Scoring Rules:\n"
        "- Provide an integer Overall Match Score (0-100).\n"
        "- Provide a Confidence Level: Low / Medium / High.\n\n"
        
        "Output Format (strict Markdown):\n"
        "# Resume Analysis Report\n\n"

        "## 👤 Candidate Overview\n"
        "- Name: <Candidate Name>\n"
        "- Role Applied: <Job Title>\n"
        "- Experience Level: <Entry/Mid/Senior>\n"
        "- Industry/Domain: <Industry>\n\n"

        "## 📊 Overall Match Score: <number>%  \nConfidence: <Low|Medium|High>\n\n"
        
        "## ✅ Strengths\n"
        "- [resume snippet] Bullet (3-7 total)\n\n"
        
        "## 🔧 Areas for Improvement\n"
        "- [resume snippet] Bullet (3-7 total)\n\n"
        
        "## 📈 Skills & Keywords Analysis\n"
        "- Present in Resume: <list>\n"
        "- Missing (important for job): <list>\n"
        "- Soft Skills Coverage: <list>\n\n"
        
        "## 🗂️ Section-by-Section Feedback\n"
        "- Header: <feedback>\n"
        "- Summary/Profile: <feedback>\n"
        "- Work Experience: <feedback>\n"
        "- Education: <feedback>\n"
        "- Projects: <feedback>\n"
        "- Certifications: <feedback>\n\n"
        
        "## 🎯 Tailored Recommendations\n"
        "- Concise, actionable guidance (3-5 bullets)\n\n"
        
        "## 🧠 Assumptions (if JD weak or missing)\n"
        "- 1-3 bullets (only include if JD <200 chars or missing)\n\n"
        
        "## ✅ Final Verdict\n"
        "- Readiness for Target Role: <Strong Fit / Moderate Fit / Needs Major Revision>\n"
        "- Next Steps: <actionable advice>\n\n"
        
        "Formatting Constraints:\n"
        "- Use only Markdown headings and bullets (no tables, no code blocks).\n"
        "- Bullets ≤22 words each.\n"
        "- Each bullet must begin with a short [evidence snippet] (1-6 words) taken directly from the resume.\n"
        "- Keep tone professional, objective, and recruiter-style.\n"
    )

    agent = Agent(
        model=model,
        tools=[FirecrawlTools(scrape=True, crawl=False), DuckDuckGoTools()],
        instructions=system_prompt,
        debug_mode=False,
        show_tool_calls=False,
        reasoning=True,
        stream_intermediate_steps=True,
    )
    return agent


def craft_prompt(inputs: AgentInputs) -> str:
    parts: List[str] = []
    if inputs.custom_instructions:
        parts.append(f"Additional Instructions:\n{inputs.custom_instructions.strip()}\n")

    # Job info first for individual focus
    if inputs.job_title:
        parts.append(f"Job Title: {inputs.job_title.strip()}")
    if inputs.job_description_text:
        parts.append("Job Description (Provided):\n" + inputs.job_description_text.strip())
    if inputs.job_description_url:
        parts.append("Job Description URL (MUST call scrape_website with this exact URL before writing report):\n" + inputs.job_description_url.strip())
        parts.append("NOTE: Use scraped content as JD context.")

    if not inputs.job_description_text or len(inputs.job_description_text.strip()) < 200:
        if inputs.job_description_url:
            parts.append(
                "NOTE: A JD URL is provided. FIRST call the scrape_website tool, wait for its result, and use it as JD context."
            )
        else:
            parts.append(
                "NOTE: JD text is missing/short. Proceed with resume analysis and include an 'Assumptions' section."
            )

    parts.append("Candidate Resume (Extracted Text):\n" + inputs.resume_text.strip())

    # Output enforcement
    parts.append(
        "You MUST produce the report strictly in Markdown, "
        "following the 'Resume Analysis Report' structure defined in the system prompt."
    )

    if REF_LINKS:
        parts.append("Reference Links (may scrape if relevant):\n" + "\n".join(f"- {u}" for u in REF_LINKS))

    # Final reminder
    parts.append(
        "Final Reminder: Do not output anything except the structured 'Resume Analysis Report' "
        "in Markdown format. No explanations, no extra text."
    )

    return "\n\n".join(parts)


def run_individual_analysis(inputs: AgentInputs, agent: Optional[Agent] = None) -> str:
    agent = agent or build_agent()
    prompt = craft_prompt(inputs)
    result: RunResponse = agent.run(prompt)
    try:
        pprint_run_response(result, markdown=True)
    except Exception:
        pass
    text = result.content.strip() if result and result.content else ""
    if not text:
        return REPORT_TEMPLATE.format(
            overall_score=0,
            strengths=FALLBACK_ITEM,
            improvements=FALLBACK_ITEM,
            recommendations=FALLBACK_ITEM,
            competency=FALLBACK_ITEM,
        )
    return text
