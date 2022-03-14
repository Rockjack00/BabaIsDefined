const { nextMove } = require("../../js/simulation");
const { accessGameState, deepCopy, deepCopyObject, copy_state, Position, add_to_dict, permutations_of_list, static, simulate } = require("./helpers");
const { floodfill_reachable, a_star_reachable, game_bound_check, a_star_avoid_push, a_star_pushing } = require("./pathing");
const { generateRules, generatePropertyRules, generateNounRules, canChangeRules, canActivateRules, activeRules, getRules } = require("./rules");

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
 * start object. Target object
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
        let new_path, path_locations;
        // TODO - a_star_reachable needs to return blank when no path found.
        [new_path, path_locations] = a_star_reachable(state, start, target, true, []);
        if (new_path.length != 0) {
            return new_path;
        }

        // try A*, but ignore obstacles. Send this to canClearPath.
        [new_path, path_locations] = a_star_reachable(state, start, target, false, []);
        [clearing_path, moved_pushables, last_loc] = canClearPath(state, path_locations, start, []);

        // simulate new path
        let new_state = copy_state(state);
        new_state = clearing_path.reduce(function (currState, step) {
            return simjs.nextMove(step, currState)["next_state"];
        }, new_state);

        // retry A* when pushables are obstacles. Use new state
        [new_astar, path_locations] = a_star_reachable(new_state, last_loc, target, true, []);

        // if it cannot get to the goal after clearing the path, 
        // try A* and clear path again, but consider the last pushable an obstacle.
        // retry A*
        // do this until no pushables are left. Return empty list if this happens.
        if (new_astar.length == 0) {
            clearing_path = [];
            avoid_these_1 = moved_pushables;
            avoid_perms = permutations_of_list(avoid_these_1);
            for (avoid_these of avoid_perms) {
                while (new_astar.length == 0) {
                    // try A* and clear path again, but consider the last pushable an obstacle.
                    [new_astar, path_locations] = a_star_reachable(state, start, target, false, avoid_these);
                    [clearing_path, moved_pushables, last_loc] = canClearPath(state, path_locations, start, avoid_these);

                    // simulate new path
                    let new_state = state;
                    new_state = clearing_path.reduce(function (currState, step) {
                        return simjs.nextMove(step, currState)["next_state"];
                    }, new_state);

                    // retry A* when pushables are obstacles. Use new state
                    [new_astar, path_locations] = a_star_reachable(new_state, last_loc, target, true, []);

                    avoid_these = avoid_these.concat(moved_pushables);

                }
                // if (new_astar.length != 0) {
                //     break;
                // }
            }
        }

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
    pushables.concat(accessGameState(state, "words"));

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
    if (!("hot" in featured)) return [];

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
    if (!("melt" in featured)) return [];

    const is_melts = featured["melt"];

    if (melts.length > 0) {
        melts = melts.filter((s) => is_melts.includes(s));
    } else {
        melts = is_melts;
    }
    return melts;
}

/**
 * @description Get a new path to move pushables out of the way of the A* path
 *              If this cannot be done, return an empty list
 * @param {Object} state the current game state.
 * @param {array} path_locs List of locations as path to the goal, ignoring pushables. 
 * @param {phys_obj} start_obj The start object, likely whatever is YOU.
 * @param {array} avoid_these Avoid these pushable locations, because a previous time they caused a loss.
 * @return {[array,array]} a new path that pushes the obstacles out of the way.
 *                          and a list of the moved obstacles.
 *
 */
