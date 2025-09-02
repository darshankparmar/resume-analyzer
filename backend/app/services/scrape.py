from typing import Optional
import os
import re


def _strip_html_tags(html: str) -> str:
    try:
        html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.IGNORECASE)
        html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text)
        return text.strip()
    except Exception:
        return ""


def _tidy_text(text: str, max_len: int = 15000) -> str:
    t = (text or "").strip()
    if len(t) > max_len:
        t = t[:max_len]
    return t


def scrape_job_description(url: str) -> Optional[str]:
    if not url:
        return None
    try:
        api_key = os.getenv("FIRECRAWL_API_KEY")
        if api_key:
            try:
                from firecrawl import Firecrawl  # type: ignore
                client = Firecrawl(api_key=api_key)
                data = None
                try:
                    data = client.scrape_url(url)  # type: ignore[attr-defined]
                except Exception:
                    try:
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

    try:
        import urllib.request

        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = resp.read()
            html = raw.decode("utf-8", errors="ignore")
            return _tidy_text(_strip_html_tags(html))
    except Exception:
        return None
