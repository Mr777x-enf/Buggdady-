from pathlib import Path

from .parser import LanguageParser
from .parsers.javascript import JavaScriptParser
from .parsers.python import PythonParser


class ParserRegistry:

    def __init__(self):
        self._parsers: dict[str, LanguageParser] = {}

    def register(
        self,
        extensions: list[str],
        parser: LanguageParser,
    ):
        for extension in extensions:
            self._parsers[extension.lower()] = parser

    def get_parser(
        self,
        file_path: str,
    ) -> LanguageParser | None:

        extension = Path(file_path).suffix.lower()

        return self._parsers.get(extension)


parser_registry = ParserRegistry()

parser_registry.register(
    [".py"],
    PythonParser(),
) 
parser_registry.register(
    [".js", ".jsx"],
    JavaScriptParser(),
)