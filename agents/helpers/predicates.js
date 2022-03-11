const { nextMove } = require("../../js/simulation");
const { accessGameState, deepCopy, deepCopyObject } = require("./helpers");
const { floodfill_reachable, a_star_reachable, Position, add_to_dict, game_bound_check, a_star_avoid_push } = require("./pathing");

const simjs = require("../../js/simulation");

/*  All possible state objects, for reference
 *  let om = state['obj_map'];
    let bm = state['back_map'];
    let is_connectors = state['is_connectors'];
    let rules = state['rules'];
    let rule_objs = state['rule_objs'];
    let sort_phys = state['sort_phys'];
    let phys = state['phys'];
    let words = state['words'];
    let p = state['players'];
    let am = state['auto_movers'];
    let w = state['winnables'];
    let u = state['pushables'];
    let s = state['stoppables'];
    let k = state['killers'];
    let n = state['sinkers'];
    let o = state['overlaps'];
    let uo = state['unoverlaps'];
    let f = state['featured'];
 */

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
        // try A* but pushables are obsticals
        [new_path, path_locations] = a_star_reachable(state, start, target, true);
        if (new_path != []) {
            return new_path;
        }

        // try A*, but ignore obstacles. Send this to canClearPath.
        [new_path, path_locations] = a_star_reachable(state, start, target, false);
        clearing_path = canClearPath(state, path_locations, start);
        // simulate new path
        new_state = deepCopy(state);
        for (move of path) {
            let { next_state, won } = simjs.nextMove(move, new_state);
            new_state = next_state;
        }
        // retry A* when pushables are obstacles. Use new state
        [new_astar, path_locations] = a_star_reachable(new_state, start, target, true);

        // concat clear path and new A*
        full_path = clearing_path.concat(new_astar);

        return full_path;

    }
}

/**
 * @description Filter all of the objects that are WIN in the current game state.
 *              If wins is empty, all of the objects that are WIN in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} wins possible winnable objects OR an empty array.
 * @return {array} all objects in wins that are WIN - or all of them - in the current game state.
 */
function isReachableAvoidPush(state, start, target, path) {
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
        return a_star_avoid_push(state, start, target);
    }
}

/**
 * @description Filter all of the objects that are MOVE in the current game state.
 *              If movers is empty, all of the objects that are MOVE in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} movers possible values of move to filter OR an empty array.
 * @return {array} all objects in movers that are MOVE - or all of them - in the current game state.
 */
function isMove(state, movers) {
    const auto_movers = accessGameState(state, "auto_movers");

    if (movers.length > 0) {
        movers = movers.filter((s) => auto_movers.includes(s));
    } else {
        movers = auto_movers;
    }
    return movers;
}

/**
 * @description Filter all of the objects that are PUSH in the current game state.
 *              If pushes is empty, all of the objects that are PUSH in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} pushes possible values of push to filter OR an empty array.
 * @return {array} all objects in pushes that are PUSH - or all of them - in the current game state.
 */
function isPush(state, pushes) {
    const pushables = accessGameState(state, "pushables");

    if (pushes.length > 0) {
        pushes = pushes.filter((p) => pushables.includes(p));
    } else {
        pushes = pushables;
    }
    return pushes;
}

/**
 * @description Filter all of the objects that are STOP in the current game state.
 *              If stops is empty, all of the objects that are STOP in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} stops possible values of stop to filter OR an empty array.
 * @return {array} all objects in stops that are STOP - or all of them - in the current game state.
 */
function isStop(state, stops) {
    const stoppables = accessGameState(state, "stoppables");

    if (stops.length > 0) {
        stops = stops.filter((s) => stoppables.includes(s));
    } else {
        stops = stoppables;
    }
    return stops;
}


/**
 * @description Filter all of the objects that are KILL in the current game state.
 *              If kills is empty, all of the objects that are KILL in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} kills possible values of kill to filter OR an empty array.
 * @return {array} all objects in kills that are KILL - or all of them - in the current game state.
 */
function isKill(state, kills) {
    const killers = accessGameState(state, "killers");

    if (kills.length > 0) {
        kills = kills.filter((s) => killers.includes(s));
    } else {
        kills = killers;
    }
    return kills;
}

/**
 * @description Filter all of the objects that are SINK in the current game state.
 *              If sinks is empty, all of the objects that are SINK in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} sinks possible values of sink to filter OR an empty array.
 * @return {array} all objects in sinks that are SINK - or all of them - in the current game state.
 */
function isSink(state, sinks) {
    const sinkers = accessGameState(state, "sinkers");

    if (sinks.length > 0) {
        sinks = sinks.filter((s) => sinkers.includes(s));
    } else {
        sinks = sinkers;
    }
    return sinks;
}

