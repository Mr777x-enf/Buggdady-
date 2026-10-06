exports.up = (pgm) => {
    pgm.addColumn("repositories", {
        commit_sha: {
            type: "text"
        }
    });
};

exports.down = (pgm) => {
    pgm.dropColumn("repositories", "commit_sha");
};
