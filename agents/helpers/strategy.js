const { isYou, isWin, isReachable, isNoun } = require("./predicates");
const simjs = require("../../js/simulation");
const { generateRules, generatePropertyRules, generateNounRules, canChangeRules, canActivateRules, activeRules, getRules } = require("./rules");

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

  /// DEBUG ///

  let changeable_Rules = canChangeRules(state, []);
  console.log(changeable_Rules);

  /// END DEBUG ///

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

/**
 * @description Employs a default (random) solver if no path can be found by the intelligent solver.
 *              The goal is either to find a winning path, or to find a new state that can be handed to the intelligent solver.
 * @param {string} state the acsii representation of the current game state.
 * @returns {array} a winning path OR calls solve_level again with the updated state.
 */
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

/**
 * @description Find all possible "win" rules that the agent is able to activate.
 *              If passed a non-empty list of nouns, it will only find "win" rules using those nouns
 * @param {string} state the acsii representation of the current game state.
 * @param {array} nouns a set of noun words in the game state OR an empty array.
 * @return {array} a list of rules and their paths of activation, as created by canActivateRules.
 *
 */
function assertWin(state, nouns) {
  let property_rules = [];
  if (nouns.length == 0) {
    property_rules = generatePropertyRules(state, [], []);
  } else {
    let win_words = isProperty(state, []).filter((p) => p.name = "win");
    let connectors = isConnector(state, []);
    property_rules = generatePropertyRules(state, nouns.concat(win_words, connectors));
  }

  let win_rules = property_rules.filter((r) => r.property.name = "win");
  return canActivateRules(state, win_rules);
}

/**
* @description Find all possible rules that change one object into another object type that is already "win" that the agent is able to activate.
*              If passed a non-empty list of subject_nouns, it will only find rules using those nouns AS THE SUBJECT(the thing being transformed)
* @param {string} state the acsii representation of the current game state.
* @param {array} subject_nouns a set of subject noun words in the game state OR an empty array.
* @return {array} a list of rules and their paths of activation, as created by canActivateRules.
*
*/
function createWin(state, subject_nouns) {
  let win_rules = activeRules(state, []).filter((r) => r.property.name = "win");
  let win_nouns = []
  let win_connectors = []
  let has_win_property = []
  for (rule of win_rules) {
    win_nouns.push(rule.noun);
    win_connectors.push(rule.connector)
    has_win_property.push(rule.noun.name);
  }

  //get a list of usable subject nouns
  let usable_subjects = [];
  if (subject_nouns.length == 0) {
    usable_subjects = isNoun(state, []).filter((n) => !win_nouns.includes(n.name));
  } else {
    usable_subjects = subject_nouns;
  }

  //filter any connector and noun object that has win property but is not part of a win rule
  let usable_connectors = isConnector(state, []).filter((c) => !win_connectors.includes(c));
  let usable_win_nouns = isNoun(state, []).filter((n) => !win_nouns.includes(n) && has_win_property.includes(n.name));
  let possible_rules = getRules(usable_subjects, usable_connectors, usable_win_nouns);
  return canActivateRules(state, possible_rules);
}

module.exports = { solve_level };
