from app.llm.model import ask_llm


async def generate_fix(state: dict) -> dict:
    """
    Ask the LLM to propose a code fix based on
    the debugging analysis and retrieved code.
    """

    question = state["question"]
    context = state["context"]
    analysis = state["analysis"]

    prompt = f"""
You are fixing a bug in a software repository.

User's bug report:
{question}

Repository context:
{context}

Your analysis:
{analysis}

Propose the smallest safe code change that could fix the bug.

Return:
1. The file that should be changed.
2. What should be changed.
3. The corrected code.
4. Why the change should fix the bug.

Do not claim that the bug is fixed yet.
The proposed change will be tested separately.
"""

    proposed_fix = await ask_llm(
        question=prompt,
        context=context,
    )

    return {
        "proposed_fix": proposed_fix,
        "status": "fix_proposed",
    }