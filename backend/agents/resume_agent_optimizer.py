"""
Agent for resume optimization. Rewrites a candidate's resume to maximize ATS/job fit.
Outputs strictly in rxresu.me JSON format.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, List
import os
import json
import re

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


# ---------- Schema Loader ----------
def _load_rxresume_schema_template() -> Optional[str]:
    """Load the bundled rxresu.me template JSON as a string to show the model the exact structure."""
    try:
        here = os.path.dirname(__file__)
        schema_path = os.path.abspath(os.path.join(here, "..", "schemas", "rxresume", "reactive_resume.json"))
        with open(schema_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return None


@dataclass
class AgentInputs:
    resume_text: str
    job_title: str
    job_description_text: Optional[str] = None
    job_description_url: Optional[str] = None
    custom_instructions: Optional[str] = None


def build_optimizer_agent() -> Agent:
    provider = (os.getenv("AI_PROVIDER") or os.getenv("MODEL_PROVIDER") or "gemini").strip().lower()
    if provider == "openai":
        openai_model_id = os.getenv("OPENAI_MODEL") or "gpt-5-mini"
        try:
            try:
                from agno.models.openai import OpenAIChat as OpenAIModel  # type: ignore
            except Exception:
                from agno.models.openai import OpenAI as OpenAIModel  # type: ignore
            model = OpenAIModel(id=openai_model_id, temperature=0.4)
        except Exception:
            model = Gemini(
                id=os.getenv("GEMINI_MODEL") or "gemini-1.5-pro",
                temperature=0.4,
                max_output_tokens=5000,
            )
    else:
        model = Gemini(
            id=os.getenv("GEMINI_MODEL") or "gemini-1.5-pro",
            temperature=0.4,
            max_output_tokens=5000,
        )

    # Load schema example
    schema_template = _load_rxresume_schema_template() or "{}"

    system_prompt = (
        "You are an AI Resume Optimizer for job seekers. "
        "Your role is to rewrite the candidate’s resume to maximize their chance of shortlisting "
        "for the target job description (JD). Optimize wording, achievements, skills, and alignment "
        "with the JD.\n\n"

        "Output Rules:\n"
        "- STRICTLY output JSON only, matching the rxresu.me schema structure shown below.\n"
        "- Do NOT output any explanations, markdown, or text outside JSON.\n"
        "- Always preserve schema keys and nesting.\n"
        "- Fill in values with optimized, ATS-friendly, keyword-rich content aligned with JD.\n"
        "- You can add fake skills, experiences, projects, and other professional details, "
        "but NEVER alter or generate fake personal information (name, email, phone, address).\n\n"

        "Schema Example (for structure ONLY, values will change):\n"
        f"{schema_template}\n"
    )

    return Agent(
        model=model,
        tools=[FirecrawlTools(scrape=True, crawl=False), DuckDuckGoTools(news=False)],
        instructions=system_prompt,
        debug_mode=False,
        show_tool_calls=False,
        reasoning=True,
        stream_intermediate_steps=True,
        reasoning_max_steps=3,
    )


def craft_optimizer_prompt(inputs: AgentInputs) -> str:
    parts: List[str] = []

    if inputs.custom_instructions:
        parts.append(f"Additional Optimization Instructions:\n{inputs.custom_instructions.strip()}\n")

    if inputs.job_title:
        parts.append(f"Target Job Title: {inputs.job_title.strip()}")

    if inputs.job_description_text and len(inputs.job_description_text.strip()) >= 200:
        parts.append("Job Description (Provided):\n" + inputs.job_description_text.strip())
    elif inputs.job_description_url:
        parts.append("Job Description URL (MUST call scrape_website with this URL before optimization):\n" + inputs.job_description_url.strip())
        parts.append("NOTE: Use scraped content as JD context.")
    else:
        parts.append("NOTE: JD is missing/short. Optimize resume with general best practices for ATS and job fit.")

    parts.append("Candidate Resume (Extracted Text):\n" + inputs.resume_text.strip())

    # Final enforcement
    parts.append("Final Reminder: Output must be VALID JSON ONLY in rxresu.me schema format. No extra text.")

    return "\n\n".join(parts)


def run_resume_optimization(inputs: AgentInputs, agent: Optional[Agent] = None) -> str:
    agent = agent or build_optimizer_agent()
    prompt = craft_optimizer_prompt(inputs)
    result: RunResponse = agent.run(prompt, format="json")
    try:
        pprint_run_response(result, markdown=True)
    except Exception:
        pass
    text = result.content.strip() if result and result.content else "{}"

    # Remove markdown code fences if present
    if text.startswith("```"):
        # Remove ```json or ``` and ending ```
        text = re.sub(r"^```(?:json)?\n?", "", text)
        text = re.sub(r"\n?```$", "", text)

    # Ensure JSON validity
    try:
        json.loads(text)
    except Exception:
        raise ValueError("Model did not return valid JSON output")

    return text
