from typing import TypedDict, Any


class AgentState(TypedDict):
    question: str
    repository_id: str
    commit_sha: str

    query_embedding: list[float]
    chunks: list[dict[str, Any]]
    context: str

    analysis: str
    proposed_fix: str

    attempt: int
    status: str