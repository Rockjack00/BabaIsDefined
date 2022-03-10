const { isYou, isWin, isReachable } = require("./predicates");

// Optionally do eager evaluation (depth first)
const EAGER = false;

/**
 * @description Find a winning path in the current game state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} path an array of steps to take to win a level.
 * @return {array} a winning path.
 */
function solve_level(state) {
    var yous = isYou(state, []);

    /**
     * Are any objects that are YOU also WIN?
     * Not sure we could ever get here since win is evaluated after a move is made, not before
     */
    {
        // filter out all of the yous that are also wins
        let opts = isWin(state, yous);

        if (opts.length > 0) {
            const plural = opts.length > 1;
            console.log(
                `${opts} ${plural ? "are" : "is a"} winable object${
                    plural ? "s" : ""
                }.`
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

            if (p != []) {
                console.log(`${y} can reach ${w} by taking the path ${p}.`);
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
    return false;
}

module.exports = { solve_level };
