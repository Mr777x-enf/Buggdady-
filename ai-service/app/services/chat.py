from app.agent.graph import agent_graph


async def process_chat(
    session_id: str,
    question: str,
    repository_id: str,
    commit_sha: str,
):
    initial_state = {
        "question": question,
        "repository_id": repository_id,
        "commit_sha": commit_sha,
        "query_embedding": [],
        "chunks": [],
        "context": "",
        "analysis": "",
        "proposed_fix": "",
        "attempt": 0,
        "status": "started",
    }

    final_state = await agent_graph.ainvoke(initial_state)

    return {
        "session_id": session_id,
        "answer": final_state["analysis"],
        "proposed_fix": final_state["proposed_fix"],
        "sources": [
            {
                "file_path": chunk["file_path"],
                "start_line": chunk["start_line"],
                "end_line": chunk["end_line"],
                "symbol_name": chunk["symbol_name"],
            }
            for chunk in final_state["chunks"]
        ],
    }