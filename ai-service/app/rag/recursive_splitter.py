def recursive_split_chunk(
    chunk: dict,
    max_chars: int = 4000,
    overlap: int = 300
) -> list[dict]:

    content = chunk["content"]

    # Already small enough
    if len(content) <= max_chars:
        return [chunk]

    separators = [
        "\n\n",
        "\n",
        " ",
        ""
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

        final_chunks = []

        for piece in pieces:

            new_chunk = {
                **chunk,
                "content": piece
            }

            if len(piece) > max_chars:

                final_chunks.extend(
                    recursive_split_chunk(
                        new_chunk,
                        max_chars,
                        overlap
                    )
                )

            else:
                final_chunks.append(new_chunk)

        return final_chunks

    # Last fallback
    final_chunks = []

    start = 0

    while start < len(content):

        end = start + max_chars

        piece = content[start:end]

        new_chunk = {
            **chunk,
            "content": piece
        }

        final_chunks.append(new_chunk)

        start = end - overlap

    return final_chunks