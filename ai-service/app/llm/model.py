import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


async def ask_llm(
    question: str,
    context: str,
) -> str:
    """
    Send the user's question and retrieved code context
    to Gemini and return the answer.
    """

    if not question.strip():
        raise ValueError("Question cannot be empty")

    prompt = f"""
You are BugDady, an AI code debugging assistant.

Analyze the provided repository context and answer
the user's question using the code as evidence.

If the context does not contain enough information,
say so instead of inventing code or facts.

Repository context:

{context}

User question:

{question}
"""

    response = await client.aio.models.generate_content(
        model="gemini-3.8-flash",
        contents=prompt,
    )

    return response.text