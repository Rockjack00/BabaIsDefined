const { check } = require("prettier");
const { accessGameState, add_to_dict, Position, bounds, pushing_side, simulate } = require("./helpers");

// for Reference, this are the position actions
const possActions = ["space", "right", "up", "left", "down"];

// global variable for storing searched locations
var searched = {};

class Node {
  /**
   * 
   * @param {Position} position 
   * @param {int} f 
   * @param {Node} parent 
   * @param {string} move 
   */
  constructor(position, f, parent, move) {
    this.move = move;
    this.position = position;
    this.f = f;
    this.parent = parent;
    this.g = 0;
    this.h = 0;
  }

  /**
   * 
   * @returns parent Node
   */
  get_parent() {
    return this.parent;
  }

  /**
   * 
   * @returns f
   */
  get_f() {
    return this.f;
  }

  /**
   * 
   * @returns position
   */
  get_pos() {
    return this.position;
  }
}

/**
 * @deprecated
 * 
 * @param {*} state Game state.
 * @param {*} start_obj Start object for pathing.
 * @param {*} end_obj Target object for pathing.
 * @returns {Array} Path from cur_location to end_pos.
 */
function floodfill_reachable(state, start_obj, end_obj) {
  start_pos = new Position(start_obj.x, start_obj.y);
  end_pos = new Position(end_obj.x, end_obj.y);

  path = floodfill(start_pos, end_pos, state);

  return path;
}

/**
 * @deprecated
 * 
 * @param {*} state Game state.
 * @param {*} start_obj Start object for pathing.
 * @param {*} end_obj Target object for pathing.
 * @returns {Array} Path from cur_location to end_pos.
 */
function floodfill(start_pos, end_pos, state) {
  // only runs for actual moves. Ignores "space" which is "wait"
  range = 4;

  move_actions = possActions.slice(1, range + 1);

  searched = {};

  //for each killable:
  // dict[killable,x,killable.y] = killable.

  // death things: killers, sinkers
  // things that stop: stoppables
  // addtional things to avoid to keep it simple: pushables

  // make empty dictionary for "obstacles"
  var obstacles = {};

  // death things
  const killers = accessGameState(state, "killers");
  const sinkers = accessGameState(state, "sinkers");
  // stoppables
  const stoppables = accessGameState(state, "stoppables");
  // additional things to avoid
  const pushables = accessGameState(state, "pushables");
  const words = accessGameState(state, 'words');

  // key items into the dictionary by their location string. Order added is not important
  obstacles = add_to_dict(killers, obstacles);
  obstacles = add_to_dict(sinkers, obstacles);
  obstacles = add_to_dict(stoppables, obstacles);
  obstacles = add_to_dict(pushables, obstacles);
  obstacles = add_to_dict(words, obstacles);

  const [x_bounds, y_bounds] = bounds(state);
  path = ff_recur(start_pos, end_pos, obstacles, move_actions, x_bounds, y_bounds, []);
  if (path == null) {
    return [];
  }
  return path;
}

// cur_location - Position object
// goal_pos -  Goal Position
// searched - reference to Dictionary of already searched locations. Starts empty.
// move_actions - Constant List of possible moves
// obstacles - dictionary of obstacles keyed by their location
//
// returns path to the goal
/**
 * @deprecated
 * 
 * @param {*} cur_location 
 * @param {*} end_pos 
 * @param {*} obstacles 
 * @param {*} move_actions 
 * @param {*} x_bounds 
 * @param {*} y_bounds 
 * @param {*} path 
 * @returns {Array} Path from cur_location to end_pos.
 */
