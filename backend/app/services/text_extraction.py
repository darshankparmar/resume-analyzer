from io import BytesIO
from typing import Optional


def extract_text_pypdf(data: bytes) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(BytesIO(data))
        try:
            if getattr(reader, "is_encrypted", False):
                reader.decrypt("")
        except Exception:
            pass

        text_parts = []
        for page in getattr(reader, "pages", []):
            try:
                txt = page.extract_text() or ""
            except Exception:
                txt = ""
            if txt:
                text_parts.append(txt)
        return "\n".join(text_parts).strip()
    except Exception:
        return ""


def extract_text_ocr_optional(data: bytes) -> Optional[str]:
    try:
        import os
        from pdf2image import convert_from_bytes
        import pytesseract

        poppler_path = os.getenv("POPPLER_PATH")
        images = convert_from_bytes(data, fmt="png", poppler_path=poppler_path)
        texts = []
        for img in images:
            try:
                t = pytesseract.image_to_string(img)
            except Exception:
                t = ""
            if t and t.strip():
                texts.append(t.strip())
        combined = "\n".join(texts).strip()
        return combined or None
    except Exception:
        return None
