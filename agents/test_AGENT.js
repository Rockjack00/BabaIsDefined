// BABA IS Y'ALL SOLVER - BLACK TEMPLATE
// Version 1.0
// Code by Milk

//get imports (NODEJS)
var simjs = require("../js/simulation"); //access the game states and simulation
var pl = require("../node_modules/tau-prolog"); //access the knowledge base
var kb = pl.create();

let possActions = ["space", "right", "up", "left", "down"];

// NEXT ITERATION STEP FOR SOLVING
function iterSolve(init_state) {
    // PERFORM ITERATIVE CALCULATIONS HERE //

    //return a sequence of actions or empty list
    return [];
}

function initProlog() {
    kb.consult("move_forward(player)", {
        success: function () {
            /* Program parsed correctly */
            return [];
        },
        error: function (err) {
            /* Error parsing program */
            return false;
        },
    });
}

// VISIBLE FUNCTION FOR OTHER JS FILES (NODEJS)
module.exports = {
    step: function (init_state) {
        return iterSolve(init_state);
    }, // iterative step function (returns solution as list of steps from poss_actions or empty list)
    init: function (init_state) {}, // initializing function here
    best_sol: function () {
        return [];
    }, //returns closest solution in case of timeout
};
