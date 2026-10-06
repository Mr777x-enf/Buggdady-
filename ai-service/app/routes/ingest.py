from fastapi import APIRouter
from pydantic import BaseModel, HttpUrl

from app.services.ingestion import ingest_repository

router = APIRouter()


class IngestRequest(BaseModel):
    repo_url: HttpUrl
    session_id: str
    repository_id: str


@router.post("/")
async def ingest(request: IngestRequest):

    result = await ingest_repository(
        repo_url=str(request.repo_url),
        session_id=request.session_id,
        repository_id=request.repository_id,
    )

    return result