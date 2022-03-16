const { isYou, isWin, isReachable, isNoun, canPushTo, isConnector, isProperty } = require("./predicates");
const { generateRules, generatePropertyRules, generateNounRules, canChangeRules, canActivateRules, canDeactivateRules, activeRules, getRules } = require("./rules");
const { simulate, copy_state, Position } = require("./helpers");
const { makeSeq } = require("../random_AGENT");
const simjs = require("../../js/simulation");
const { validSolution } = require("../../js/exec");

// Optionally do eager evaluation (depth first)
const EAGER = false;
var MAX_SEQ = 50;

/**
 * @description Find a winning path in the current game state.
 * @param {State} state the current game state.
 * @return {Array<String>} a winning path.
 */
function solve_level(state) {
  let yous = isYou(state, []);

  /// DEBUG ///
  flag_noun = state["words"][5];
  path = canPushTo(state, flag_noun, new Position(5, 1), []);
  console.log(path);

  // let deactivate_rules = canDeactivateRules(state, []);
  // console.log(deactivate_rules)

  // let changeable_Rules = canChangeRules(state, []);
  // console.log(changeable_Rules);

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

  let wins = isWin(state, []);

  /* Are any objects that are WIN isReachable by any objects that are YOU? */
  let solutions = getPaths(state, yous, wins);

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

  // Are there any solutions that just require the agent to make a "win" rule?
  // assert win returns a list of rules that can be made and the path to make them
  for (let assertable of assertWin(state, [])) {

    let new_state = simulate(state, assertable.path);
    let new_yous = isYou(new_state, []);
    let new_wins = isWin(new_state, []);
    let paths = getPaths(new_state, new_yous, new_wins);

    if (paths.length > 0) {
      let full_path = assertable.path.concat(paths[0].path); // concat assertable.path and paths[0].path
      if (EAGER) {
        return full_path;
      }
      solutions.push({ you: paths[0].you, win: paths[0].win, path: full_path });
    }
  }
  if (solutions.length > 0) {
    return solutions[0].path;
  }

  // Are there any solutions that just require the agent to change one object into another object type that is already "win"?
  for (let assertable of createWin(state, [])) {
    let new_state = simulate(state, assertable.path);
    let new_yous = isYou(new_state, []);
    let new_wins = isWin(new_state, []);
    let paths = getPaths(new_state, new_yous, new_wins);

    if (paths.length > 0) {
      let full_path = assertable.path.concat(paths[0].path); // concat assertable.path and paths[0].path
      if (EAGER) {
        return full_path;
      }
      solutions.push({ you: paths[0].you, win: paths[0].win, path: full_path });
    }
  }
  if (solutions.length > 0) {
    return solutions[0].path;
  }

  // Are there solutions that can be found by changing any of the rules?
  solutions = changeableRulesSolve(state)
  if (solutions.length > 0) {
    return solutions[0].path;
  }

  // Couldn't find winning path
  return defaultSolve(state);
}

/**
 * @description Find a path for the agent to tatke in a given a game state.
 * @param {State} state the current game state.
 * @param {Array<PhysObj>} yous an array of objects that are YOU to use to find a path.
 * @param {Array<PhysObj>} wins an array of objects that are WIN to try to path to.
 * @return {Array<Object>} A set of winning paths along with which YOU got to which WIN.
 *                         Each object is of the form {you: <you>, win: <win>, path: <path>}
 */
function getPaths(state, yous, wins) {
  // find all the isReachable paths from to yous and wins
  let solutions = [];
  for (let y of yous) {
    for (let w of wins) {
      p = isReachable(state, y, w, []);

      if (p.length > 0) {
        console.log(
          `\t{ ${y.name} } can reach { ${w.name
          } } by taking the path { ${simjs.miniSol(p)} }.`
        );
        solutions.push({ you: y, win: w, path: p });
        if (EAGER) {
          return solutions;
        }
      }
    }
  }
  return solutions;
}

