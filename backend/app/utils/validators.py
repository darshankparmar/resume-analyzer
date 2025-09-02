from typing import Optional
from urllib.parse import urlparse


def is_valid_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        return all([parsed.scheme in ("http", "https"), parsed.netloc])
    except Exception:
        return False


def is_valid_pdf(mimetype: Optional[str], content: bytes) -> bool:
    if mimetype != "application/pdf":
        return False
    return content.startswith(b"%PDF")
