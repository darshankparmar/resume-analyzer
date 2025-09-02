from typing import Optional
import re


def parse_score_from_markdown(md: Optional[str]) -> Optional[int]:
    if not md:
        return None
    text = " ".join(md.split())
    patterns = [
        r"overall\s+match\s+score\s*[:\-]\s*(\d{1,3})%",
        r"match\s+score\s*[:\-]\s*(\d{1,3})%",
        r"(\d{1,3})%\s*(?:overall\s+)?match",
    ]
    for p in patterns:
        m = re.search(p, text, flags=re.IGNORECASE)
        if m:
            try:
                val = int(m.group(1))
                if 0 <= val <= 100:
                    return val
            except Exception:
                pass
    return None
