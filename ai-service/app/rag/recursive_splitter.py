from copy import copy

from app.rag.models import CodeChunk


def recursive_split_chunk(
    chunk: CodeChunk,
    max_chars: int = 4000,
    overlap: int = 300,
) -> list[CodeChunk]:

    content = chunk.source

    # Already small enough
    if len(content) <= max_chars:
        return [chunk]

    separators = [
        "\n\n",
        "\n",
        " ",
        "",
    ]

    for separator in separators:

        if separator and separator not in content:
            continue

        parts = (
            content.split(separator)
            if separator
            else list(content)
        )

        pieces = []
        current = ""

        for part in parts:

            candidate = (
                current + separator + part
                if current
                else part
            )

            if len(candidate) <= max_chars:
                current = candidate

            else:
                if current.strip():
                    pieces.append(current)

                current = part

        if current.strip():
            pieces.append(current)

        if len(pieces) <= 1:
            continue

        return _create_chunks(
            chunk,
            pieces,
        )

    # Character-level fallback
    return _split_by_characters(
        chunk,
        max_chars,
        overlap,
    )


def _create_chunks(
    chunk: CodeChunk,
    pieces: list[str],
) -> list[CodeChunk]:

    final_chunks = []

    current_line = chunk.start_line

    for piece in pieces:

        new_chunk = copy(chunk)

        new_chunk.source = piece

        line_count = piece.count("\n")

        new_chunk.start_line = current_line

        new_chunk.end_line = (
            current_line + line_count
        )

        final_chunks.append(new_chunk)

        current_line = new_chunk.end_line + 1

    return final_chunks


def _split_by_characters(
    chunk: CodeChunk,
    max_chars: int,
    overlap: int,
) -> list[CodeChunk]:

    final_chunks = []

    content = chunk.source

    start = 0

    while start < len(content):

        end = start + max_chars

        piece = content[start:end]

        new_chunk = copy(chunk)

        new_chunk.source = piece

        # Number of lines before this piece
        lines_before = content[:start].count("\n")

        # Number of lines inside this piece
        lines_inside = piece.count("\n")

        new_chunk.start_line = (
            chunk.start_line + lines_before
        )

        new_chunk.end_line = (
            new_chunk.start_line + lines_inside
        )

        final_chunks.append(new_chunk)

        if end >= len(content):
            break

        next_start = end - overlap

        if next_start <= start:
            next_start = end

        start = next_start

    return final_chunks