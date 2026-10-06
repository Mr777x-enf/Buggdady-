from pathlib import Path
from .parsers.cpp import CppParser
from .parsers.rust import RustParser

from .parser import LanguageParser
from .parsers.javascript import JavaScriptParser
from .parsers.python import PythonParser
from .parsers.java import JavaParser
from .parsers.go import GoParser
from .parsers.php import PHPParser
from .parsers.csharp import CSharpParser
from .parsers.kotlin import KotlinParser
from .parsers.swift import SwiftParser
from .parsers.dart import DartParser
from .parsers.sql import SQLParser
from .parsers.html import HTMLParser
from .parsers.css import CSSParser
from .parsers.mongodb import MongoDBParser


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
parser_registry.register(
    [".java"],
    JavaParser(),
)
parser_registry.register(
    [
        ".c",
        ".h",
        ".cpp",
        ".cc",
        ".cxx",
        ".hpp",
        ".hh",
        ".hxx",
    ],
    CppParser(),
)
parser_registry.register(
    [".go"],
    GoParser(),
)
parser_registry.register(
    [".rs"],
    RustParser(),
)
parser_registry.register(
    [".php"],
    PHPParser(),
)
parser_registry.register(
    [".cs"],
    CSharpParser(),
)
parser_registry.register(
    [".kt", ".kts"],
    KotlinParser(),
)
parser_registry.register(
    [".swift"],
    SwiftParser(),
)
parser_registry.register(
    [".dart"],
    DartParser(),
)
parser_registry.register(
    [".sql"],
    SQLParser(),
)
parser_registry.register(
    [".html", ".htm"],
    HTMLParser(),
)
parser_registry.register(
    [".css"],
    CSSParser(),
)
parser_registry.register(
    [".mongo", ".mongodb", ".mongosh"],
    MongoDBParser(),
)