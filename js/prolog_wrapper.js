var session = pl.create();

session.consult("baba.kb", {
    success: function() { /* Program parsed correctly */ },
    error: function(err) { /* Error parsing program */ }
});

session.query("winnable(board, X).", {
    success: function(goal) { /* Goal parsed correctly */ },
    error: function(err) { /* Error parsing goal */ }
});

session.consult("baba.kb", {
    success: function() {
        // Query
        session.query(goal, { // goal can change?
            success: function(goal) {
                // Answers
                session.answer({
                    success: function(answer) { /* Answer */ },
                    error:   function(err) { /* Uncaught error */ },
                    fail:    function() { /* Fail */ },
                    limit:   function() { /* Limit exceeded */ }
                })
            },
            error: function(err) { /* Error parsing goal */ }
        });
    },
    error: function(err) { /* Error parsing program */ }
});

// ex
session.consult("knight.pl");
session.query("tour((1,1), _).");
session.answer(function(x) {
    console.log(pl.format_answer(x));
});