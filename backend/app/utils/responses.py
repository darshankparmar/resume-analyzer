from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any


def error_response(code: str, message: str, details: Optional[Dict[str, Any]] = None, status_code: int = 400) -> JSONResponse:
    payload = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        },
    }
    return JSONResponse(content=payload, status_code=status_code)


def error_message_from_json_response(resp: JSONResponse) -> str:
    try:
        if isinstance(resp, JSONResponse):
            body = resp.body.decode() if isinstance(resp.body, (bytes, bytearray)) else resp.body
            import json
            data = json.loads(body)
            return data.get("error", {}).get("message") or "Validation failed"
    except Exception:
        pass
    return "Validation failed"
