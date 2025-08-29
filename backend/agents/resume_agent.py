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

    model = Gemini(id="gemini-1.5-flash")

    web_search = FirecrawlTools(scrape=True, crawl=False)

    system_prompt = (
        "You are an expert resume analyst. Analyze the candidate's resume against the job title "
        "and job description (from provided text and/or link). Output a concise, professional "
        "Markdown report. Avoid hallucinations; cite only from input resume/JD context. "
        "When the JD is weak or missing, make reasonable assumptions and clearly label them. "
        "Aim for actionable recommendations. Keep the tone supportive and specific."
    )

    agent = Agent(
        model=model,
        tools=[web_search],
        instructions=system_prompt,
        markdown=True,
        debug_mode=True
    )
    return agent


def _format_sections(items: List[str]) -> str:
    if not items:
        return "- No notable points identified."
    return "\n".join(f"- {i}" for i in items)


def craft_prompt(inputs: AgentInputs) -> str:
    parts: List[str] = []
    if inputs.custom_instructions:
        parts.append(f"Additional Instructions:\n{inputs.custom_instructions}\n")

    parts.append(f"Job Title: {inputs.job_title}")

    if inputs.job_description_text:
        parts.append("Job Description (Provided):\n" + inputs.job_description_text)
    if inputs.job_description_url:
        parts.append("You can also scrape all content of Job Description from this URL: " + inputs.job_description_url)

    parts.append("Candidate Resume (Extracted Text):\n" + inputs.resume_text)

    parts.append(
        """
Task:
1) Assess overall match score (0-100) between the resume and the role.
2) List 3-7 specific strengths.
3) List 3-7 actionable improvement areas.
4) Provide 3-5 concise recommendations tailored to the role.
5) Provide a competency analysis mapping core skills to role requirements.

Output strictly as Markdown following this structure and nothing else:

# Resume Analysis Report

## 📊 Overall Match Score: <percent>%

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

    # If a JD URL is provided, allow the agent's DuckDuckGo search tool to fetch context.
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
