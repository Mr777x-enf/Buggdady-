from pathlib import Path

from tree_sitter import Language, Parser
import tree_sitter_python as tree_sitter_python


PYTHON_LANGUAGE = Language(
    tree_sitter_python.language()
)

parser = Parser(PYTHON_LANGUAGE)


CODE_NODE_TYPES = {
    "function_definition",
    "class_definition",
    "decorated_definition",
}


def chunk_python_file(
    file_path: str,
    session_id: str
) -> list[dict]:

    path = Path(file_path)

    source = path.read_text(
        encoding="utf-8",
        errors="ignore"
    )

    source_bytes = source.encode("utf-8")

    tree = parser.parse(source_bytes)

    chunks = []

    def walk(node):

        if node.type in CODE_NODE_TYPES:

            content = source_bytes[
                node.start_byte:node.end_byte
            ].decode(
                "utf-8",
                errors="ignore"
            )

            chunks.append({
                "content": content,

                # File information
                "file_name": path.name,
                "file_path": str(path),

                # Code information
                "language": "python",
                "node_type": node.type,

                # Location
                "start_line": node.start_point[0] + 1,
                "end_line": node.end_point[0] + 1,

                # Isolation
                "session_id": session_id
            })

        for child in node.children:
            walk(child)

    walk(tree.root_node)

    return chunks