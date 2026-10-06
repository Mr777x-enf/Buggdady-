/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // Enable pgvector
    pgm.sql('CREATE EXTENSION IF NOT EXISTS vector');

    pgm.createTable("code_chunks", {
        id: {
            type: "text",
            primaryKey: true,
        },

        repository_id: {
            type: "text",
            notNull: true,
        },

        commit_sha: {
            type: "text",
            notNull: true,
        },

        session_id: {
            type: "text",
            notNull: true,
        },

        file_path: {
            type: "text",
            notNull: true,
        },

        language: {
            type: "varchar(50)",
            notNull: true,
        },

        symbol_name: {
            type: "text",
        },

        symbol_type: {
            type: "varchar(50)",
        },

        parent_symbol: {
            type: "text",
        },

        start_line: {
            type: "integer",
        },

        end_line: {
            type: "integer",
        },

        source: {
            type: "text",
            notNull: true,
        },

        parser_version: {
            type: "varchar(100)",
        },

        chunker_version: {
            type: "varchar(100)",
        },

        embedding: {
            type: "vector(1536)",
        },

        created_at: {
            type: "timestamp",
            default: pgm.func("current_timestamp"),
        },
    });

    pgm.createIndex(
        "code_chunks",
        ["repository_id", "commit_sha"]
    );
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable("code_chunks");
};