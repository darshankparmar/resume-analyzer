import os
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from app.services.firebase import get_firestore

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
if not CLIENT_ID:
    raise RuntimeError("GOOGLE_CLIENT_ID environment variable not set.")

class TokenRequest(BaseModel):
    token: str

@router.post("/google")
async def google_auth(req: TokenRequest):
    try:
        # Verify Google ID token
        idinfo = id_token.verify_oauth2_token(req.token, requests.Request(), CLIENT_ID)

        # Extract user info
        user_id = idinfo["sub"]       # Unique Google user ID
        email = idinfo["email"]
        name = idinfo.get("name", "")
        picture = idinfo.get("picture", "")

        # Attempt to upsert user in Firestore; bypass failures
        try:
            db = get_firestore()
            users_ref = db.collection("users").document(user_id)
            users_ref.set(
                {
                    "id": user_id,
                    "email": email,
                    "name": name,
                    "picture": picture,
                    "provider": "google",
                },
                merge=True,
            )
        except Exception:
            logging.exception("Failed to upsert user in Firestore; continuing with auth response")

        # Return user info in { user: { ... } } structure for frontend
        return {"user": {"id": user_id, "email": email, "name": name, "picture": picture}}

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")
