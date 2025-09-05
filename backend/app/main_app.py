from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.settings import get_allowed_origins
from app.api.routes_individual import router as individual_router
from app.api.routes_batch import router as batch_router
from app.api.auth import router as auth_router

def create_app() -> FastAPI:
    app = FastAPI(title="Resume Analyzer Backend", version="1.0.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "HEAD", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    app.include_router(individual_router)
    app.include_router(batch_router)
    app.include_router(auth_router)

    @app.get("/")
    @app.head("/")
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
