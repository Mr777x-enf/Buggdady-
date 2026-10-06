from fastapi import APIRouter
from pydantic import BaseModel

from app.services.chat import process_chat


router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    question: str
    repository_id: str
    commit_sha: str


@router.post("/")
async def chat(request: ChatRequest):
    result = await process_chat(
        session_id=request.session_id,
        question=request.question,
        repository_id=request.repository_id,
        commit_sha=request.commit_sha,
    )

    return result