//const { isYou, isWin, isReachable, rule } = require("./predicates");
const { isYou, isWin, isReachable } = require("./predicates");
const simjs = require("../../js/simulation");
const { best_sol } = require("../random_AGENT");

// Optionally do eager evaluation (depth first)
const EAGER = false;
var MAX_SEQ = 50;

/**
 * @description Find a winning path in the current game state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} path an array of steps to take to win a level.
 * @return {array} a winning path.
 */
function solve_level(state) {
  var yous = isYou(state, []);

  //console.log(rule(state, []));

  /**
   * Are any objects that are YOU also WIN?
   * Not sure we could ever get here since win is evaluated after a move is made, not before
   */
  {
    // filter out all of the yous that are also wins
    let opts = isWin(state, yous);

    if (opts.length > 0) {
      opts.forEach((opt) =>
        console.log(`\t{ ${opt.name} } is a winable object.`)
      );

      // Do nothing and you will win!
      return ["space"];
    }
  }

  var wins = isWin(state, []);

  /* Are any objects that are WIN isReachable by any objects that are YOU? */

  // find all the isReachable paths from to yous and wins
  solutions = [];
  for (let y of yous) {
    for (let w of wins) {
      p = isReachable(state, y, w, []);

      if (p.length > 0) {
        console.log(
          `\t{ ${y.name} } can reach { ${w.name
          } } by taking the path { ${simjs.miniSol(p)} }.`
        );
        if (EAGER) {
          return p;
        }
        solutions.push({ you: y, win: w, path: p });
      }
    }
  }

  // just return the first one
  if (solutions.length > 0) {
    return solutions[0].path;
  }

  /* Are any objects that can be made WIN isReachable by any objects that are YOU? */
  // TODO
  //   {
  //     let ps = [...path],
  //       ys = [...yous],
  //       new_wins = [];
  //     makeWin(state, new_wins);
  //     if (isReachable(ys, new_wins, state, ps)) {
  //       console.log(
  //         `${ys} can make ${ws} winnable, then reach it by taking the path${
  //           Array.isArray(ps[0]) ? "s" : ""
  //         } ${ps}.`
  //       );
  //       path = Array.isArray(ps[0]) ? ps[0] : ps;
  //       return true;
  //     }
  //   }

  /* Couldn't find winning path */
  return default_solve(state)
}

function default_solve(state) {
  console.log("Could not find winning path.\n Default behavior: attempting random steps.")
  var path = best_sol()
  if (path.length == 0) {
    console.log("Unable to solve this level.")
    return []
  } else if (validSolution(path, state)) {
    return path
  } else { // path to new state
    for (let i = 0; i < path.length; i++) {
      // iterate over game state
      let res = simjs.nextMove(path[i], state);
      state = res['next_state'];
    }
  }
  return solve_level(state) // try to solve level with new state
}

module.exports = { solve_level };
