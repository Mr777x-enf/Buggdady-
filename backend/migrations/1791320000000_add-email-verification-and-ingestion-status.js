exports.up = (pgm) => {
    pgm.addColumns("users", {
        email_verified: {
            type: "boolean",
            notNull: true,
            default: true
        },
        email_verification_token_hash: {
            type: "text"
        },
        email_verification_expires: {
            type: "timestamp"
        },
        email_verification_sent_at: {
            type: "timestamp"
        }
    });

    pgm.addColumn("repositories", {
        ingestion_status: {
            type: "varchar(20)",
            notNull: true,
            default: "pending"
        }
    });

    pgm.addConstraint("repositories", "repositories_ingestion_status_check", {
        check: "ingestion_status IN ('pending', 'indexing', 'indexed', 'failed')"
    });
};

exports.down = (pgm) => {
    pgm.dropConstraint(
        "repositories",
        "repositories_ingestion_status_check"
    );
    pgm.dropColumn("repositories", "ingestion_status");
    pgm.dropColumns("users", [
        "email_verified",
        "email_verification_token_hash",
        "email_verification_expires",
        "email_verification_sent_at"
    ]);
};
