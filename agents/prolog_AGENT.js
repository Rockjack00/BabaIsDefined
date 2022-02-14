/* 
BABA IS Y'ALL SOLVER based on the BLACK TEMPLATE Version 1.0 created by Milk.

Created by Tyler Olson 2/13/2022 for CSC 481 group project.
*/

// get imports (NODEJS)
const { path } = require("express/lib/application");
var simjs = require("../js/simulation"); // access the game states and simulation
var pl = require("../node_modules/tau-prolog"); // access the knowledge base

/* Instantiate a knowledge base */
var kb = pl.create();
const comp_limit = 100000; // maximum prolog steps

/* Container for the best path found so far */
var bestPath = null;

var initState = null;

/* Solve the level, given an initial state. */
function solve() {
    /* Already found a solution */
    if (bestPath != []) {
        return bestPath;
    }

    /* Asynchronously attempt to find a solution to the goal */
    kb.answer({
        /* Callback for when a solution has been found */
        success: function (answer) {
            // answer is a substitution like {X/apple}
            console.log(kb.format_answer(answer)); // readable format: P = [u,l,d,r, ...]

            /* Update the best solution with the answer */
            solution = answer.links["Path"];
            if (bestPath == null || length(bestPath) > length(solution)) {
                bestPath = solution;
            }

            return bestPath;
        },

        /* Uncaught error */
        error: function (err) {
            err.message =
                `Error in solving the level:\n${init_state}\n` + err.message;
            throw err;
        },

        /* No (more) answers */
        fail: function () {
            console.log("No (more) solutions found.");
            return [];
        },

        /* Limit exceeded */
        limit: function () {
            console.log(`Computation limit (${comp_limit} steps) exceeded.`);
            return [];
        },
    });
}

/* Begin solving the level */
function initProlog(init_state) {
    const coreKB = "../kb/logic.pl";

    initState = init_state;
    var map = init_state.orig_map;

    /* Initialize the core knowledge base */
    kb.consult(coreKB, {
        /* Program parsed correctly */
        success: function () {
            console.log("Sucessfully loaded the core knowledge base.");
            /* Create a query for the knowledge base */
            kb.query(`win(${map}, Path).`, {
                /* Goal parsed correctly */
                success: function (goal) {
                    // do nothing with the [goal]

                    console.log(`Solving level:\n${init_state}`);
                    /* Asynchronously attempt to find a solution to the goal */
                    bestPath = solve();
                },

                /* Error parsing goal */
                error: function (err) {
                    err.message =
                        `Failed to parse the level:\n${init_state}\n` +
                        err.message;
                    throw err;
                },
            });
        },

        /* Error parsing program */
        error: function (err) {
            err.message =
                `Failed to load the core knowlege base at ${path.normalize(
                    coreKB
                )}.\n` + err.message;
            throw err;
        },
    });
}

// VISIBLE FUNCTION FOR OTHER JS FILES (NODEJS)
module.exports = {
    /* Used by the simulation to get the next steps */
    step: function (init_state) {
        // ignore the input (we already have it from init)

        return solve();
    },

    /* Used by the simulation to initialize the agent */
    init: function (init_state) {
        initProlog(init_state);
    },

    /* [Unimplemented] Returns closest solution in case of timeout. */
    best_sol: function () {
        return [];
    },
};
