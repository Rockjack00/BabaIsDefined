var pl = require("../node_modules/tau-prolog"); // access the knowledge base
var pathing = require("helpers/pathing"); // access floodfill pathing

function createChoicePoints(thread, point, term, choice_list) {
    var states = choice_list.forEach((c) => {
        return new pl.type.State(
            point.goal.replace(
                new pl.type.Term("=", [term, new pl.type.Term(c)])
            ),
            point.substitution,
            point
        );
    });
    thread.prepend(states);
}

(function (pl) {
    // Name of the module
    var name = "tau_pathing";
    // Object with the set of predicates, indexed by indicators (name/arity)
    var predicates = function () {
        return {
            // reachable/7
            "reachable/4": function (thread, point, atom) {
                // do we need atom?
                if (pathing.floodfill_reachable(...atom.args)) {
                    thread.success(point);
                }
                // For a predicate to NOT be successful, no new state is inserted in the choice point stack.
            },
            "isYou/2": function (thread, point, atom) {
                var you = atom.args[0],
                    game_state = atom.args[1];
                var players = accessGameState("players", game_state);

                createChoicePoints(point, you, players);
            },
            "isWin/2": function (thread, point, atom) {
                var you = atom.args[0],
                    game_state = atom.args[1];
                var winnables = accessGameState("winnables", game_state);

                createChoicePoints(point, you, winnables);
            },
        };
    };
    // List of predicates exported by the module
    var exports = ["reachable/4", "isYou/2", "isWin/2"];
    // DON'T EDIT
    if (typeof module !== "undefined") {
        module.exports = function (tau_prolog) {
            pl = tau_prolog;
            new pl.type.Module(name, predicates(), exports);
        };
    } else {
        new pl.type.Module(name, predicates(), exports);
    }
})(pl);
