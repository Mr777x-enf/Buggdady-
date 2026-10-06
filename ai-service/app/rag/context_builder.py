from typing import Any


def _longest_backtick_run(source: str) -> int:
    longest = 0
    current = 0

    for char in source:
        if char == "`":
            current += 1
            longest = max(longest, current)
        else:
            current = 0

    return longest


def build_context(chunks: list[dict[str, Any]]) -> str:
    """
    Convert retrieved code chunks into structured context
    for the LLM.
    """

    if not chunks:
        return "No relevant code was found."

    sections = []

    for index, chunk in enumerate(chunks, start=1):
        language = chunk.get("language") or ""
        source = chunk.get("source") or ""

        # Use a fence longer than any backtick sequence
        # inside the source code.
        fence = "`" * max(3, _longest_backtick_run(source) + 1)

        section = (
            f"--- CODE CHUNK {index} ---\n\n"
            f"File: {chunk.get('file_path', 'unknown')}\n"
            f"Language: {language or 'unknown'}\n"
            f"Symbol: {chunk.get('symbol_name') or 'unknown'}\n"
            f"Type: {chunk.get('symbol_type') or 'unknown'}\n"
            f"Lines: {chunk.get('start_line', '?')}-{chunk.get('end_line', '?')}\n\n"
            f"Source:\n"
            f"{fence}{language}\n"
            f"{source}\n"
            f"{fence}"
        )

        sections.append(section)

    return "\n\n".join(sections)