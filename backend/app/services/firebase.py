import logging
import os
from typing import Optional

import firebase_admin
from firebase_admin import credentials, firestore


def init_firebase() -> None:
    """Initialize Firebase Admin SDK if not already initialized."""
    try:
        firebase_admin.get_app()
        return
    except ValueError:
        # Not initialized yet
        pass

    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    project_id = os.getenv("FIREBASE_PROJECT_ID")

    try:
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
        else:
            # Fallback to Application Default Credentials
            cred = credentials.ApplicationDefault()

        options = {"projectId": project_id} if project_id else None
        firebase_admin.initialize_app(cred, options)
    except Exception:
        logging.exception("Failed to initialize Firebase Admin SDK")
        raise


def get_firestore():
    """Get a Firestore client, ensuring Firebase is initialized."""
    init_firebase()
    return firestore.client()