function ff_recur(cur_location, end_pos, obstacles, move_actions, x_bounds, y_bounds, path) {
  for (let i = 0; i < move_actions.length; ++i) {
    switch (move_actions[i]) {
      case "right":
        next_space = cur_location.get_right();
        next_move = "right";
        break;
      case "up":
        next_space = cur_location.get_up();
        next_move = "up";
        break;
      case "left":
        next_space = cur_location.get_left();
        next_move = "left";
        break;
      case "down":
        next_space = cur_location.get_dn();
        next_move = "down";
        break;
      default:
        next_space = null;
    }

    // if an obstacle DOES NOT exist, i.e. there is NOT a key in the "obstacles" for the next location
    next_str = next_space.get_string();
    if (!(next_str in obstacles) && !(next_str in searched) &&
      game_bound_check(state, next_space)) {
      path.push(next_move);
      // store string representation for next space in searched
      searched[next_str] = next_str;


      // switch (next_move) {
      //   case "right":
      //     cur_location = cur_location.get_right();
      //     break;
      //   case "up":
      //     cur_location = cur_location.get_up();
      //     break;
      //   case "left":
      //     cur_location = cur_location.get_left();
      //     break;
      //   case "down":
      //     cur_location = cur_location.get_dn();
      //     break;
      //   default:
      //     cur_location = cur_location;
      // }

      if (next_str == end_pos.get_string()) {
        return path;
      } else {
        ff_return = ff_recur(
          next_space,
          end_pos,
          obstacles,
          move_actions, x_bounds, y_bounds,
          path.slice() // to send a copy of the path, not the same path object. Javascript is annoying.
        );

        if (ff_return != null) {
          return ff_return;
        }


      }
    }

    // if (movable_spcs.includes(next_space) && !(searched.includes(next_space))){
    //     path.push(next_space);
    //     searched.push(next_space);
    //     if(goal_spcs.includes(next_space)){
    //         return path;
    //     }
    //     else{
    //         ff_return = ff_recur(next_space, movable_spcs, searched,move_actions);

    //         if (ff_return != null){
    //             return ff_return;
    //         }

    //     }
    // }
  }

  // if loop is exited, no paths were found this way and a dead end was reached.
  return null;
}


/**
 * 
 * @param {*} state 
 * @param {Position} next_space 
 * @returns {boolean} True if the space is within state's bounds.
 */
function game_bound_check(state, next_space) {
  const [x_bounds, y_bounds] = bounds(state);

  return (next_space.x < x_bounds) && (next_space.y < y_bounds) &&
    (next_space.x > 0) && (next_space.y > 0);
}

// A* Pathing
// psuedo-code from https://www.geeksforgeeks.org/a-search-algorithm/ used. 
/**
 * 
 * @param {*} state 
 * @param {*} start_obj 
 * @param {*} end_obj 
 * @param {boolean} push_are_obst 
 * @param {Array} avoid_these 
 * @returns {[Array, Array]} [path_moves, path_locations] 
 */
function a_star_reachable(state, start_obj, end_obj, push_are_obst, avoid_these) {
  start_pos = new Position(start_obj.x, start_obj.y);
  end_pos = new Position(end_obj.x, end_obj.y);

  return a_star(start_pos, end_pos, state, push_are_obst, avoid_these, false);
}

/**
 * 
 * @param {*} state 
 * @param {Position} start_pos 
 * @param {Position} end_pos 
 * @returns {[Array, Array]} [path_moves, path_locations] 
 */
function a_star_pushing(state, start_pos, end_pos) {
  return a_star(start_pos, end_pos, state, true, [], true);
}

/**
 * 
 * @param {*} state 
 * @param {Position} start_pos 
 * @param {Position} end_pos 
 * @returns {[Array, Array]} [path_moves, path_locations] 
 */
function a_star_avoid_push(state, start_pos, end_pos) {
  return a_star(start_pos, end_pos, state, true, [], false);
}

/**
 * @description The setup for running A* and generating the path.
 * 
 * @param {*} start_pos 
 * @param {*} end_pos 
 * @param {*} state 
 * @param {boolean} push_are_obst 
 * @param {Array} avoid_these 
 * @param {boolean} pushing 
 * @returns {[Array, Array]} [path_moves, path_locations] 
 */
