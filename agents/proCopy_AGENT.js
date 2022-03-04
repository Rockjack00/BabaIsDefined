/* 
BABA IS Y'ALL SOLVER based on the BLACK TEMPLATE Version 1.0 created by Milk.

Created by Tyler Olson 2/13/2022 for CSC 481 group project.
*/

// get imports (NODEJS)
const { path } = require("express/lib/application");
var simjs = require("../js/simulation"); // access the game states and simulation
var pl = require("tau-prolog"); // access the knowledge base
require("tau-prolog/modules/promises.js")(pl);
var syncRpc = require("sync-rpc"); 

/* Instantiate a knowledge base */
var kb = pl.create();
const comp_limit = 100000; // maximum prolog steps

/* Container for the best path found so far */
var bestPath = null;

var initState = null;



const fs = require('fs')


// function solve(){
    

    
//     const program = `
//         plus(z, Y, Y).
//         plus(s(X), Y, s(Z)) :- plus(X, Y, Z).
//     `;
//     const goal = "plus(X, Y, s(s(s(z)))).";
//     const session = pl.create();
//     session.promiseConsult(program);
//     session.promiseQuery(goal);

//     let answer = session.promiseAnswers();
//     answer.next()
//     console.log(answer);
//     // for await (let answer of session.promiseAnswers())
//     //     console.log(session.format_answer(answer));
//     //     bestPath = ["right","right", "right","right","right"];
//     // X = z, Y = s(s(s(z))) ;
//     // X = s(z), Y = s(s(z)) ;
//     // X = s(s(z)), Y = s(z) ;
//     // X = s(s(s(z))), Y = z.
    
    

    
// }

function solve() {
    var session = pl.create();
    program = `
    likes(sam, salad).
    likes(dean, pie).
    likes(sam, apples).
    likes(dean, whiskey).
    `;

    goal = 'likes(sam, X).';

    // let content;
    // try {
    //     content = fs.readFileSync('agents/helpers/test.txt', { encoding: 'utf8' });
    // } catch(err) {
    //     // An error occurred
    //     console.error(err);
    // }

    // fs.writeFile('agents/helpers/test.txt', "blank", err => {
    //     if (err) {
    //       console.error(err)
    //       return
    //     }
    // });

    session.consult(program, {
        success: function() {
            // Query
            session.query(goal, {
                success: function(goal) {
                    // Answers
                    session.answer({
                        success: function(answer) { 
                            fs.writeFile('agents/helpers/test.txt', "IT WORKED", err => {
                                if (err) {
                                  console.error(err)
                                  return
                                }
                            })
                        },
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


    val = "blank";
    while(val == "blank"){
        try {
            const data = fs.readFileSync('agents/helpers/test.txt', 'utf8');
            console.log(data);
            val = data;
        } catch (err) {
            console.error(err);
        }
    }

    console.log("IT REALLY WORKED!!!!!");

    return ["right","right", "right","right","right"];







    // session.consult(`
    //     likes(sam, salad).
    //     likes(dean, pie).
    //     likes(sam, apples).
    //     likes(dean, whiskey).
    // `, {
    //     success: function() { /* Program loaded correctly */ },
    //     error: function(err) { /* Error parsing program */ }
    // });

    // session.consult("kb\test1.pl", {
    //     success: function() { /* Program loaded correctly */ },
    //     error: function(err) { /* Error parsing program */ }
    // });

    // session.query("likes(sam, X).", {
    //     success: function(goal) { /* Goal loaded correctly */ },
    //     error: function(err) { /* Error parsing goal */ }
    // });

    // answer = session.answer({
    //     success: function(answer) {
    //         console.log(session.format_answer(answer)); // X = salad ;
    //         session.answer({
    //             success: function(answer) {
    //                 console.log(session.format_answer(answer)); // X = apples ;
    //             },
    //             // ...
    //         });
    //     },
    //     fail: function() { /* No more answers */ },
    //     error: function(err) { /* Uncaught exception */ },
    //     limit: function() { /* Limit exceeded */ }
    // });

    // console.log(answer)

    
}



/* Solve the level, given an initial state. */
// function solve() {
//     /* Already found a solution */
    
//     if (bestPath != [] && bestPath != null) {
//         return bestPath;
//     }

//     // return ["right","right", "right","right","right"];
//     /* Asynchronously attempt to find a solution to the goal */
//     kb.query("fruits_in([carrot, apple, banana, broccoli], X).", {
//         success: function(goal) { console.log("\nGOAL SUCCESSFUL PARSE") },
//         error: function(err) { console.log("\nGOAL FAILED PARSE")  }
//     });

//     ses1 = kb.answer({
//         success: function(bestPath) {
//             console.log(bestPath); // {X/apple}
//             bestPath = ["right","right", "right","right","right"];
//             kb.answer({
//                 success: function(bestPath) {
//                     console.log(bestPath); // {X/banana}
//                 },
//                 // error, fail, limit
//             });
//         },
//         error: function(err) { console.log("\nANSWER ERROR");
//         bestPath = []; },
//         fail:  function() { console.log("\nANSWER FAIL");
//         bestPath = []; },
//         limit: function() { console.log("\nANSWER LIMIT");
//         bestPath = [];  }
//     });
    
//     console.log(ses1);

//     return bestPath;
// }

/* Begin solving the level */
function initProlog(init_state) {
    const coreKB = "../kb/logic.pl";
    const testKB = "../kb/test1.pl";

    initState = init_state;
    var map = init_state.orig_map;

    /* Initialize the core knowledge base */
    kb.consult("                   \
        % load lists module                          \
        :- use_module(library(lists)).               \
                                                    \
        % fruit/1                                    \
        fruit(apple). fruit(pear). fruit(banana).    \
                                                    \
        % fruits_in/2                                \
        fruits_in(Xs, X) :- member(X, Xs), fruit(X). \
    ", {
        success: function() { console.log("\nSUCCESS FUNCTION IN TEST PROLOG") },
        error: function(err) { console.log("\nERROR FUNCTION IN TEST PROLOG") }
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
