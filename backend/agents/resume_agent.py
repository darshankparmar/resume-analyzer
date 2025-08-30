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
except Exception as e:  # pragma: no cover
    # Provide helpful message if agno is missing
    raise ImportError(
        "Required package 'agno' not found. Install with: pip install agno google-genai firecrawl-py"
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


@dataclass
class AgentInputs:
    resume_text: str
    job_title: str
    job_description_text: Optional[str] = None
    job_description_url: Optional[str] = None
    custom_instructions: Optional[str] = None


def build_resume_agent() -> Agent:
    """Construct a Gemini model agent with web search capability."""

    model = Gemini(id="gemini-1.5-flash", temperature=0.2)

    web_search = FirecrawlTools(scrape=True, crawl=False)

    system_prompt = (
        "You are an expert resume analyst. Analyze the candidate's resume against the job title "
        "and job description (from provided text and/or link). Your goal is to produce a concise, "
        "actionable, and strictly formatted Markdown report that our system can reliably parse.\n\n"

    "Quality and grounding:\n"
    "- Use ONLY the provided resume text and job description (text or scraped from the given URL).\n"
    "- When a Job Description URL is provided, you MUST first call the scrape_website tool with that exact URL,\n"
    "  wait for the tool result, and use the returned content as the primary JD context before writing the report.\n"
    "- If there is no JD URL and the JD text is weak (< 200 chars), do not call tools; proceed using the provided text only.\n"
        "- Do not invent skills or experiences that are not supported by the resume.\n"
        "- If JD is missing or very weak, make reasonable assumptions and label them explicitly as assumptions.\n"
        "- Keep tone professional, supportive, and specific. No marketing fluff.\n\n"

        "Scoring rubric (0-100, integer, no decimals):\n"
        "- 90-100: Exceptional alignment with most key requirements; strong direct evidence in resume.\n"
        "- 75-89: Good alignment; several strong matches, some gaps.\n"
        "- 60-74: Partial alignment; multiple gaps or limited evidence.\n"
        "- 40-59: Weak alignment; few relevant skills/experience.\n"
        "- 0-39: Very poor alignment.\n"
        "Base the score on role requirements vs. resume evidence. Round to a whole number.\n\n"

        "Output format requirements (strict):\n"
        "- Output ONLY Markdown with the following exact section headings and order.\n"
        "- The score line MUST be exactly: '## 📊 Overall Match Score: <number>%'.\n"
        "- Each bullet: one concise sentence (≤ 22 words), action-oriented, no sub-bullets.\n"
        "- Provide 3-7 bullets for Strengths and Improvement areas; 3-5 for Recommendations.\n"
        "- Do not include code fences, tables, or extra sections.\n\n"

        "Structure to follow:\n"
        "# Resume Analysis Report\n\n"
        "## 📊 Overall Match Score: <number>%\n\n"
        "## ✅ Strengths\n"
        "- ...\n\n"
        "## 🔧 Areas for Improvement\n"
        "- ...\n\n"
        "## 🎯 Recommendations\n"
        "- ...\n\n"
        "## 📈 Competency Analysis\n"
        "- Skill/Competency: Assessment & Evidence\n"
    )

    agent = Agent(
        model=model,
        tools=[web_search],
        instructions=system_prompt,
        markdown=True,
        debug_mode=False,
        show_tool_calls=False
    )
    return agent


def craft_prompt(inputs: AgentInputs) -> str:
    parts: List[str] = []
    if inputs.custom_instructions:
        parts.append(f"Additional Instructions:\n{inputs.custom_instructions}\n")

    parts.append(f"Job Title: {inputs.job_title}")

    if inputs.job_description_text:
        parts.append("Job Description (Provided):\n" + inputs.job_description_text)
    if inputs.job_description_url:
        parts.append("Job Description URL (MUST scrape before writing the report):\n" + inputs.job_description_url)

    # If JD text is missing or short, enforce scraping when URL is present
    if not inputs.job_description_text or len(inputs.job_description_text) < 200:
        if inputs.job_description_url:
            parts.append("Note: A JD URL is provided; you MUST call scrape_website with that URL first, then synthesize the report.")
        else:
            parts.append("Note: JD text is missing or short and no URL provided; proceed with available text and explicitly label assumptions.")

    parts.append("Candidate Resume (Extracted Text):\n" + inputs.resume_text)

    parts.append(
        """
Task:
- If a Job Description URL is present above, FIRST call the scrape_website tool with that exact URL and use its result as JD context.
- Analyze the resume against the role using only provided context (and scraped JD when applicable).
- Assign an integer score (0-100) per rubric. Be evidence-based, concise, and actionable.
- Provide clear bullets within the requested counts.

Output strictly as Markdown with the exact headings and order below and nothing else:

# Resume Analysis Report

## 📊 Overall Match Score: <number>%

## ✅ Strengths
- ...

## 🔧 Areas for Improvement
- ...

## 🎯 Recommendations
- ...

## 📈 Competency Analysis
- Skill/Competency: Assessment & Evidence
        """.strip()
    )

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
