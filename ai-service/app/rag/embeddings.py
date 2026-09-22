import os

from openai import OpenAI


client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)


EMBEDDING_MODEL = "text-embedding-3-small"


def create_embedding(text: str) -> list[float]:

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )

    return response.data[0].embedding


def create_embeddings(
    chunks: list[dict]
) -> list[dict]:

    results = []

    for chunk in chunks:

        embedding = create_embedding(
            chunk["content"]
        )

        results.append({
            **chunk,
            "embedding": embedding
        })

    return results