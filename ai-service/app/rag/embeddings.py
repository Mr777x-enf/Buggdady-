import os

from openai import OpenAI

from app.rag.models import CodeChunk


EMBEDDING_MODEL = "text-embedding-3-small"


client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def create_embedding(text: str) -> list[float]:
    """
    Create an embedding for a single piece of text.
    """

    if not text or not text.strip():
        raise ValueError(
            "Cannot create embedding for empty text"
        )

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )

    return response.data[0].embedding


def create_embeddings(
    chunks: list[CodeChunk],
) -> list[tuple[CodeChunk, list[float]]]:
    """
    Create embeddings for CodeChunks.

    Returns:
        A list containing the original CodeChunk
        together with its embedding.
    """

    results = []

    for chunk in chunks:

        embedding = create_embedding(
            chunk.source
        )

        results.append(
            (
                chunk,
                embedding,
            )
        )

    return results