export const up = (pgm) => {
    pgm.createTable("repositories", {
        id: {
            type: "serial",
            primaryKey: true
        },

        user_id: {
            type: "integer",
            notNull: true,
            references: "users(id)",
            onDelete: "CASCADE"
        },

        repo_link: {
            type: "text",
            notNull: true
        },

        created_at: {
            type: "timestamp",
            default: pgm.func("current_timestamp")
        }
    });
};

export const down = (pgm) => {
    pgm.dropTable("repositories");
};