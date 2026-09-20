export const up = (pgm) => {
    pgm.addColumn("repositories", {
        session_id: {
            type: "uuid",
            notNull: true
        }
    });
};

export const down = (pgm) => {
    pgm.dropColumn("repositories", "session_id");
};