from fastapi import APIRouter
from pydantic import BaseModel

from app.services.chat import process_chat


router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    question: str


@router.post("/")
async def chat(request: ChatRequest):

    answer = await process_chat(
        request.session_id,
        request.question
    )

    return {
        "session_id": request.session_id,
        "answer": answer
    }