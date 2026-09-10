exports.up = (pgm) => {
    pgm.createTable("users", {
        id: {
            type: "serial",
            primaryKey: true
        },

        name: {
            type: "varchar(100)",
            notNull: true
        },

        email: {
            type: "varchar(255)",
            notNull: true,
            unique: true
        },

        password: {
            type: "text",
            notNull: true
        },

        created_at: {
            type: "timestamp",
            default: pgm.func("current_timestamp")
        }
    });
};

exports.down = (pgm) => {
    pgm.dropTable("users");
};