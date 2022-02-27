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

function accessGameState(element, ascii_map) {
    const currState = {};
    newState(currState, ascii_map);
    game_elements = currState[element];
    return game_elements;    
}

function newewState(kekeState, map) {
    simjs.clearLevel(kekeState);
    kekeState.orig_map = map;
    [kekeState.back_map, kekeState.obj_map] = simjs.splitMap(kekeState.orig_map);
    simjs.assignMapObjs(kekeState);
    simjs.interpretRules(kekeState);
}

(function (pl) {
    // Name of the module
    var name = "tau_pathing";
    // Object with the set of predicates, indexed by indicators (name/arity)
    var predicates = function () {
        return {
            "reachable/4": function (thread, point, atom) {
                if (pathing.floodfill_reachable(...atom.args)) {
                    thread.success(point);
                }
                // For a predicate to NOT be successful, no new state is inserted in the choice point stack.
            },
            "isYou/2": function (thread, point, atom) {
                var you = atom.args[0],
                    game_state = atom.args[1];
                //check that gamestate is constant
                if (pl.type.is_variable(game_state)) {
                    thread.throw_error(pl.error.instantiation(atom.indicator));
                }
                
                var players = accessGameState("players", game_state);
                if (pl.type.is_variable(you)) { // If you is variable, set it
                    createChoicePoints(point, you, players);
                    thread.success(point);
                    return
                } else { // if you is constant, check against the players
                    for (const player of players) {
                        if (you.name == player.name && you.x == player.x && you.y == player.y) {
                            thread.success(point);
                            return
                        }
                    }
                }
            },
            "isWin/2": function (thread, point, atom) {
                var win = atom.args[0],
                    game_state = atom.args[1];
                //check that gamestate is constant
                if (pl.type.is_variable(game_state)) {
                    thread.throw_error(pl.error.instantiation(atom.indicator));
                }

                var winnables = accessGameState("winnables", game_state);
                if (pl.type.is_variable(win)) { // If win is variable, set it
                    createChoicePoints(point, win, winnables);
                    thread.success(point);
                    return
                } else { // if win is constant, check against the winnables
                    for (const winnable of winnables) {
                        if (win.name == winnable.name && win.x == winnable.x && win.y == winnable.y) {
                            thread.success(point);
                            return
                        }
                    }
                }
            }
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