/**
 * @description Filter all of the objects that are HOT in the current game state.
 *              If hot_objs is empty, all of the objects that are HOT in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} hot_objs possible values of hot to filter OR an empty array.
 * @return {array} all objects in hot_objs that are HOT - or all of them - in the current game state.
 */
function isHot(state, hot_objs) {
    const featured = accessGameState(state, "featured");

    // if there are no hot objects, return empty list
    if (!("hot" in featured))
        return [];

    const is_hot_objs = featured["hot"];

    if (hot_objs.length > 0) {
        hot_objs = hot_objs.filter((s) => is_hot_objs.includes(s));
    } else {
        hot_objs = is_hot_objs;
    }
    return hot_objs;
}

/**
 * @description Filter all of the objects that are MELT in the current game state.
 *              If melts is empty, all of the objects that are MELT in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} melts possible values of melt to filter OR an empty array.
 * @return {array} all objects in melts that are MELT - or all of them - in the current game state.
 */
function isMelt(state, melts) {
    const featured = accessGameState(state, "featured");

    // if there are no melt objects, return empty list
    if (!("melt" in featured))
        return [];

    const is_melts = featured["melt"];

    if (melts.length > 0) {
        melts = melts.filter((s) => is_melts.includes(s));
    } else {
        melts = is_melts;
    }
    return melts;
}

/**
 * @description Get all the rules in the current game state.
 *              If rules is empty, all of the objects that are RULE in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} rules possible values of rule to filter OR an empty array.
 * @return {array} filter out all rules that are active in the current game state.
 */
function rule(state, rules) {
    const state_rules = accessGameState(state, "rules");

    if (rules.length > 0) {
        rules = rules.filter((r) => state_rules.includes(r));
    } else {
        rules = state_rules;
    }
    return rules;
}

/**
 * @description Get a new path to move pushables out of the way of the A* path
 *              If this cannot be done, return an empty list
 * @param {Object} state the current game state.
 * @param {array} path_locs List of locations as path to the goal, ignoring pushables. 
 * @param {phys_obj} start_obj The start object, likely whatever is YOU.
 * @return {array} a new path that pushes the obstacles out of the way.
 *
 */
function canClearPath(state, path_locs, start_obj) {
    pushables = accessGameState(state, "pushables");
    // TODO - check if pushables includes words?? Will this be an issue?
    push_dict = {};
    push_dict = add_to_dict(pushables, push_dict);

    path_dict = {};
    for (path_loc of path_locs) {
        path_dict[path_loc.get_string()] = path_loc;
    }

    // death things
    const killers = accessGameState(state, "killers");
    const sinkers = accessGameState(state, "sinkers");
    // stoppables
    const stoppables = accessGameState(state, "stoppables");

    // obstacles
    obst_dict = {};
    obst_dict = add_to_dict(killers, obstacles);
    obst_dict = add_to_dict(sinkers, obstacles);
    obst_dict = add_to_dict(stoppables, obstacles);

    // make a new_State for use in moving the pushables
    new_state = deepCopy(state);

    // set the last location as the start_bj location
    last_loc = new Position(start_obj.x, start_obj.y);

    //the running path to move all objects out of the way.
    running_path = [];

    // step through the path to find pushables that are in the way
    for (let i = 0; i < path_locs.length; ++i) {
        cur_str = path_locs[i].get_string();
        if (cur_str in push_dict) {
            // try to push out of the way
            pos_dirs = canPush(new_state, push_dict[cur_str], []);

            chosen_dir = null;
            for (pos_dir of pos_dirs) {
                chosen_dir = pos_dir;
                //step in path direction
                step_str = cur_str;
                step_loc = path_locs[i];
                step_prev_loc = null;
                while ((step_str in path_dict) && !(step_str in obst_dict) &&
                    game_bound_check(new_state, step_loc)) {
                    switch (pos_dir) {
                        case "right":
                            step_prev_loc = step_loc;
                            step_loc = step_loc.get_right();
                            step_str = step_loc.get_string();
                            break;
                        case "up":
                            step_loc = step_loc.get_up();
                            step_str = step_loc.get_string();
                            break;
                        case "left":
                            step_loc = step_loc.get_left();
                            step_str = step_loc.get_string();
                            break;
                        case "down":
                            step_loc = step_loc.get_dn();
                            step_str = step_loc.get_string();
                            break;
                        default:
                            console.log("While loop error in canClearPath.")
                    }
                }

                // check if stepping ended on a obstacle
                if (!(step_str in obst_dict) &&
                    game_bound_check(new_state, step_loc)) {
                    // don't move this direction
                }
                else {
                    break;
                }


            }

            // generate path to move pushable out of the way

            // first, go to the correct side of the pushable
            side_of_push = path_locs[i].get_dir(chosen_dir);

            //path to side of push
            start_loc = last_loc;
            path_to_side = a_star_avoid_push(new_state, start_loc, side_of_push);

            // step in direction until rock not in path. count how many times moved.
            // side_of_push is start location
            counter = 0;
            cur_loc = deepCopyObject(side_of_push);
            push_loc_str = cur_loc.get_dir(chosen_dir).get_string();

            // do checks on the pushable, then count as move

            while ((push_loc_str in path_dict) && !(push_loc_str in obst_dict) &&
                game_bound_check(new_state, step_loc)) {
                counter++;
                cur_loc = cur_loc.get_dir(chosen_dir);
                push_loc_str = cur_loc.get_dir(chosen_dir).get_string();
            }

            //set end location
            last_loc = cur_loc;

            // add the steps of pushing to path to side of push
            full_path = path_to_side;
            for (let j = 0; j < counter; j++) {
                full_path.push(chosen_dir);
            }

            // now full_path is the path to move this object out of the way
            // add the full_path to the running_path
            running_path.concat(full_path);

            // and last_loc is the location YOU end at after pushing the object out of the way
            // simulate path to get new state. Set to "new_state", for use moving the next pushable
            for (move of path) {
                let { next_state, won } = simjs.nextMove(move, new_state);
                new_state = next_state;
            }
        }
    }

    return running_path;
}

