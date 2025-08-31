"""
Gemini-powered resume analysis agent using agno.

Inputs:
- resume_text: str (required)
- job_title: str (required)
- job_description_text: Optional[str]
- job_description_url: Optional[str]

Capabilities:
- If job_description_url is provided (or only job_title), uses web search tool to fetch JD context.
- Combines instructions + resume + JD to generate a Markdown report.

Note: This agent focuses on prompt design and orchestration.
Core PDF parsing and validation remain in FastAPI layer.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Dict, Any, List
import os

# agno core
try:
    from agno.agent import Agent, RunResponse
    from agno.models.google import Gemini
    from agno.utils.pprint import pprint_run_response
    from agno.tools.firecrawl import FirecrawlTools
    from agno.tools.duckduckgo import DuckDuckGoTools
    from agno.tools.reasoning import ReasoningTools  
except Exception as e:  # pragma: no cover
    # Provide helpful message if agno is missing
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

# Helpful reference links the agent may consult to improve guidance and wording
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


def build_resume_agent() -> Agent:
    """Construct an agent with web search, using provider from env (Gemini or OpenAI)."""

    provider = (os.getenv("AI_PROVIDER") or os.getenv("MODEL_PROVIDER") or "gemini").strip().lower()
    model = None
    if provider == "openai":
        # Prefer OpenAI reasoning models (e.g., gpt-5-mini). Fallback to standard if unavailable.
        openai_model_id = os.getenv("OPENAI_MODEL") or "gpt-5-mini"
        try:
            # agno >=0.4 likely exposes OpenAI via this path; try common options safely.
            try:
                from agno.models.openai import OpenAIChat as OpenAIModel  # type: ignore
            except Exception:
                from agno.models.openai import OpenAI as OpenAIModel  # type: ignore
            model = OpenAIModel(id=openai_model_id, temperature=0.2)
        except Exception:
            # If OpenAI path not available, fall back to Gemini to keep service running.
            model = Gemini(id=os.getenv("GEMINI_MODEL") or "gemini-1.5-flash", temperature=0.2, max_output_tokens=1200)
    else:
        # Default Gemini
        model = Gemini(id=os.getenv("GEMINI_MODEL") or "gemini-1.5-flash", temperature=0.2, max_output_tokens=1200)

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
        tools=[
            ReasoningTools(  
                think=True,  
                analyze=True,  
                add_instructions=True,  
            ),  
            FirecrawlTools(scrape=True, crawl=False), 
            DuckDuckGoTools()
        ],
        instructions=system_prompt,
        debug_mode=True,
        show_tool_calls=True,
        reasoning=True,  
        stream_intermediate_steps=True  
    )
    return agent


def craft_prompt(inputs: AgentInputs) -> str:
    """
    Build the user/prompt string sent to the model for each analysis call.
    This prompt must be used together with a strict system prompt (the agent's system message)
    and model settings: temperature 0.0-0.2, max_tokens ~900-1200.
    """
    parts: List[str] = []

    # Optional extra instructions supplied at runtime (kept first)
    if inputs.custom_instructions:
        parts.append(f"Additional Instructions:\n{inputs.custom_instructions.strip()}\n")

    # Emphasize prioritization of HR Focus when present in Additional Instructions
    parts.append(
        "Priority directive:\n"
        "- If 'HR Focus/Questions' appear in Additional Instructions above, EVALUATE THE RESUME AGAINST THEM FIRST.\n"
        "- Use Job Description (JD) as secondary context after HR Focus has been covered.\n"
    )

    # Job info
    parts.append(f"Job Title: {inputs.job_title.strip() if inputs.job_title else ''}")

    if inputs.job_description_text:
        parts.append("Job Description (Provided):\n" + inputs.job_description_text.strip())
    if inputs.job_description_url:
        parts.append("Job Description URL (MUST scrape before writing the report):\n" + inputs.job_description_url.strip())

    # Enforce scraping behavior / assumptions guidance
    if not inputs.job_description_text or len(inputs.job_description_text.strip()) < 200:
        if inputs.job_description_url:
            parts.append(
                "NOTE: A JD URL is provided. You MUST first call the scrape_website tool with that exact URL, "
                "wait for the tool result, and use the returned content as the primary JD context before composing the report."
            )
        else:
            parts.append(
                "NOTE: JD text is missing or very short and no URL is provided. Proceed with available text, "
                "but you MUST include an 'Assumptions' section that clearly lists any assumptions made."
            )

    # Candidate resume
    parts.append("Candidate Resume (Extracted Text):\n" + inputs.resume_text.strip())

    # The core task and strict output rules (updated)
    parts.append(
        (
            "Task:\n"
            "- If a Job Description URL is present above, FIRST call the scrape_website tool with that exact URL and use its result as JD context.\n"
            "- Analyze the resume against the role using ONLY the provided context (resume text + provided JD text or scraped JD when applicable).\n"
            "- PRIORITIZE any 'HR Focus/Questions' provided over general JD requirements; explicitly map bullets to these focus areas where relevant.\n"
            "- Do NOT invent skills, companies, dates, or experiences not present in the resume. If evidence is missing, state this in 'Assumptions'.\n"
            "- Be evidence-based: for every Strength/Gap/Competency bullet include a 1–6 word evidence snippet taken from the resume in square brackets at the start of the bullet.\n"
            "- Assign an integer Overall Match Score (0–100) per rubric and include a Confidence (Low|Medium|High).\n"
            "- Follow the exact Markdown headings, order, and formatting rules below. Output ONLY Markdown (no code fences, no tables, no sub-bullets).\n\n"
            "Strict output format (use exactly these headings and order):\n\n"
            "# Resume Analysis Report\n\n"
            "## 📊 Overall Match Score: <number>%  \n"
            "Confidence: <Low|Medium|High>\n\n"
            "## ✅ Strengths (Matched with JD)\n"
            "- [evidence snippet] One concise bullet ≤22 words (3–7 bullets total)\n\n"
            "## 🔧 Areas for Improvement\n"
            "- [evidence snippet] One concise bullet ≤22 words (3–7 bullets total)\n\n"
            "## 🎯 Recommendations\n"
            "- One concise, actionable bullet ≤22 words (3–5 bullets total)\n\n"
            "## 📈 Competency Analysis\n"
            "- Skill/Competency: Short assessment (evidence snippet). Provide 3–6 bullets.\n\n"
            "## ⚠️ Red Flags (if any)\n"
            "- One-line bullets with direct evidence (e.g., 'Employment gap 2019–2021') or 'None' if not present.\n\n"
            "## 🧠 Assumptions (if JD weak or missing)\n"
            "- 1–3 bullets describing any assumption(s) used while scoring.\n\n"
            "Formatting constraints:\n"
            "- Each bullet MUST start with a square-bracket evidence snippet of 1–6 words taken from the resume (e.g., '[Python 6 yrs]').\n"
            "- Each bullet MUST be ≤22 words. No sub-bullets, no tables, no code blocks.\n"
            "- Strengths and Areas for Improvement must each contain 3–7 bullets. Recommendations 3–5 bullets. Competency Analysis 3–6 bullets.\n"
            "- If any rule cannot be followed, explicitly state why in the 'Assumptions' section.\n\n"
            "When composing text, keep tone professional, concise, and HR-friendly. Do NOT consider gender, age, ethnicity, name, or photos when scoring or recommending.\n"
        )
    )

    # Helpful references (optional external links to consult/scrape)
    if globals().get("REF_LINKS"):
        parts.append("Reference Links (you may scrape if helpful):\n" + "\n".join(f"- {u}" for u in REF_LINKS))

    return "\n\n".join(parts)


def run_resume_analysis(
    inputs: AgentInputs,
    agent: Optional[Agent] = None,
) -> str:
    """Run the resume analysis agent and return a Markdown report string."""
    agent = agent or build_resume_agent()

    prompt = craft_prompt(inputs)

    # If a JD URL is provided, Firecrawl can be used to fetch context.
    # The agno framework will decide if/when to call tools based on the prompt.
    result: RunResponse = agent.run(prompt)
    
    pprint_run_response(result, markdown=True)

    # Ensure output is non-empty and resembles the template headings
    text = result.content.strip() if result and result.content else ""
    if not text:
        # Fallback: Provide a minimal skeleton to avoid empty responses
        return REPORT_TEMPLATE.format(
            overall_score=0,
            strengths=FALLBACK_ITEM,
            improvements=FALLBACK_ITEM,
            recommendations=FALLBACK_ITEM,
            competency=FALLBACK_ITEM,
        )

    return text
