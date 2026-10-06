import os

from openai import OpenAI

from app.rag.models import CodeChunk


EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_BATCH_SIZE = 100


client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


def create_embedding(text: str) -> list[float]:
    """
    Create an embedding for a single piece of text.
    Useful for embedding individual queries.
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
    batch_size: int = DEFAULT_BATCH_SIZE,
) -> list[tuple[CodeChunk, list[float]]]:
    """
    Create embeddings for multiple CodeChunks.

    Chunks are processed in batches to avoid making
    one API request for every chunk.

    Returns:
        A list of:
        (CodeChunk, embedding)
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

        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=texts,
        )

        for chunk, embedding_data in zip(
            batch,
            response.data,
        ):
            results.append(
                (
                    chunk,
                    embedding_data.embedding,
                )
            )

    return results