import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.rag.models import CodeChunk


load_dotenv(
    dotenv_path=Path(__file__).resolve().parents[2] / ".env"
)


EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSION = 1536
DEFAULT_BATCH_SIZE = 100


client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def create_embedding(text: str) -> list[float]:
    """
    Create an embedding for a single piece of text.
    Used for embedding user queries.
    """

    if not text or not text.strip():
        raise ValueError(
            "Cannot create embedding for empty text"
        )

    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSION
        ),
    )

    embedding = response.embeddings[0].values

    if len(embedding) != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Expected {EMBEDDING_DIMENSION}-dimensional embedding, "
            f"got {len(embedding)}"
        )

    return embedding


def create_embeddings(
    chunks: list[CodeChunk],
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> list[tuple[CodeChunk, list[float]]]:
    """
    Create embeddings for multiple CodeChunks.
    """

    if batch_size <= 0:
        raise ValueError(
            "batch_size must be greater than 0"
        )

    if not chunks:
        return []

    results: list[
        tuple[CodeChunk, list[float]]
    ] = []

    for start in range(
        0,
        len(chunks),
        batch_size,
    ):
        batch = chunks[
            start:start + batch_size
        ]

        texts = []

        for chunk in batch:
            if not chunk.source or not chunk.source.strip():
                raise ValueError(
                    f"Cannot create embedding for empty chunk: {chunk.id}"
                )

            texts.append(chunk.source)

        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=texts,
            config=types.EmbedContentConfig(
                output_dimensionality=EMBEDDING_DIMENSION
            ),
        )

        if len(response.embeddings) != len(batch):
            raise ValueError(
                f"Expected {len(batch)} embeddings, "
                f"got {len(response.embeddings)}"
            )

        for chunk, embedding_data in zip(
            batch,
            response.embeddings,
        ):
            embedding = embedding_data.values

            if len(embedding) != EMBEDDING_DIMENSION:
                raise ValueError(
                    f"Expected {EMBEDDING_DIMENSION}-dimensional embedding, "
                    f"got {len(embedding)}"
                )

            results.append(
                (
                    chunk,
                    embedding,
                )
            )

    return results