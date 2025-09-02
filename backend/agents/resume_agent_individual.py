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
            model = Gemini(id=os.getenv("GEMINI_MODEL") or "gemini-1.5-flash", temperature=0.2, max_output_tokens=2000)
    else:
        model = Gemini(id=os.getenv("GEMINI_MODEL") or "gemini-1.5-flash", temperature=0.2, max_output_tokens=2000)

    system_prompt = (
        "You are an AI Resume Coach for individual job seekers. "
        "Analyze the resume against the target role and provide clear, actionable guidance to improve the candidate's chances.\n\n"
        "Data rules:\n"
        "- Use ONLY the provided resume text and JD (or scraped JD content if a URL is given).\n"
        "- If a JD URL is provided, first call the scrape_website tool with that exact URL and wait for its result.\n"
        "- Do NOT invent skills/companies/dates not present in the resume.\n"
        "- If JD is missing or very short (<200 chars), proceed and include an 'Assumptions' section.\n"
        "- Avoid bias (gender/age/ethnicity/name/photos).\n\n"
        "Scoring rules:\n"
        "- Provide an integer Overall Match Score 0–100 and a Confidence level (Low/Medium/High).\n\n"
        "Output format (strict Markdown):\n"
        "# Resume Analysis Report\n\n"
        "## 📊 Overall Match Score: <number>%  \nConfidence: <Low|Medium|High>\n\n"
        "## ✅ Strengths (Matched with JD)\n- [snippet] Bullet (3–7)\n\n"
        "## 🔧 Areas for Improvement\n- [snippet] Bullet (3–7)\n\n"
        "## 🎯 Recommendations\n- Concise, actionable (3–5)\n\n"
        "## 📈 Competency Analysis\n- Skill: short assessment (3–6)\n\n"
        "## ⚠️ Red Flags (if any)\n- One-line bullets\n\n"
        "## 🧠 Assumptions (if JD weak or missing)\n- 1–3 bullets\n\n"
        "Formatting constraints: bullets ≤22 words, each starts with [evidence snippet] 1–6 words from resume; no tables, no code blocks."
    )

    agent = Agent(
        model=model,
        tools=[FirecrawlTools(scrape=True, crawl=False), DuckDuckGoTools()],
        instructions=system_prompt,
        debug_mode=True,
        show_tool_calls=True,
        reasoning=True,
        stream_intermediate_steps=True,
    )
    return agent


def craft_prompt(inputs: AgentInputs) -> str:
    parts: List[str] = []
    if inputs.custom_instructions:
        parts.append(f"Additional Instructions:\n{inputs.custom_instructions.strip()}\n")

    # Job info first for individual focus
    parts.append(f"Job Title: {inputs.job_title.strip() if inputs.job_title else ''}")
    if inputs.job_description_text:
        parts.append("Job Description (Provided):\n" + inputs.job_description_text.strip())
    if inputs.job_description_url:
        parts.append("Job Description URL (MUST scrape before writing the report):\n" + inputs.job_description_url.strip())

    if not inputs.job_description_text or len(inputs.job_description_text.strip()) < 200:
        if inputs.job_description_url:
            parts.append(
                "NOTE: A JD URL is provided. FIRST call the scrape_website tool, wait for its result, and use it as JD context."
            )
        else:
            parts.append(
                "NOTE: JD text is missing/short. Include an 'Assumptions' section listing assumptions made."
            )

    parts.append("Candidate Resume (Extracted Text):\n" + inputs.resume_text.strip())

    # Strict output reminder
    parts.append(
        (
            "Output strictly as Markdown using the specified headings and constraints."
        )
    )

    if REF_LINKS:
        parts.append("Reference Links (you may scrape):\n" + "\n".join(f"- {u}" for u in REF_LINKS))

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
