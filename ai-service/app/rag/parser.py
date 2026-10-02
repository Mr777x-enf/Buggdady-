from abc import ABC, abstractmethod

from .models import CodeChunk


class LanguageParser(ABC):
    """
    Base interface that every language parser must implement.
    """

    @abstractmethod
    def parse_file(
        self,
        file_path: str,
        source: str,
        repository_id: str,
        commit_sha: str,
        session_id: str,
    ) -> list[CodeChunk]:
        """
        Parse a source file and return standardized CodeChunk objects.
        """
        raise NotImplementedError