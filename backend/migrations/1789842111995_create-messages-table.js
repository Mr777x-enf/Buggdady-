exports.up = (pgm) => {
  pgm.createTable("messages", {
    id: {
      type: "bigserial",
      primaryKey: true,
    },

    session_id: {
      type: "uuid",
      notNull: true,
    },

    role: {
      type: "varchar(20)",
      notNull: true,
    },

    content: {
      type: "text",
      notNull: true,
    },

    created_at: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("current_timestamp"),
    },
  });

  pgm.createIndex("messages", "session_id");
};

exports.down = (pgm) => {
  pgm.dropTable("messages");
};