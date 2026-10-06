import os

from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


async def ask_llm(
    question: str,
    context: str,
) -> str:
    """
    Send the user's question and retrieved code context
    to the LLM and return the answer.
    """

    if not question.strip():
        raise ValueError("Question cannot be empty")

    response = await client.responses.create(
        model="gpt-5.6",
        input=[
            {
                "role": "system",
                "content": (
                    "You are BugDady, an AI code debugging assistant. "
                    "Analyze the provided repository context and answer "
                    "the user's question using the code as evidence. "
                    "If the context does not contain enough information, "
                    "say so instead of inventing code or facts."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Repository context:\n\n"
                    f"{context}\n\n"
                    f"User question:\n\n"
                    f"{question}"
                ),
            },
        ],
    )

    return response.output_text