function a_star(start_pos, end_pos, state, push_are_obst, avoid_these, pushing) {
  // first, check that you are not already on the end location.
  if (end_pos.get_string() == start_pos.get_string()) {
    return [["space"], [start_pos.get_dir("space")]];
  }

  // only runs for actual moves. Ignores "space" which is "wait"
  range = 4;

  move_actions = possActions.slice(1, range + 1);

  searched = {};

  //for each killable:
  // dict[killable,x,killable.y] = killable.

  // death things: killers, sinkers
  // things that stop: stoppables
  // addtional things to avoid to keep it simple: pushables

  // make empty dictionary for "obstacles"
  var obstacles = {};

  // death things
  const killers = accessGameState(state, "killers");
  const sinkers = accessGameState(state, "sinkers");
  // stoppables
  const stoppables = accessGameState(state, "stoppables");
  // additional things to avoid
  const pushables = accessGameState(state, "pushables");
  if (push_are_obst) {
    obstacles = add_to_dict(pushables, obstacles);
  }
  else {
    push_dict = {}
    push_dict = add_to_dict(pushables, push_dict);

    // add avoid_these to obstacle  
    for (avoid_this of avoid_these) {
      avoid_str = avoid_this.get_string();
      obstacles[avoid_str] = push_dict[avoid_str];
    }
  }
  const words = accessGameState(state, 'words');

  // key items into the dictionary by their location string. Order added is not important
  obstacles = add_to_dict(killers, obstacles);
  obstacles = add_to_dict(sinkers, obstacles);
  obstacles = add_to_dict(stoppables, obstacles);
  obstacles = add_to_dict(words, obstacles);

  // const [x_bounds, y_bounds] = bounds(state)

  if (pushing) {
    path_end_node = a_star_pushed_solver(state, start_pos, end_pos, obstacles)
  }
  else {
    path_end_node = a_star_solver(start_pos, end_pos, obstacles, move_actions, state, []);
  }

  if (path_end_node == null) {
    path_moves = [];
    path_locations = [];
  }
  else {
    path_moves = get_moves(path_end_node, pushing, state);
    if (!pushing) {
      path_locations = get_move_positions(path_end_node);
    }
    else {
      path_locations = [];
    }
  }
  return [path_moves, path_locations];
}

/**
 * 
 * @param {Node} cur_node This is the starting node to build the path.
 * @param {boolean} pushing Determines if this is the pushing variation of A*.
 * @param {*} state 
 * @returns {Array} The path generated by A* algorithms.
 */
function get_moves(cur_node, pushing, state) {
  let prev_node = cur_node.parent;
  if (prev_node == null) {
    return [];
  }

  let moves = get_moves(prev_node, pushing, state);
  let cur_move = cur_node.move;

  // if pushing an object
  if ((pushing) && (moves.length != 0)) {
    let prev_move = prev_node.move;//moves[moves.length - 1];
    if (prev_move != cur_move) {
      // path to the side of the previous object
      // target is prev_node side for cur_node move
      let target = pushing_side(prev_node.position, cur_move);
      // start is prev_node, one in opposite direction of prev_move
      let start = pushing_side(prev_node.position, prev_move);

      cur_state = simulate(state, moves);
      let [path_to_side, _] = a_star_avoid_push(cur_state, start, target);
      moves = moves.concat(path_to_side);
    }
  }
  // end of if

  moves.push(cur_move);

  return moves;
}

/**
 * 
 * @param {Node} node 
 * @returns {Array} The path generated by A*, as a list of Positions.
 */
function get_move_positions(node) {
  if (node.parent == null) {
    return [];
  }

  var moves = get_move_positions(node.parent);
  moves.push(node.get_pos());

  return moves;
}

/**
 * 
 * @param {Position} start 
 * @param {Position} end 
 * @returns The manhattan distance betwen two locations on the game board.
 */
function get_manhattan(start, end) {
  x_dist = Math.abs(start.x - end.x);
  y_dist = Math.abs(start.y - end.y);
  return x_dist + y_dist;
}

// psuedo-code from https://www.geeksforgeeks.org/a-search-algorithm/ used. 
/**
 * @description The main A* solver function. 
 * 
 * @param {*} cur_location 
 * @param {*} end_pos 
 * @param {*} obstacles 
 * @param {*} move_actions 
 * @param {*} state 
 * @param {*} path 
 * @returns {Node} Returns the node for the end of the path.
 */
