const { accessGameState } = require("./helpers");
const { floodfill_reachable } = require("./pathing");

/**
 * Each predicate in this file is a filter that will return either a filtered array of given options,
 * or all of the options if if is empty.
 *
 * If an empty list is returned it means that none of the options fit the condition.
 */

/**
 * @description Filter all of the objects that are YOU in the current game state.
 *              If yous is empty, all of the objects that are YOU in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} yous possible values of you to filter OR an empty array.
 * @return {array} all objects in yous that are YOU - or all of them - in the current game state.
 */
function isYou(state, yous) {
  const players = accessGameState(state, "players");

  if (yous.length > 0) {
    yous = yous.filter((y) => players.includes(y));
  } else {
    yous = players;
  }
  return yous;
}

/**
 * @description Filter all of the objects that are WIN in the current game state.
 *              If wins is empty, all of the objects that are WIN in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} wins possible winnable objects OR an empty array.
 * @return {array} all objects in wins that are WIN - or all of them - in the current game state.
 */
function isWin(state, wins) {
  const winnables = accessGameState(state, "winnables");

  if (wins.length > 0) {
    wins = wins.filter((w) => winnables.includes(w));
  } else {
    wins = winnables;
  }
  return wins;
}

/**
 * @description Filter all of the objects that are WIN in the current game state.
 *              If wins is empty, all of the objects that are WIN in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} wins possible winnable objects OR an empty array.
 * @return {array} all objects in wins that are WIN - or all of them - in the current game state.
 */
 function isReachable(state, start, target, path) {


  if (path.length > 0) {
    // step through the path. Check if gets to the target
    var win = false;
    var nextState = state;
    for (let step of path) {
      [nextState, win] = simjs.nextMove(step, nextState);
      if (win) {
        return path;
      }
    }
    return [];
  } else {
    return floodfill_reachable(state, start, target);
  }

}



module.exports = { isYou, isWin, isReachable };
