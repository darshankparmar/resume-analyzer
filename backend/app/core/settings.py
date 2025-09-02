from typing import List
import os


MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10MB
HR_BATCH_MAX_FILE_SIZE_BYTES: int = 2 * 1024 * 1024  # 2MB for HR batch uploads
HR_BATCH_MAX_FILES: int = 10


def get_allowed_origins() -> List[str]:
    origins = []
    # Allow injection via env var (comma-separated)
    extra = os.getenv("ALLOWED_ORIGINS", "").strip()
    if extra:
        origins.extend([o.strip() for o in extra.split(",") if o.strip()])
    # Deduplicate
    return sorted(set(origins))