/**
 * @description Find all possible WIN rules that the agent is able to activate.
 *              If passed a non-empty list of nouns, it will only find WIN rules using those nouns
 * @param {State} state the current game state.
 * @param {Array<Word>} nouns a set of noun words in the game state OR an empty array.
 * @return {Array<Object>} a list of rules and their paths of activation.
 *                         Objects in this list are of the form {rule: <Rule>, path: <path>} 
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
* @description Find all possible rules that change one object into another object type that is already WIN that the agent is able to activate.
*              If passed a non-empty list of subject_nouns, it will only find rules using those nouns AS THE SUBJECT (the thing being transformed)
* @param {State} state the current game state.
* @param {Array<Word>} subject_nouns a set of subject noun words in the game state OR an empty array.
* @return {Array<Object>} a list of rules and their paths of activation.
*                         Objects in this list are of the form {rule: <Rule>, path: <path>} 
*/
function createWin(state, subject_nouns) {
  let win_rules = activeRules(state, []).filter((r) => r.property.name = "win");
  let win_nouns = [];
  let win_connectors = [];
  let has_win_property = [];
  for (rule of win_rules) {
    win_nouns.push(rule.noun);
    win_connectors.push(rule.connector);
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

/**
 * @description Finds all winning paths that can be found by changing any of the changeable rules in the game.
 * @param {State} state the current game state.
 * @return {Array<Object>} A set of winning paths along with which YOU got to which WIN.
 *                         Each object is of the form {you: <you>, win: <win>, path: <path>}
 */
function changeableRulesSolve(state) {
  let solutions = []
  // Can be replaced with one call to canChangeRules, but may be better to leave separated for now to debug
  let deactivatable_rules = canDeactivateRules(state, [])
  let deactivatable_solutions = singleRuleChangeSolve(state, deactivatable_rules)
  solutions = solutions.concat(deactivatable_solutions)
  //solutions.concat(singleRuleChangeSolve(state, canActivateRules(state, [])))
  // TODO: change more than one rule at once (combinations of rules?)
  return solutions
}

/**
 * @description Finds all winning paths that can be found by changing any of the given rules.
 * @param {State} state the current game state.
 * @param {Array<Rule>} rules a set of rules to attempt to change.
 * @return {Array<Object>} A set of winning paths along with which YOU got to which WIN.
 *                         Each object is of the form {you: <you>, win: <win>, path: <path>}
 */
function singleRuleChangeSolve(state, rules) {
  let solutions = []
  // There are no deactivatable rules
  if (rules.length == 0) {
    return [];
  }

  // See if any single rule changed to produce a winning path
  var newState = copy_state(state)
  for (rule of rules) {
    // Change rule and get the new state
    let path = rule.path
    newState = simulate(newState, path)

    // Find if there is a solution now after changing the rule
    let yous = isYou(newState, []);
    let wins = isWin(newState, []);
    let paths = getPaths(newState, yous, wins);
    if (paths.length > 0) {
      let full_path = path.concat(paths[0].path);
      if (EAGER) {
        return full_path;
      }
      solutions.push({ you: paths[0].you, win: paths[0].win, path: full_path });
    }

    // Remember to reset the state to the original
    newState = copy_state(state)
  }
  return solutions;
}

/**
 * @description Employs a default (random) solver if no path can be found by the intelligent solver.
 *              The goal is either to find a winning path, or to find a new state that can be handed to the intelligent solver.
 * @param {State} state the current game state.
 * @returns {Array<String>} a winning path OR calls solve_level again with the updated state.
 */
function defaultSolve(state) {
  console.log("Could not find winning path.\n Default behavior: attempting random steps.");
  let path = makeSeq();
  if (path.length == 0) {
    console.log("Unable to solve this level.");
    return [];
  } else if (validSolution(path, simjs.showState(state))) {
    return path;
  } else { // path to new state
    for (let i = 0; i < path.length; i++) {
      // iterate over game state
      let res = simjs.nextMove(path[i], state);
      state = res['next_state'];
    }
  }
  return solve_level(state); // try to solve level with new state
}

module.exports = { solve_level };
