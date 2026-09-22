async def process_chat(
    session_id: str,
    question: str
):

    # Later:
    # 1. Load LangGraph checkpoint
    # 2. Retrieve relevant code from pgvector
    # 3. Pass context to LangGraph
    # 4. Run LLM
    # 5. Return answer

    return {
        "session_id": session_id,
        "answer": f"Received question: {question}"
    }