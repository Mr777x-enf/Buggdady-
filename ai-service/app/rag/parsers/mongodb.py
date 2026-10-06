from tree_sitter import Parser
import tree_sitter_javascript as ts_javascript

from app.rag.models import CodeChunk
from app.rag.parser import LanguageParser


class MongoDBParser(LanguageParser):

    LANGUAGE = "mongodb"
    PARSER_VERSION = "mongodb-v1"
    CHUNKER_VERSION = "recursive-v1"

    OPERATION_TYPES = {
        "find": "query",
        "findOne": "query",
        "aggregate": "aggregation",
        "count": "query",
        "countDocuments": "query",
        "estimatedDocumentCount": "query",
        "distinct": "query",
        "insert": "write",
        "insertOne": "write",
        "insertMany": "write",
        "update": "write",
        "updateOne": "write",
        "updateMany": "write",
        "replaceOne": "write",
        "delete": "write",
        "deleteOne": "write",
        "deleteMany": "write",
        "remove": "write",
        "bulkWrite": "write",
        "watch": "change_stream",
        "createCollection": "collection_definition",
        "dropCollection": "collection_operation",
        "runCommand": "database_command",
    }

    def __init__(self):
        self.parser = Parser(ts_javascript.language())

    def parse_file(
        self,
        file_path: str,
        source: str,
        repository_id: str,
        commit_sha: str,
        session_id: str,
    ) -> list[CodeChunk]:
        source_bytes = source.encode("utf-8")
        tree = self.parser.parse(source_bytes)
        chunks: list[CodeChunk] = []

        self._walk_tree(
            tree.root_node,
            source_bytes,
            file_path,
            repository_id,
            commit_sha,
            session_id,
            chunks,
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
        chunks: list[CodeChunk],
    ):
        if node.type == "call_expression":
            function_node = node.child_by_field_name("function")
            if function_node is not None and function_node.type == "member_expression":
                property_node = function_node.child_by_field_name("property")
                object_node = function_node.child_by_field_name("object")

                if property_node is not None and object_node is not None:
                    operation = self._get_text(source_bytes, property_node)
                    object_text = self._get_text(source_bytes, object_node)
                    symbol_type = self.OPERATION_TYPES.get(operation)

                    if symbol_type and self._looks_like_mongodb_receiver(object_text):
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
                                language=self.LANGUAGE,
                                symbol_name=f"{object_text}.{operation}",
                                symbol_type=symbol_type,
                                parent_symbol=object_text,
                                start_line=node.start_point[0] + 1,
                                end_line=node.end_point[0] + 1,
                                source=self._get_text(source_bytes, node),
                                parser_version=self.PARSER_VERSION,
                                chunker_version=self.CHUNKER_VERSION,
                            )
                        )

        for child in node.named_children:
            self._walk_tree(
                child,
                source_bytes,
                file_path,
                repository_id,
                commit_sha,
                session_id,
                chunks,
            )

    @classmethod
    def _looks_like_mongodb_receiver(cls, object_text: str) -> bool:
        return (
            object_text == "db"
            or object_text.startswith("db.")
            or ".getCollection(" in object_text
            or object_text.endswith(".collection")
        )

    @staticmethod
    def _get_text(source_bytes: bytes, node) -> str:
        return source_bytes[node.start_byte:node.end_byte].decode(
            "utf-8",
            errors="replace",
        )

    @staticmethod
    def _create_chunk_id(session_id: str, file_path: str, start_byte: int) -> str:
        return f"{session_id}:{file_path}:{start_byte}"