/**
 * @description Filter all of the objects in the current game state and can actually be pushed.
 *              If pushes is empty, all of the objects that are PUSH in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} pushes possible values of push to filter OR an empty array.
 * @return {array} all objects in pushes that can be pushed - or all of them - in the current game state. 
 *
 */
function canPushThese(state, pushes) {
    var outList = [];

    // only check the queries that are actually pushable
    isPush(state, pushes).forEach((p) => {
        // add a "pushableDirs" attribute to the pushable object (or clear it if it exists)
        let pushableDirs = canPush(state, p, []);
        if (pushableDirs.length > 0) {
            outList.push({ obj: p, pushableDirs: pushableDirs });
        }
    });

    return outList;
}

/**
 * @description Filter all of the directions that an object can actually be pushed.
 *              If directions is empty, all directions will be checked.
 * @param {State} state the current game state.
 * @param {Object} target the object to push.
 * @param {array} directions possible diretions to filter OR an empty array.
 * @return {array} directions that the target can be pushed in of those given - or all possible.
 *
 */
function canPush(state, target, directions) {
    var outList = [];
    const yous = isYou(state, []);

    if (isPush(state, target).length < 1) {
        // target isn't pushable
        return [];
    }

    // check all directions if unspecified
    if (directions.length < 1) {
        directions = ["up", "down", "right", "left"];
    }

    for (let c of directions) {
        let pushTarget;

        // get the starting location for this push
        switch (c) {
            case "up":
                pushTarget = { x: target.x, y: target.y + 1 }; // start one below
                break;
            case "down":
                pushTarget = { x: target.x, y: target.y - 1 }; // start one above
                break;

            case "left":
                pushTarget = { x: target.x + 1, y: target.y }; // start one to the right
                break;

            case "right":
                pushTarget = { x: target.x - 1, y: target.y - 1 }; // start one to the left
                break;

            default:
                console.error(`Cannot read direction "${c}"`);
        }

        // ignoring side effects, greedily see if any YOU object can push the target

        for (let you of yous) {
            let reachablePath = isReachable(state, you, pushTarget, []);

            // check that the direction is reachable
            if (reachablePath.length > 0) {
                // see if it moves in the game state at that direction
                // TODO: change this to simjs.newState() - its probably a lot faster
                let pushState = reachablePath.reduce(function (
                    currState,
                    step
                ) {
                    return simjs.nextMove(step, currState)["next_state"];
                },
                    state);

                // did the state change?
                // TODO: we may need to do this a different way when levels become more complex
                //       maybe could check if a "you" object made it into the target location or something

                if (
                    simjs.showState(pushState) !==
                    simjs.showState(simjs.nextMove(c, pushState)["next_state"])
                ) {
                    outList.push(c);
                    break;
                }
            }
        }
    }

    return outList;
}

module.exports = {
    isYou,
    isWin,
    isReachable,
    isMove,
    isPush,
    isStop,
    isKill,
    isSink,
    isHot,
    isMelt,
    rule,
    canPush,
    canPushThese,
};