function a_star_solver(cur_location, end_pos, obstacles, move_actions, state, path) {
  // A* Search Algorithm
  // 1.  Initialize the open list
  let open_list = [];
  // 2.  Initialize the closed list
  //     put the starting node on the open 
  //     list (you can leave its f at zero)
  let closed_list = [];
  // TODO check that this is adding to list correctly? Javascript can be weird
  let start_node = new Node(cur_location, 0, null, null);
  open_list.push(start_node);

  // 3.  while the open list is not empty
  while (open_list.length > 0) {
    // a) find the node with the least f on 
    //    the open list, call it "q"
    let prev_f = open_list[0].get_f();
    let q_index = 0;
    for (let i = 1; i < open_list.length; ++i) {
      cur_f = open_list[i].get_f();
      if (cur_f < prev_f) {
        q_index = i;
      }
    }

    // b) pop q off the open list
    // TODO check this is actually popping
    let q = open_list[q_index]; // get node
    open_list.splice(q_index, 1); // remove node from list

    // c) generate q's 4 successors and set their parents to q
    // for refence: const possActions = ["space", "right", "up", "left", "down"];
    let successors = [];
    let dirs = ["up", "down", "left", "right"]
    for (dir of dirs) {
      next_node = get_node(q, dir)
      next_space = next_node.get_pos();
      next_str = next_node.get_pos().get_string();
      if (!(next_str in obstacles) &&
        game_bound_check(state, next_space)) {
        successors.push(next_node);
      }
    }

    // d) for each successor
    for (let i = 0; i < successors.length; ++i) {
      let succ_node = successors[i];
      //     i) if successor is the goal, stop search
      if (succ_node.get_pos().get_string() == end_pos.get_string()) {
        return succ_node; // and then step through the node backwards to make the path
      }

      //     ii) else, compute both g and h for successor
      //       successor.g = q.g + distance between 
      //                           successor and q
      succ_node.g = q.g + 1;
      //       successor.h = distance from goal to 
      //       successor (This can be done using many 
      //       ways, we will discuss three heuristics- 
      //       Manhattan, Diagonal and Euclidean 
      //       Heuristics)
      succ_node.h = get_manhattan(succ_node.get_pos(), end_pos);
      //       successor.f = successor.g + successor.h
      succ_node.f = succ_node.g + succ_node.h;

      //     iii) if a node with the same position as 
      //         successor is in the OPEN list which has a 
      //        lower f than successor, skip this successor
      let skip_s = false;
      for (let i = 0; i < open_list.length; ++i) {
        let list_node = open_list[i];
        if ((succ_node.get_pos().get_string() == list_node.get_pos().get_string()) &&
          (list_node.get_f() < succ_node.get_f())) {
          skip_s = true;
          break;
        }
      }
      if (skip_s) {
        continue;
      }

      //     iV) if a node with the same position as 
      //         successor  is in the CLOSED list which has
      //         a lower f than successor, skip this successor
      for (let i = 0; i < closed_list.length; ++i) {
        list_node = closed_list[i];
        if ((succ_node.get_pos().get_string() == list_node.get_pos().get_string()) &&
          (list_node.get_f() < succ_node.get_f())) {
          skip_s = true;
          break;
        }
      }
      //         otherwise, add  the node to the open list
      if (!skip_s) {
        open_list.push(succ_node);
      }

      //  end (for loop)
    }

    // e) push q on the closed list
    closed_list.push(q);

    // end (while loop)
  }
  return start_node;
}

/**
 * 
 * @param {Node} q 
 * @param {string} dir 
 * @returns {Node} A new Node object for the direction and parent node.
 */
function get_node(q, dir) {
  switch (dir) {
    case "up":
      return new Node(q.get_pos().get_up(), null, q, dir);
    case "down":
      return new Node(q.get_pos().get_dn(), null, q, dir);
    case "left":
      return new Node(q.get_pos().get_left(), null, q, dir);
    case "right":
      return new Node(q.get_pos().get_right(), null, q, dir);
  }
  throw new Error("ERROR: Expected one of direction 'up', 'down', 'left', or 'right', but got direction " + dir)
}

/**
 * @description For a_star_pushed_solver, this checks that turns are possible when pushing pushables or words.
 * 
 * @param {*} state 
 * @param {Node} next_node 
 * @returns 
 */
function push_turn_check(state, next_node) {
  let prev_node = next_node.parent; // prev_node is one step behind next_node
  // can push at beginning is done before getting here
  if ((next_node == null) || (prev_node == null) || (prev_node.move == null)) {
    return true;
  }



  // if current move and next move are different, check that you can path from current side to side for the next move.
  if (prev_node.move != next_node.move) {
    let next_move = next_node.move;
    let prev_move = prev_node.move;
    let target = pushing_side(prev_node.position, next_move);
    // start is prev_node, one in opposite direction of prev_move
    let start = pushing_side(prev_node.position, prev_move);

    // path to the side
    let [path_to_side, _] = a_star_avoid_push(state, start, target);
    return path_to_side.length != 0;
  }
  return true;
}

