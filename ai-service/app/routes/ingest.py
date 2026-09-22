from fastapi import APIRouter
from pydantic import BaseModel, HttpUrl


router = APIRouter()


class IngestRequest(BaseModel):
    repo_url: HttpUrl
    session_id: str


@router.post("/")
async def ingest(request: IngestRequest):

    return {
        "message": "Repository received",
        "repo_url": str(request.repo_url),
        "session_id": request.session_id
    }