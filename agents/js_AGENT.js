// BABA IS Y'ALL SOLVER - BLACK TEMPLATE
// Version 1.0
// Code by Milk

//get imports (NODEJS)
const { solve_level, defaultSolve } = require("./helpers/strategy");

let possActions = ["space", "right", "up", "left", "down"];


// NEXT ITERATION STEP FOR SOLVING
function* iterSolve(init_state) {
  /* Find the winning solution */
  let solutionPath = solve_level(init_state);

  if (solutionPath.length > 0) {
    yield solutionPath;

  }
  // Couldn't find winning path the first time, so make random starts
  while (true) {
    yield defaultSolve(init_state);
  }
}

// VISIBLE FUNCTION FOR OTHER JS FILES (NODEJS)
module.exports = {
  step: function (init_state) {
    return iterSolve(init_state).next().value;
  }, // iterative step function (returns solution as list of steps from poss_actions or empty list)
  init: function (init_state) { }, // initializing function here
  best_sol: function () {
    return [];
  }, //returns closest solution in case of timeout
};
