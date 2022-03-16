const { accessGameState, copy_state, Position, add_to_dict, permutations_of_list, static, neighbors, simulate, pushing_side, state_equality, simulate_pos } = require("./helpers");
const { floodfill_reachable, a_star_reachable, game_bound_check, a_star_avoid_push, a_star_pushing } = require("./pathing");

const simjs = require("../../js/simulation");

/**
 * Each predicate in this file is a filter that will return either a filtered array of given options,
 * or all of the options if if is empty.
 *
 * If an empty list is returned it means that none of the options fit the condition.
 */

/**
 * Filter all of the objects that are YOU in the current game state.
 * If yous is empty, all of the objects that are YOU in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} yous possible values of you to filter OR an empty array.
 * @return {Array<Object>} all objects in yous that are YOU - or all of them - in the current game state.
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
 * Filter all of the objects that are WIN in the current game state.
 * If wins is empty, all of the objects that are WIN in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} wins possible winnable objects OR an empty array.
 * @return {Array<Object>} all objects in wins that are WIN - or all of them - in the current game state.
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

// TODO: If path is not empty, see if the target gets moved to the end of the path
/**
 * Check if an object can get to a location.
 * @param {State} state the current game state.
 * @param {Object} start the object to test if it can reach the target.
 * @param {Object} target an object to try to get to.
 * @param {Array<String>} path a path to test if start gets to the target.
 * @returns {Array<String>} a path to the target if it exists, or the empty list if it doesn't.
 */
function isReachable(state, start, target, path) {

    // path was given to test
    if (path.length > 0) {
        if (simjs.nextMove(path[path.length - 1], simulate(state, path.slice(path.length - 1)))[1]) {
            return path;
        } else {
            return [];
        }
    }

    // try A* but pushables are obsticals
    let [new_path, path_locations] = a_star_reachable(state, start, target, true, []);
    if (new_path.length != 0) {
        return new_path;
    }

    // try A*, but ignore obstacles. Send this to canClearPath.
    [new_path, path_locations] = a_star_reachable(state, start, target, false, []);
    let [clearing_path, moved_pushables, last_loc] = canClearPath(state, path_locations, start, []);

    // simulate new path
    let new_state = simulate(state, clearing_path);

    // retry A* when pushables are obstacles. Use new state
    let new_astar;
    [new_astar, path_locations] = a_star_reachable(new_state, last_loc, target, true, []);

    // if it cannot get to the goal after clearing the path, 
    // try A* and clear path again, but consider the last pushable an obstacle.
    // retry A*
    // do this until no pushables are left. Return empty list if this happens.
    if (new_astar.length == 0) {
        clearing_path = [];
        let avoid_these_1 = moved_pushables;
        let avoid_perms = permutations_of_list(avoid_these_1);
        for (let avoid_these of avoid_perms) {
            // try A* and clear path again, but consider the last pushable an obstacle.
            [new_astar, path_locations] = a_star_reachable(state, start, target, false, avoid_these);
            [clearing_path, moved_pushables, last_loc] = canClearPath(state, path_locations, start, avoid_these);

            // simulate new path
            new_state = simulate(new_state, clearing_path);

            // retry A* when pushables are obstacles. Use new state
            [new_astar, path_locations] = a_star_reachable(new_state, last_loc, target, true, []);

            if (new_astar.length != 0) {
                break;
            }
        }
    }

    // concat clear path and new A*
    let full_path = clearing_path.concat(new_astar);

    return full_path;

}

/**
 * Filter all of the objects that are MOVE in the current game state.
 * If movers is empty, all of the objects that are MOVE in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} movers possible values of move to filter OR an empty array.
 * @return {Array<Object>} all objects in movers that are MOVE - or all of them - in the current game state.
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
 * Filter all of the objects that are PUSH in the current game state.
 * If pushes is empty, all of the objects that are PUSH in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} pushes possible values of push to filter OR an empty array.
 * @return {Array<Object>} all objects in pushes that are PUSH - or all of them - in the current game state.
 */
function isPush(state, pushes) {
    let pushables = accessGameState(state, "pushables");
    pushables = pushables.concat(accessGameState(state, "words"));

    if (pushes.length > 0) {
        pushes = pushes.filter((p) => pushables.includes(p));
    } else {
        pushes = pushables;
    }
    return pushes;
}

