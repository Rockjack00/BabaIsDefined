
var pl = require("../node_modules/tau-prolog"); // access the knowledge base
var pathing = require("helpers/pathing"); // access floodfill pathing

(function( pl ) {
    // Name of the module
    var name = "tau_pathing";
    // Object with the set of predicates, indexed by indicators (name/arity)
    var predicates = function() {
        return {
            // reachable/7
            "reachable/7": function(thread, point, _, start_pos, movable_spcs, goal_spcs, possActions) { // do we need atom?
                if (pathing.floodfill_reachable(start_pos, movable_spcs, goal_spcs, possActions) {
                    thread.success(point);
                }
                // For a predicate to NOT be successful, no new state is inserted in the choice point stack.
             }
        };
    };
    // List of predicates exported by the module
    var exports = ["reachable/7"];
    // DON'T EDIT
    if( typeof module !== 'undefined' ) {
        module.exports = function(tau_prolog) {
            pl = tau_prolog;
            new pl.type.Module( name, predicates(), exports );
        };
    } else {
        new pl.type.Module( name, predicates(), exports );
    }
})( pl );