function canClearPath(state, path_locs, start_obj, avoid_these) {
    let moved_pushables = [];
    pushables = accessGameState(state, "pushables");
    // TODO - check if pushables includes words?? Will this be an issue?
    push_dict = {};
    obst_dict = {};
    push_dict = add_to_dict(pushables, push_dict);

    path_dict = {};
    for (path_loc of path_locs) {
        path_dict[path_loc.get_string()] = path_loc;
    }

    //remove avoid_these from push_dict. Add to obst_dict instead
    for (avoid_this of avoid_these) {
        avoid_str = avoid_this.get_string();
        obst_dict[avoid_str] = push_dict[avoid_str];
        delete push_dict[avoid_str];
    }

    if (push_dict.length == 0) {
        return [[], [], []];
    }

    // death things
    const killers = accessGameState(state, "killers");
    const sinkers = accessGameState(state, "sinkers");
    // stoppables
    const stoppables = accessGameState(state, "stoppables");
    // words
    const words = accessGameState(state, "words");

    // obstacles
    obst_dict = add_to_dict(killers, obst_dict);
    obst_dict = add_to_dict(sinkers, obst_dict);
    obst_dict = add_to_dict(stoppables, obst_dict);
    obst_dict = add_to_dict(words, obst_dict);

    // make a new_State for use in moving the pushables
    // temp_str = simjs.showState(state);
    // new_state = simjs.newState(temp_str);
    let new_state = copy_state(state);

    // set the last location as the start_bj location
    last_loc = new Position(start_obj.x, start_obj.y);

    //the running path to move all objects out of the way.
    running_path = [];

    // checks if it can push, but cannot path out of the way
    danger_push = [];

    // step through the path to find pushables that are in the way
    for (let i = 0; i < path_locs.length; ++i) {
        cur_str = path_locs[i].get_string();
        if (cur_str in push_dict) {
            // first, add to moved_pushables
            moved_pushables.push(path_locs[i]);

            // try to push out of the way
            pos_dirs = canPush(new_state, push_dict[cur_str], []);

            if (pos_dirs.length == 0) {
                break;
            }

            chosen_dir = null;
            for (pos_dir of pos_dirs) {
                //step in path direction
                step_str = cur_str;
                step_loc = path_locs[i];
                step_prev_loc = null;
                while ((step_str in path_dict) && !(step_str in obst_dict) &&
                    game_bound_check(new_state, step_loc)) {
                    step_prev_loc = step_loc;
                    step_loc = step_loc.get_dir(pos_dir);
                    step_str = step_loc.get_string();

                }

                // check if stepping ended on a obstacle
                // game_bound = game_bound_check(new_state, step_loc);
                if ((step_str in obst_dict) ||
                    (!game_bound_check(new_state, step_loc))) {
                    danger_push.push(pos_dir);
                    continue;
                }
                else {
                    danger_push = [];
                    chosen_dir = pos_dir;
                    break;
                }


            }
            // check if path could not be cleared. This is when we incrementally push and recheck
            if (chosen_dir == null) {
                break;
            }

            // generate path to move pushable out of the way

            // first, go to the correct side of the pushable
            // note that the side of the pushable is opposite the direction you want to push it
            side_of_push = null;
            switch (chosen_dir) {
                case "right":
                    side_of_push = path_locs[i].get_left();
                    break;
                case "up":
                    side_of_push = path_locs[i].get_dn();
                    break;
                case "left":
                    side_of_push = path_locs[i].get_right();
                    break;
                case "down":
                    side_of_push = path_locs[i].get_up();
                    break;
            }


            //path to side of push
            start_loc = last_loc;
            [path_to_side, temp_list] = a_star_avoid_push(new_state, start_loc, side_of_push);

            // step in direction until rock not in path. count how many times moved.
            // side_of_push is start location
            counter = 0;
            cur_loc = side_of_push;
            push_loc_str = cur_loc.get_dir(chosen_dir).get_string();

            // do checks on the pushable, then count as move

            while ((push_loc_str in path_dict) && !(push_loc_str in obst_dict) &&
                game_bound_check(new_state, step_loc)) {
                counter++;
                cur_loc = cur_loc.get_dir(chosen_dir);
                push_loc_str = cur_loc.get_dir(chosen_dir).get_dir(chosen_dir).get_string();
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
            running_path = running_path.concat(full_path);

            // and last_loc is the location YOU end at after pushing the object out of the way
            // simulate path to get new state. Set to "new_state", for use moving the next pushable
            for (move of full_path) {
                let { next_state, won } = simjs.nextMove(move, new_state);
                new_state = next_state;
            }

            // if it can push, just not out of the path, recursively call isReachable
            if (danger_push.length != 0) {
                cur_state = copy_state(state);
                prev_state = null;
                for (push_dir in danger_push) {
                    // set the last location as the start_obj location
                    last_loc = new Position(start_obj.x, start_obj.y);

                    // first, go to the correct side of the pushable
                    // note that the side of the pushable is opposite the direction you want to push it
                    side_of_push = null;
                    switch (pos_dir) {
                        case "right":
                            side_of_push = path_locs[i].get_left();
                            break;
                        case "up":
                            side_of_push = path_locs[i].get_dn();
                            break;
                        case "left":
                            side_of_push = path_locs[i].get_right();
                            break;
                        case "down":
                            side_of_push = path_locs[i].get_up();
                            break;
                    }


                    //path to side of push
                    start_loc = last_loc;
                    [path_to_side, temp_list] = a_star_avoid_push(new_state, start_loc, side_of_push);

                    // and last_loc is the location YOU end at after pushing the object out of the way
                    // simulate path to get new state. Set to "new_state", for use moving the next pushable
                    for (move of path_to_side) {
                        let { next_state, won } = simjs.nextMove(move, cur_state);
                        cur_state = next_state;
                    }
                    last_loc = side_of_push;

                    cur_yous = isYou(cur_state, []);
                    prev_yous = [];

                    // move in direction one space. get the new state.
                    let { next_state, won } = simjs.nextMove(move, cur_state);
                    last_loc = last_loc.get_dir(push_dir);
                    cur_state = next_state;
                    obj_dict = add_to_dict(cur_state.phys, {});
                    obj_dict = add_to_dict(cur_state.words, obj_dict);

                    // recursively retry isReachable with new state
                    start_loc = obj_dict[last_loc.get_string()];
                    target_loc = path_locs[path_locs.length - 1];
                    path_reachable = isReachable(cur_state, start_loc, target_loc, []);

                    if (path_reachable.length != 0) {
                        running_path = [push_dir].concat(path_reachable);
                    }
                }

            }
        }
    }

    return [running_path, moved_pushables, last_loc];
}

/**
 * @description Filter all of the objects in the current game state and can actually be pushed.
 *              If pushes is empty, all of the objects that are PUSH in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} pushes possible values of push to filter OR an empty array.
 * @return {array} all objects in pushes that can be pushed - or all of them - in the current game state.
 *                 returns a list of objects of the form: 
 *                      {obj: <object>, directions: [{direction:<dir>, path: <p>}, ...]}.
 *
 */
function canPushThese(state, pushes) {
    var outList = [];

    // only check the queries that are actually pushable
    isPush(state, pushes).forEach((p) => {
        let pushableDirs = canPush(state, p, []);
        if (pushableDirs.keys().length > 0) {
            outList.push({ "obj": p, "directions": pushableDirs });
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
 *                 items in this list are key/value pairs of the form {direction: <dir>, path: <path-to-take>}
 *
 */
function canPush(state, target, directions) {
    var state = copy_state(state);
    var outList = [];
    const yous = isYou(state, []);

    if (isPush(state, target).length < 1) {
        // target isn't pushable
        return [];
    }

    if (static(state, target)) {
        // target is inacessable
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
            // let reachablePath = isReachable(state, you, pushTarget, []);

            // get the starting location for this push
            switch (c) {
                case "up":
                    pushTarget = new Position(target.x, target.y + 1); // start one below
                    break;
                case "down":
                    pushTarget = new Position(target.x, target.y - 1); // start one above
                    break;

                case "left":
                    pushTarget = new Position(target.x + 1, target.y); // start one to the right
                    break;

                case "right":
                    pushTarget = new Position(target.x - 1, target.y); // start one to the left
                    break;

                default:
                    console.error(`Cannot read direction "${c}"`);
            }

            // ignoring side effects, greedily see if any YOU object can push the target

            for (let you of yous) {
                you_pos = new Position(you.x, you.y);
                let [reachablePath, locs] = a_star_avoid_push(state, you_pos, pushTarget);

                // check that the direction is reachable
                if (reachablePath.length > 0) {
                    // see if it moves in the game state at that direction
                    let pushState = simulate(state, reachablePath);

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
                // check that the direction is reachable
                if (reachablePath.length > 0) {
                    // see if it moves in the game state at that direction
                    // TODO: change this to simjs.newState() - its probably a lot faster
                    let pushState = reachablePath.reduce(function (currState, step) {
                        return simjs.nextMove(step, currState)["next_state"];
                    }, state);

                    // did the state change?
                    // TODO: we may need to do this a different way when levels become more complex
                    //       maybe could check if a "you" object made it into the target location or something

                    if (
                        simjs.showState(pushState) !==
                        simjs.showState(simjs.nextMove(c, pushState)["next_state"])
                    ) {
                        outList.push({ "direction": c, "path": reachablePath });
                        break;
                    }
                }
            }
        }
    }

    return outList;
}

/**
 * @description evaluate the path required to push a target to a location. 
 *              If path is not empty, just see if it works.
 * @param {*} state the current game state
 * @param {*} target the object to be pushed
 * @param {*} end_location the location the object needs to end up in
 * @param {*} path a path to get there.
 * @returns A path that succeeds, or the empty list if none are found.
 */
function canPushTo(state, target, end_location, path) {

    // first, do canPush to get initial pushable directions. 
    p_dirs = canPush(state, target, []);

    target_loc = new Position(target.x, target.y);

    // ignore side-effects, for each YOU, try the following
    yous = isYou(state, []);
    for (you of yous) {
        you_pos = new Position(you.x, you.y);

        // for each direction, try a path. Always include the first move here, then the path follows. 
        for (push_dir in p_dirs) {
            // first path to the start. Always opposite of move direction
            start_loc = null;
            switch (push_dir) {
                case "left":
                    start_loc = target_loc.get_right();
                    break;
                case "right":
                    start_loc = target_loc.get_left();
                    break;
                case "up":
                    start_loc = target_loc.get_dn();
                    break;
                case "down":
                    start_loc = target_loc.get_up();
                    break;
            }
            path_to_side = a_star_avoid_push(state, you_pos, start_loc);

            // if that fails, continue loop
            if (path_to_side.length == 0) {
                continue;
            }
            // path to the end. 
            path_pushing = a_star_pushing(state, target_loc, end_location);
            // if it fails, try the next push direction available
            if (path_pushing.length == 0) {
                continue;
            }
            // if that succeeds, then you have a path. combine path_to_side, the first move, and path_pushing
            running_path = path_to_side.concat([push_dir], path_pushing);
            // return this path
            return running_path;
        }
    }
    // exit for loop and return [] since no path found
    return []

    /* I did not use this at all. But the above should work. Leaving this here until the above is tested. 
    if (path.length > 0) {
        // simulate the path and see if it ends up in the right spot
    }

        let pushed = target;

        TODO: push_a_star(state, target, location) :  (yo mama's so fat she can push a star) 
            A* where at every move, the pusher has to be able to path to the opposite direction of travel of the pushed object
            
            Use A* with the target, but at every node update the pusher path instead:
                
                let pusher_path = parent_node.pusher_path; // grab the path to the last node

                step =               // the direction at this node
                currState =          // state at this step
                pushed_target =      // the target that now has a new location
                
                let pushableDirs = canPushThese(currState,pushed_target).directions
                let direction = pushableDirs.find((choice) =>{
                    return choice.direction == step
                })

                // if it's not empty add the path at this node
                if (direction) {

                    //concat onto the parent node's path
                    node.pusher_path.concat(direction.path)

                    // recurse
                }

                // else don't recurse

    */
}


/**
 * @description Filter all of the objects that are NOUN in the current game state.
 *              If nouns is empty, all of the objects that are NOUN in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} nouns possible values of NOUN to filter OR an empty array.
 * @return {array} all objects in nouns that are NOUN - or all of them - in the current game state.
 * 
 */
function isNoun(state, nouns) {
    const word_objs = accessGameState(state, "rule_phys");
    const noun_words = ["baba", "bone", "flag", "wall", "grass", "lava", "rock", "floor", "keke", "goop", "love"]
    noun_objs.filter((w) => noun_words.includes(w.name))

    if (nouns.length > 0) {
        nouns = nouns.filter((n) => noun_objs.includes(n));
    } else {
        nouns = noun_objs;
    }
    return nouns;
}

/**
 * @description Filter all of the objects that are CONNECTOR in the current game state.
 *              If connectors is empty, all of the objects that are CONNECTOR in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} connectors possible values of CONNECTOR to filter OR an empty array.
 * @return {array} all objects in connectors that are CONNECTOR - or all of them - in the current game state.
 * 
 */
function isConnector(state, connectors) {
    const word_objs = accessGameState(state, "rule_phys");
    const connector_words = ["is"]
    connector_objs = word_objs.filter((w) => connector_words.includes(w.name))

    if (connectors.length > 0) {
        connectors = connectors.filter((c) => connector_objs.includes(c));
    } else {
        connectors = connector_objs;
    }
    return connectors;
}

/**
 * @description Filter all of the objects that are PROPERTY in the current game state.
 *              If properties is empty, all of the objects that are PROPERTY in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} properties possible values of PROPERTY to filter OR an empty array.
 * @return {array} all objects in properties that are PROPERTY - or all of them - in the current game state.
 * 
 */
function isProperty(state, properties) {
    const word_objs = accessGameState(state, "rule_phys");
    const property_words = ["you", "win", "stop", "win", "push", "sink", "kill", "hot", "melt"]
    property_objs = word_objs.filter((w) => property_words.includes(w.name))

    if (properties.length > 0) {
        properties = properties.filter((p) => property_objs.includes(p));
    } else {
        properties = property_objs;
    }
    return properties;
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
    canPush,
    canPushThese,
    canPushTo,
    isNoun,
    isConnector,
    isProperty,
    assertWin,
    createWin
};