/**
 * Filter all of the objects that are STOP in the current game state.
 * If stops is empty, all of the objects that are STOP in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} stops possible values of stop to filter OR an empty array.
 * @return {Array<Object>} all objects in stops that are STOP - or all of them - in the current game state.
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
 * Filter all of the objects that are KILL in the current game state.
 * If kills is empty, all of the objects that are KILL in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} kills possible values of kill to filter OR an empty array.
 * @return {Array<Object>} all objects in kills that are KILL - or all of them - in the current game state.
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
 * Filter all of the objects that are SINK in the current game state.
 * If sinks is empty, all of the objects that are SINK in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} sinks possible values of sink to filter OR an empty array.
 * @return {Array<Object>} all objects in sinks that are SINK - or all of them - in the current game state.
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
 * Filter all of the objects that are HOT in the current game state.
 * If hot_objs is empty, all of the objects that are HOT in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} hot_objs possible values of hot to filter OR an empty array.
 * @return {Array<Object>} all objects in hot_objs that are HOT - or all of them - in the current game state.
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
 * Filter all of the objects that are MELT in the current game state.
 * If melts is empty, all of the objects that are MELT in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} melts possible values of melt to filter OR an empty array.
 * @return {Array<Object>} all objects in melts that are MELT - or all of them - in the current game state.
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

// TODO: move this function into strategy.js?
/**
 * Get a new path to move pushables out of the way of the A* path
 * If this cannot be done, return an empty list
 * @param {State} state the current game state.
 * @param {Array<Position>} path_locs List of Positions as path to the goal, ignoring pushables. 
 * @param {Object} start_obj The start object, likely whatever is YOU.
 * @param {Array<Position>} avoid_these Avoid these pushable Positions, because a previous time they caused a loss.
 * @return {[Array<String>, Array<Position>]} a new path that pushes the obstacles out of the way and a list of the moved obstacles.
 */
