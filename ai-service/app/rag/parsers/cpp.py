from pathlib import Path

from tree_sitter import Parser
import tree_sitter_c as ts_c
import tree_sitter_cpp as ts_cpp

from app.rag.models import CodeChunk
from app.rag.parser import LanguageParser


class CppParser(LanguageParser):

    PARSER_VERSION = "c-cpp-v1"
    CHUNKER_VERSION = "recursive-v1"

    C_EXTENSIONS = {".c", ".h"}
    CPP_EXTENSIONS = {".cpp", ".cc", ".cxx", ".hpp", ".hh", ".hxx"}

    def __init__(self):
        self.c_parser = Parser(ts_c.language())
        self.cpp_parser = Parser(ts_cpp.language())

    def parse_file(
        self,
        file_path: str,
        source: str,
        repository_id: str,
        commit_sha: str,
        session_id: str,
    ) -> list[CodeChunk]:

        extension = Path(file_path).suffix.lower()

        if extension in self.C_EXTENSIONS:
            parser = self.c_parser
            language = "c"

        elif extension in self.CPP_EXTENSIONS:
            parser = self.cpp_parser
            language = "cpp"

        else:
            raise ValueError(
                f"Unsupported C/C++ file extension: {extension}"
            )

        source_bytes = source.encode("utf-8")

        tree = parser.parse(source_bytes)

        chunks: list[CodeChunk] = []

        self._walk_tree(
            node=tree.root_node,
            source_bytes=source_bytes,
            file_path=file_path,
            repository_id=repository_id,
            commit_sha=commit_sha,
            session_id=session_id,
            language=language,
            chunks=chunks,
            parent_symbol=None,
        )

        return chunks

    def _walk_tree(
        self,
        node,
        source_bytes: bytes,
        file_path: str,
        repository_id: str,
        commit_sha: str,
        session_id: str,
        language: str,
        chunks: list[CodeChunk],
        parent_symbol: str | None,
    ):

        symbol_name = None
        symbol_type = None

        # C/C++ function
        if node.type == "function_definition":

            declarator = node.child_by_field_name("declarator")

            if declarator:
                name_node = self._find_function_name(declarator)

                if name_node:
                    symbol_name = self._get_text(
                        source_bytes,
                        name_node
                    )
                    symbol_type = "function"

        # C++ class
        elif node.type == "class_specifier":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node
                )
                symbol_type = "class"

        # C++ struct
        elif node.type == "struct_specifier":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node
                )
                symbol_type = "struct"

        # C/C++ enum
        elif node.type == "enum_specifier":

            name_node = node.child_by_field_name("name")

            if name_node:
                symbol_name = self._get_text(
                    source_bytes,
                    name_node
                )
                symbol_type = "enum"

        # Create chunk
        if symbol_name:

            content = self._get_text(
                source_bytes,
                node
            )

            chunks.append(
                CodeChunk(
                    id=self._create_chunk_id(
                        session_id,
                        file_path,
                        node.start_byte,
                    ),
                    repository_id=repository_id,
                    commit_sha=commit_sha,
                    session_id=session_id,
                    file_path=file_path,
                    language=language,
                    symbol_name=symbol_name,
                    symbol_type=symbol_type,
                    parent_symbol=parent_symbol,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    source=content,
                    parser_version=self.PARSER_VERSION,
                    chunker_version=self.CHUNKER_VERSION,
                )
            )

        current_parent = (
            symbol_name
            if symbol_name
            else parent_symbol
        )

        for child in node.named_children:

            self._walk_tree(
                node=child,
                source_bytes=source_bytes,
                file_path=file_path,
                repository_id=repository_id,
                commit_sha=commit_sha,
                session_id=session_id,
                language=language,
                chunks=chunks,
                parent_symbol=current_parent,
            )

    def _find_function_name(self, declarator):

        # Simple function:
        #
        # int add(int a, int b)
        #
        # function_definition
        #     declarator
        #         function_declarator
        #             declarator -> identifier

        if declarator.type == "identifier":
            return declarator

        if declarator.type in (
            "function_declarator",
            "pointer_declarator",
            "reference_declarator",
            "parenthesized_declarator",
        ):
            child = declarator.child_by_field_name("declarator")

            if child:
                return self._find_function_name(child)

        return None

    @staticmethod
    def _get_text(
        source_bytes: bytes,
        node,
    ) -> str:

        return source_bytes[
            node.start_byte:node.end_byte
        ].decode("utf-8")

    @staticmethod
    def _create_chunk_id(
        session_id: str,
        file_path: str,
        start_byte: int,
    ) -> str:

        return f"{session_id}:{file_path}:{start_byte}"