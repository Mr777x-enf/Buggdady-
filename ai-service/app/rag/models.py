from dataclasses import dataclass
from typing import Optional


@dataclass
class CodeChunk:
    """
    Standard representation of a piece of source code.

    Every language parser must eventually produce CodeChunk objects.
    """

    # Unique identifier for this chunk
    id: str

    # Repository information
    repository_id: str
    commit_sha: str
    session_id: str

    # File information
    file_path: str
    language: str

    # Symbol information
    symbol_name: Optional[str]
    symbol_type: Optional[str]
    parent_symbol: Optional[str]

    # Source location
    start_line: int
    end_line: int

    # Actual source code
    source: str

    # Versioning information
    parser_version: str
    chunker_version: str