function canClearPath(state, path_locs, start_obj, avoid_these) {
    let moved_pushables = [];
    let temp;
    const pushables = accessGameState(state, "pushables");
    // TODO - check if pushables includes words?? Will this be an issue?
    let obst_dict = {};
    let temp_push_dict = add_to_dict(pushables, {});

    let path_dict = {};
    for (let path_loc of path_locs) {
        path_dict[path_loc.get_string()] = path_loc;
    }

    //remove avoid_these from push_dict. Add to obst_dict instead
    for (let avoid_this of avoid_these) {
        let avoid_str = avoid_this.get_string();
        obst_dict[avoid_str] = temp_push_dict[avoid_str];
        delete temp_push_dict[avoid_str];
    }
    const push_dict = temp_push_dict;

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
    let new_state = copy_state(state);

    // set the last location as the start_bj location
    let last_loc = new Position(start_obj.x, start_obj.y);

    //the running path to move all objects out of the way.
    let running_path = [];

    // checks if it can push, but cannot path out of the way
    let danger_push = [];

    // step through the path to find pushables that are in the way
    for (let i = 0; i < path_locs.length; ++i) {
        let cur_str = path_locs[i].get_string();
        if (cur_str in push_dict) {
            path_reachable = [];
            // first, add to moved_pushables
            temp = new Position(path_locs[i].x, path_locs[i].y);
            moved_pushables.push(temp);

            // try to push out of the way. {direction: <dir>, path: <path-to-take>}

            let pos_dirs_dict_temp = canPush(new_state, push_dict[cur_str], []);
            let pos_dirs_dict = {};
            let pos_dirs = [];

            for (let key of pos_dirs_dict_temp.keys()) {
                pos_dirs_dict[pos_dirs_dict_temp[key]['direction']] = pos_dirs_dict_temp[key]['path'];
                pos_dirs.push(pos_dirs_dict_temp[key]['direction']);
            }

            if (pos_dirs.length == 0) {
                break;
            }

            let chosen_dir = null;
            let step_loc = path_locs[i];

            for (let pos_dir of pos_dirs) {
                //step in path direction
                let step_str = cur_str;
                while ((step_str in path_dict) && !(step_str in obst_dict) && game_bound_check(new_state, step_loc)) {
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
            if (chosen_dir != null) {

                // generate path to move pushable out of the way
                // first, go to the correct side of the pushable
                // note that the side of the pushable is opposite the direction you want to push it
                let side_of_push = pushing_side(path_locs[i], chosen_dir);

                //path to side of push. TODO- might be an issue when multiple yous?
                let path_to_side = pos_dirs_dict[chosen_dir];

                // step in direction until rock not in path. count how many times moved.
                // side_of_push is start location
                let counter = 0;
                let cur_loc = side_of_push;
                let push_loc_str = cur_loc.get_dir(chosen_dir).get_string();

                // do checks on the pushable, then count as move
                while ((push_loc_str in path_dict) && !(push_loc_str in obst_dict) && game_bound_check(new_state, step_loc)) {
                    counter++;
                    cur_loc = cur_loc.get_dir(chosen_dir);
                    push_loc_str = cur_loc.get_dir(chosen_dir).get_string();
                }

                //set end location
                last_loc = cur_loc;

                // add the steps of pushing to path to side of push
                let full_path;
                if (path_to_side[0] != "space") {
                    full_path = path_to_side;
                    for (let j = 0; j < counter; j++) {
                        full_path.push(chosen_dir);
                    }
                }
                else {
                    full_path = [];
                }

                // now full_path is the path to move this object out of the way
                // add the full_path to the running_path
                running_path = running_path.concat(full_path);

                // and last_loc is the location YOU end at after pushing the object out of the way
                // simulate path to get new state. Set to "new_state", for use moving the next pushable
                new_state = simulate(new_state, full_path);
            }

            // if it can push, just not out of the path, recursively call isReachable
            if (danger_push.length != 0) {
                for (let push_dir_temp of danger_push) {
                    const push_dir = push_dir_temp;
                    let cur_state = copy_state(state);
                    // set the last location as the start_obj location
                    // last_loc = new Position(start_obj.x, start_obj.y);

                    // first, go to the correct side of the pushable
                    // note that the side of the pushable is opposite the direction you want to push it
                    let side_of_push = pushing_side(path_locs[i], push_dir);


                    //path to side of push
                    const path_to_side_2 = pos_dirs_dict[push_dir];

                    // and last_loc is the location YOU end at after pushing the object out of the way
                    // simulate path to get new state. Set to "cur_state", for use moving the next pushable
                    cur_state = simulate(cur_state, path_to_side_2);

                    // move in direction one space. get the new state. 
                    //Check that the new state is different from the prev_state. If not, exit before recursive call
                    cur_state = simulate(cur_state, [push_dir]);
                    if (!state_equality(state, cur_state)) {
                        last_loc = simulate_pos(last_loc, path_to_side_2);
                        last_loc = last_loc.get_dir(push_dir);
                        let target_loc = path_locs[path_locs.length - 1];
                        let obj_dict = add_to_dict(cur_state.phys, {});
                        obj_dict = add_to_dict(cur_state.words, obj_dict);


                        let start_obj_1 = obj_dict[last_loc.get_string()];
                        let target_obj_1 = obj_dict[target_loc.get_string()];

                        // try A* as pushables are obstacles
                        let temp_path, new_locs;
                        [temp_path, new_locs] = a_star_reachable(cur_state, start_obj_1, target_obj_1, true, []);
                        if (temp_path.length != 0) {
                            if (path_to_side_2[0] != 'space') {
                                running_path = path_to_side_2.concat([push_dir]);
                            }
                            else {
                                running_path = [push_dir];
                            }
                            break;
                        }

                        // try A* ignoring pushables,except avoid_these
                        [temp_path, new_locs] = a_star_reachable(cur_state, start_obj_1, target_obj_1, false, avoid_these);
                        // recursively retry canClearPath with new state and new path locations
                        let clearing_path, _temp_pushed;
                        [clearing_path, _temp_pushed, last_loc] = canClearPath(cur_state, new_locs, start_obj_1, []);

                        if (clearing_path.length != 0) {
                            if (path_to_side_2[0] != 'space') {
                                running_path = path_to_side_2.concat([push_dir], clearing_path);
                            }
                            else {
                                running_path = [push_dir].concat(clearing_path);
                            }
                            break;
                        }
                    }
                }
                if (running_path.length != 0) {
                    break;
                }
            }
        }
    }

    if (running_path.length == 0) {
        last_loc = new Position(start_obj.x, start_obj.y);
    }
    return [running_path, moved_pushables, last_loc];
}

// TODO: move this function into strategy.js?
/**
 * Filter all of the objects in the current game state and can actually be pushed.
 * If pushes is empty, all of the objects that are PUSH in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} pushes possible values of push to filter OR an empty array.
 * @return {Array<Object>} all objects in pushes that can be pushed - or all of them - in the current game state.
 *                         returns a list of objects of the form: 
 *                              {obj: <object>, directions: [{direction:<dir>, path: <p>}, ...]}.
 */
function canPushThese(state, pushes) {
    let outList = [];

    // only check the queries that are actually pushable
    isPush(state, pushes).forEach((p) => {
        let pushableDirs = canPush(state, p, []);
        if (pushableDirs.keys().length > 0) {
            outList.push({ "obj": p, "directions": pushableDirs });
        }
    });

    return outList;
}

// TODO: move this function into strategy.js?
/**
 * Filter all of the directions that an object can actually be pushed.
 * If directions is empty, all directions will be checked.
 * @param {State} state the current game state.
 * @param {Object} target the object to push.
 * @param {Array<String>} directions possible diretions to filter OR an empty array.
 * @return {Array<Object>} directions that the target can be pushed in of those given - or all possible.
 *                         items in this list are key/value pairs of the form {direction: <dir>, path: <path-to-take>}
 */
function canPush(state, target, directions) {
    let state_copy = copy_state(state);
    let outList = [];


    // check all directions if unspecified
    if (directions.length < 1) {
        directions = ["up", "down", "right", "left"];
    }

    for (let c of directions) {
        let reachablePath = canPushInDirection(state_copy, target, c);
        if (reachablePath.length > 0) {
            outList.push({ "direction": c, "path": reachablePath });
        }
    }

    return outList;
}

/**
 * Get the path to push a target in a direction
 * @param {State} state the current game state.
 * @param {Object} target the object to push.
 * @param {String} direction the direction to push in
 * @return {Array<String>} Path to get to a target to push it if found, else the empty list
 */
function canPushInDirection(state, target, direction) {
    const yous = isYou(state, []);

    if (isPush(state, target).length < 1) {
        // target isn't pushable
        return [];
    }

    if (static(state, target)) {
        // target is inacessable
        return [];
    }

    let pushTarget;

    // get the starting location for this push
    switch (direction) {
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
            console.error(`Cannot read direction "${direction}"`);
    }

    // ignoring side effects, greedily see if any YOU object can push the target
    for (let you of yous) {

        // first check if the pushTarget is reachable
        let [reachablePath, _] = a_star_avoid_push(state, new Position(you.x, you.y), pushTarget);

        // if not, recursively check if any object in the way can be pushed in the target direction
        if (reachablePath.length == 0) {
            let pushableNeighbors = neighbors(state, target).filter((n) => {
                return n.direction == direction;
            })

            if (pushableNeighbors.length > 0) {
                reachablePath = canPushInDirection(state, pushableNeighbors[0].neighbor, direction);
            }
        }

        // check that the prediction was actually possible in the simulator
        if (reachablePath.length > 0) {
            // see if it moves in the game state at that direction
            let pushState = simulate(state, reachablePath);

            // did the state change?
            // TODO: we may need to do this a different way when levels become more complex
            //       maybe could check if a "you" object made it into the target location or something
            if (
                simjs.showState(pushState) !==
                simjs.showState(simjs.nextMove(direction, pushState)["next_state"])
            ) {
                // eagerly return the first reachable path
                return reachablePath;
            }
        }
    }

    // Path wasn't found
    return [];
}

// TODO: add the last pushing action to the path
/**
 * Evaluate the path required to push a target to a location. 
 * @param {State} state the current game state
 * @param {Object} target the object to be pushed
 * @param {Position} end_location the Position the object needs to end up in
 * @returns {Array<String>} A path that succeeds, or the empty list if none are found.
 */
function canPushTo(state, target, end_location) {

    // first, do canPush to get initial pushable directions. 
    let pos_dirs_dict_temp = canPush(state, target, []);
    let pos_dirs_dict = {};
    let pos_dirs = [];

    for (let key of pos_dirs_dict_temp.keys()) {
        pos_dirs_dict[pos_dirs_dict_temp[key]['direction']] = pos_dirs_dict_temp[key]['path'];
        pos_dirs.push(pos_dirs_dict_temp[key]['direction']);
    }

    let target_loc = new Position(target.x, target.y);

    // ignore side-effects, for each YOU, try the following
    let yous = isYou(state, []);
    for (let you of yous) {
        let you_pos = new Position(you.x, you.y);

        // for each direction, try a path. Always include the first move here, then the path follows. 
        for (let push_dir of pos_dirs) {
            // first path to the start. Always opposite of move direction
            let path_to_side = pos_dirs_dict[push_dir];

            // start_loc = null;
            // switch (push_dir) {
            //     case "left":
            //         start_loc = target_loc.get_right();
            //         break;
            //     case "right":
            //         start_loc = target_loc.get_left();
            //         break;
            //     case "up":
            //         start_loc = target_loc.get_dn();
            //         break;
            //     case "down":
            //         start_loc = target_loc.get_up();
            //         break;
            // }
            // path_to_side = a_star_avoid_push(state, you_pos, start_loc);

            // // if that fails, continue loop
            // if (path_to_side.length == 0) {
            //     continue;
            // }

            let new_state = simulate(state, path_to_side);

            // path to the end. 
            let path_pushing;
            [path_pushing, _] = a_star_pushing(new_state, target_loc, end_location);
            // if it fails, try the next push direction available
            if (path_pushing.length == 0) {
                continue;
            }
            // if that succeeds, then you have a path. combine path_to_side, the first move, and path_pushing
            let running_path = path_to_side.concat(path_pushing);
            // return this path
            return running_path;
        }
    }
    // exit for loop and return [] since no path found
    return [];

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
                    node.pusher_path = node.pusher_path.concat(direction.path)
 
                    // recurse
                }
 
                // else don't recurse
    */
}

/**
 * Filter all of the objects that are NOUN in the current game state.
 * If nouns is empty, all of the objects that are NOUN in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} nouns possible values of NOUN to filter OR an empty array.
 * @return {Array<Object>} all objects in nouns that are NOUN - or all of them - in the current game state.
 */
function isNoun(state, nouns) {
    const word_objs = accessGameState(state, "words");
    const noun_words = ["baba", "bone", "flag", "wall", "grass", "lava", "rock", "floor", "keke", "goop", "love"];
    let noun_objs = word_objs.filter((w) => noun_words.includes(w.name));

    if (nouns.length > 0) {
        nouns = nouns.filter((n) => noun_objs.includes(n));
    } else {
        nouns = noun_objs;
    }
    return nouns;
}

/**
 * Filter all of the objects that are CONNECTOR in the current game state.
 * If connectors is empty, all of the objects that are CONNECTOR in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} connectors possible values of CONNECTOR to filter OR an empty array.
 * @return {Array<Object>} all objects in connectors that are CONNECTOR - or all of them - in the current game state.
 */
function isConnector(state, connectors) {
    const word_objs = accessGameState(state, "words");
    const connector_words = ["is"];
    let connector_objs = word_objs.filter((w) => connector_words.includes(w.name));

    if (connectors.length > 0) {
        connectors = connectors.filter((c) => connector_objs.includes(c));
    } else {
        connectors = connector_objs;
    }
    return connectors;
}

/**
 * Filter all of the objects that are PROPERTY in the current game state.
 *  If properties is empty, all of the objects that are PROPERTY in the current state.
 * @param {State} state the current game state.
 * @param {Array<Object>} properties possible values of PROPERTY to filter OR an empty array.
 * @return {Array<Object>} all objects in properties that are PROPERTY - or all of them - in the current game state.
 */
function isProperty(state, properties) {
    const word_objs = accessGameState(state, "words");
    const property_words = ["you", "win", "stop", "win", "push", "sink", "kill", "hot", "melt"];
    let property_objs = word_objs.filter((w) => property_words.includes(w.name));

    if (properties.length > 0) {
        properties = properties.filter((p) => property_objs.includes(p));
    } else {
        properties = property_objs;
    }
    return properties;
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
    isProperty
};
