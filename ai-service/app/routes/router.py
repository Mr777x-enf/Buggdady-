from fastapi import APIRouter

from app.routes.chat import router as chat_router
from app.routes.ingest import router as ingest_router


router = APIRouter()

router.include_router(
    chat_router,
    prefix="/chat",
    tags=["Chat"]
)

router.include_router(
    ingest_router,
    prefix="/ingest",
    tags=["Ingestion"]
)