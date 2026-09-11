/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Add forgot-password fields
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
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
 * Remove forgot-password fields
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropColumns("users", [
        "reset_password_token",
        "reset_password_expires"
    ]);
};