// psuedo-code from https://www.geeksforgeeks.org/a-search-algorithm/ used. 
// this A* is for objects being pushed by YOU. 
// The key is to make sure that if you turn, YOU can get to the opposite side to push from.
/**
 * @description Pushing version of A* pathing.
 * 
 * @param {*} state 
 * @param {Position} cur_location 
 * @param {Position} end_pos 
 * @param {*} obstacles 
 * @param {string} first_move 
 * @returns {Node} Returns the node for the end of the path.
 */
function a_star_pushed_solver(state, cur_location, end_pos, obstacles, first_move) {
  // A* Search Algorithm
  // 1.  Initialize the open list
  let open_list = [];
  // 2.  Initialize the closed list
  //     put the starting node on the open 
  //     list (you can leave its f at zero)
  let closed_list = [];
  // TODO check that this is adding to list correctly? Javascript can be weird
  let start_node = new Node(cur_location, 0, null, first_move);
  open_list.push(start_node);

  // 3.  while the open list is not empty
  while (open_list.length > 0) {
    // a) find the node with the least f on 
    //    the open list, call it "q"
    let prev_f = open_list[0].get_f();
    let q_index = 0;
    for (let i = 1; i < open_list.length; ++i) {
      cur_f = open_list[i].get_f();
      if (cur_f < prev_f) {
        q_index = i;
      }
    }

    // b) pop q off the open list
    // TODO check this is actually popping
    let q = open_list[q_index]; // get node
    open_list.splice(q_index, 1); // remove node from list

    // c) generate q's 4 successors and set their 
    //    parents to q
    // TODO: put in loop

    // for refence: const possActions = ["space", "right", "up", "left", "down"];

    let successors = [];
    let dirs = ["up", "down", "left", "right"]
    for (dir of dirs) {
      let next_node = get_node(q, dir)
      let next_space = next_node.get_pos();
      let next_str = next_node.get_pos().get_string();
      if (!(next_str in obstacles) &&
        game_bound_check(state, next_space) && push_turn_check(state, next_node)) {
        successors.push(next_node);
      }
    }

    // d) for each successor
    for (let i = 0; i < successors.length; ++i) {
      let succ_node = successors[i];
      //     i) if successor is the goal, stop search
      if (succ_node.get_pos().get_string() == end_pos.get_string()) {
        return succ_node; // and then step through the node backwards to make the path
      }

      //     ii) else, compute both g and h for successor
      //       successor.g = q.g + distance between 
      //                           successor and q
      succ_node.g = q.g + 1;
      //       successor.h = distance from goal to 
      //       successor (This can be done using many 
      //       ways, we will discuss three heuristics- 
      //       Manhattan, Diagonal and Euclidean 
      //       Heuristics)
      succ_node.h = get_manhattan(succ_node.get_pos(), end_pos);
      //       successor.f = successor.g + successor.h
      succ_node.f = succ_node.g + succ_node.h;

      //     iii) if a node with the same position as 
      //         successor is in the OPEN list which has a 
      //        lower f than successor, skip this successor
      skip_s = false;
      for (let i = 0; i < open_list.length; ++i) {
        list_node = open_list[i];
        if ((succ_node.get_pos().get_string() == list_node.get_pos().get_string()) &&
          (list_node.get_f() < succ_node.get_f())) {
          skip_s = true;
          break;
        }
      }
      if (skip_s) {
        continue;
      }

      //     iV) if a node with the same position as 
      //         successor  is in the CLOSED list which has
      //         a lower f than successor, skip this successor
      for (let i = 0; i < closed_list.length; ++i) {
        list_node = closed_list[i];
        if ((succ_node.get_pos().get_string() == list_node.get_pos().get_string()) &&
          (list_node.get_f() < succ_node.get_f())) {
          skip_s = true;
          break;
        }
      }
      //         otherwise, add  the node to the open list
      if (!skip_s) {
        open_list.push(succ_node);
      }

      //  end (for loop)
    }

    // e) push q on the closed list
    closed_list.push(q);

    // end (while loop)
  }
  return start_node;
}

module.exports = { floodfill_reachable, a_star_reachable, Position, add_to_dict, game_bound_check, a_star_avoid_push, a_star_pushing };
