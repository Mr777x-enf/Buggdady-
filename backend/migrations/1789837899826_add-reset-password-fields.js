/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
    pgm.addColumns("users", {
        reset_password_token: {
            type: "text"
        },

        reset_password_expires: {
            type: "timestamp"
        }
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
    pgm.dropColumns("users", [
        "reset_password_token",
        "reset_password_expires"
    ]);
};