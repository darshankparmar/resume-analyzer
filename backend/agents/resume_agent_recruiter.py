"""
Agent for HR recruiters (batch or single). Emphasizes quick screening, consistency, and score extraction.
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
    hr_questions: Optional[List[str]] = None


def build_agent() -> Agent:
    provider = (os.getenv("AI_PROVIDER") or os.getenv("MODEL_PROVIDER") or "gemini").strip().lower()
    if provider == "openai":
        openai_model_id = os.getenv("OPENAI_MODEL") or "gpt-5-mini"
        try:
            try:
                from agno.models.openai import OpenAIChat as OpenAIModel  # type: ignore
            except Exception:
                from agno.models.openai import OpenAI as OpenAIModel  # type: ignore
            model = OpenAIModel(id=openai_model_id, temperature=0.1)
        except Exception:
            model = Gemini(id=os.getenv("GEMINI_MODEL") or "gemini-1.5-flash", temperature=0.1, max_output_tokens=1600)
    else:
        model = Gemini(id=os.getenv("GEMINI_MODEL") or "gemini-1.5-flash", temperature=0.1, max_output_tokens=1600)

    system_prompt = (
        "You are an AI Resume Analyst. "
        "Analyze the provided resume text against the provided job title and job description (JD) "
        "and generate a structured Markdown report that recruiters can read and act on.\n\n"

        "Data rules:\n"
        "- Use ONLY the provided resume text and JD (or scraped JD content if a URL is given).\n"
        "- If a JD URL is provided, first call the scrape_website tool with that exact URL and wait for its result; "
        "use the returned content as the JD context.\n"
        "- Do NOT invent skills, companies, dates, or experiences not present in the resume.\n"
        "- If JD is missing or very short (<200 chars), proceed but add an 'Assumptions' section describing what you assumed.\n"
        "- Avoid bias: do NOT consider gender, age, ethnicity, name, or photos when scoring or recommending.\n\n"

        "HR Focus priority:\n"
        "- If 'HR Focus/Questions' are provided (see Additional Instructions), treat them as the PRIMARY evaluation criteria.\n"
        "- Address each focus item explicitly across Strengths, Areas for Improvement, Recommendations, and Competency sections where applicable.\n"
        "- Consider the JD as secondary context only after addressing HR Focus requirements.\n\n"

        "Scoring rules:\n"
        "- Provide an integer Overall Match Score 0–100 (no decimals) and a Confidence level (Low/Medium/High).\n"
        "- Follow this rubric: 90–100 Excellent; 75–89 Good; 60–74 Partial; 40–59 Weak; 0–39 Very poor.\n"
        "- Base the score on concrete evidence in the resume vs. role requirements. When using subjective judgement, state it.\n\n"

        "Output format (strict Markdown, no code fences, no tables):\n"
        "# Resume Analysis Report\n\n"
        "## 📊 Overall Match Score: <number>%  \n"
        "Confidence: <Low|Medium|High>\n\n"
        "## ✅ Strengths (Matched with JD)\n"
        "- [Short evidence snippet] Bullet (≤22 words)\n"
        "- [snippet] Bullet\n"
        "- 3–7 bullets total\n\n"
        "## 🔧 Areas for Improvement\n"
        "- [snippet] Bullet (≤22 words)\n"
        "- 3–7 bullets total\n\n"
        "## ❓ HR Q&A (INCLUDE THIS SECTION IF HR Questions are provided)\n"
        "- Q: <question>\n"
        "- A: [evidence snippet] concise answer ≤22 words (or 'Insufficient evidence')\n\n"
        "## 🎯 Recommendations\n"
        "- 3–5 concise, actionable bullets (≤22 words each)\n\n"
        "## 📈 Competency Analysis\n"
        "- Skill: Short assessment (evidence snippet)\n"
        "- 3–6 bullets total\n\n"
        "## ⚠️ Red Flags (if any)\n"
        "- One-line bullets with evidence (e.g., long employment gap: 2019–2022)\n\n"
        "## 🧠 Assumptions (if JD weak or missing)\n"
        "- 1–3 bullets explaining any assumptions made\n\n"

        "Formatting constraints:\n"
        "- Use the exact section headings and order shown above.\n"
        "- Include one short evidence snippet in square brackets at the start of each bullet (1–6 words taken from the resume).\n"
        "- Each bullet ≤22 words. No sub-bullets, no tables, no code blocks.\n"
        "- If any rule cannot be followed (e.g., evidence not present), state that explicitly in the 'Assumptions' section.\n"
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
        
    # Emphasize prioritization of HR Focus when present in Additional Instructions
    parts.append(
        "Priority directive:\n"
        "- If 'HR Focus/Questions' appear in Additional Instructions above, EVALUATE THE RESUME AGAINST THEM FIRST.\n"
        "- Use Job Description (JD) as secondary context after HR Focus has been covered.\n"
    )

    # HR Questions (if provided)
    if inputs.hr_questions:
        q_list = [q.strip() for q in inputs.hr_questions if isinstance(q, str) and q.strip()]
        if q_list:
            parts.append(
                "HR Questions (answer each concisely; if unknown, state 'Insufficient evidence').\n"
                "You MUST include the section '## ❓ HR Q&A' with one Q and one A per question.\n" +
                "\n".join(f"- {q}" for q in q_list)
            )

    parts.append(f"Job Title: {inputs.job_title.strip() if inputs.job_title else ''}")
    if inputs.job_description_text:
        parts.append("Job Description (Provided):\n" + inputs.job_description_text.strip())
    if inputs.job_description_url:
        parts.append("Job Description URL:\n" + inputs.job_description_url.strip())

    if not inputs.job_description_text or len(inputs.job_description_text.strip()) < 200:
        if inputs.job_description_url:
            parts.append("NOTE: FIRST scrape the JD URL using scrape_website and use its content as JD context.")
        else:
            parts.append("NOTE: JD weak/missing — include an 'Assumptions' section.")

    parts.append("Candidate Resume (Extracted Text):\n" + inputs.resume_text.strip())

    parts.append("Output strictly as Markdown using specified headings and constraints for quick HR screening.")
    
    if REF_LINKS:
        parts.append("Reference Links (you may scrape):\n" + "\n".join(f"- {u}" for u in REF_LINKS))
    
    return "\n\n".join(parts)


def run_recruiter_analysis(inputs: AgentInputs, agent: Optional[Agent] = None) -> str:
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
