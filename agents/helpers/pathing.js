
const { accessGameState } = require("./helpers");

// for Reference, this are the position actions
const possActions = ["space", "right", "up", "left", "down"];

// global variable for storing searched locations
var searched = {};

class Node {
  constructor(position, f, parent, move) {
    this.move = move;
    this.position = position;
    this.f = f;
    this.parent = parent;
    this.g = 0;
    this.h = 0;
  }

  get_parent() {
    return this.parent;
  }

  get_f() {
    return this.f;
  }

  get_pos() {
    return this.position;
  }
}

class Position {
  //assuming 0,0 starts in top left, and vertical is y, horizontal is x

  // todo - relocate this to a Typescript file?

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  get_up() {
    var new_x = this.x;
    var new_y = this.y - 1;
    return new Position(new_x, new_y);
  }

  get_dn() {
    var new_x = this.x;
    var new_y = this.y + 1;
    return new Position(new_x, new_y);
  }

  get_left() {
    var new_x = this.x - 1;
    var new_y = this.y;
    return new Position(new_x, new_y);
  }

  get_right() {
    var new_x = this.x + 1;
    var new_y = this.y;
    return new Position(new_x, new_y);
  }

  get_dir(dir_str) {
    switch (dir_str) {
      case "right":
        return path_locs[i].get_right();

      case "left":
        return path_locs[i].get_left();

      case "up":
        return path_locs[i].get_up();

      case "down":
        return path_locs[i].get_dn();


    }
    return null;
  }

  get_string() {
    return "" + this.x + ", " + this.y;
  }
}

//TODO - Return what is preventing movement. An array that marks what types of objects are in the way.
// - to do this, we need to edit the inputs to floodfill reachable

// todo - Make these inputs match up with reachable predicate.
// todo - Currently the predicate uses (X,Y, Map, Path)
// todo - what is in Map?
// todo - path is something that this function will set
function floodfill_reachable(state, start_obj, end_obj) {
  start_pos = new Position(start_obj.x, start_obj.y);
  end_pos = new Position(end_obj.x, end_obj.y);

  path = floodfill(start_pos, end_pos, state);

  return path;
}

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

  x_bounds = state["obj_map"][0].length;
  y_bounds = state["obj_map"].length;

  path = ff_recur(start_pos, end_pos, obstacles, move_actions, x_bounds, y_bounds, []);


  if (path == null) {
    return [];
  }
  return path;
}

// adds all items in the list to the dictionary, keyed by their location.
function add_to_dict(phys_objs, obstacles) {
  for (const obj of phys_objs) {
    temp_pt = new Position(obj.x, obj.y);
    obstacles[temp_pt.get_string()] = obj;
  }

  return obstacles;
}

function game_bound_check(state, next_space) {
  x_bounds = state["obj_map"][0].length;
  y_bounds = state["obj_map"].length;

  return (next_space.x < x_bounds - 1) && (next_space.y < y_bounds - 1) &&
    (next_space.x > 0) && (next_space.y > 0);
}

// cur_location - Position object
// goal_pos -  Goal Position
// searched - reference to Dictionary of already searched locations. Starts empty.
// move_actions - Constant List of possible moves
// obstacles - dictionary of obstacles keyed by their location
//
// returns path to the goal
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


// A* Pathing
// psuedo-code from https://www.geeksforgeeks.org/a-search-algorithm/ used. 

function a_star_reachable(state, start_obj, end_obj, push_are_obst) {
  start_pos = new Position(start_obj.x, start_obj.y);
  end_pos = new Position(end_obj.x, end_obj.y);

  let { path_moves, path_locations } = a_star(start_pos, end_pos, state, push_are_obst);

  return { path_moves, path_locations };
}

function a_star_avoid_push(state, start_pos, end_pos) {
  // start_pos = new Position(start_obj.x, start_obj.y);
  // end_pos = new Position(end_obj.x, end_obj.y);

  let { path_moves, path_locations } = a_star(start_pos, end_pos, state, true);

  return path_moves;
}

function a_star(start_pos, end_pos, state, push_are_obst) {
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
  if (push_are_obst) {
    const pushables = accessGameState(state, "pushables");
  }
  const words = accessGameState(state, 'words');

  // key items into the dictionary by their location string. Order added is not important
  obstacles = add_to_dict(killers, obstacles);
  obstacles = add_to_dict(sinkers, obstacles);
  obstacles = add_to_dict(stoppables, obstacles);
  // obstacles = add_to_dict(pushables, obstacles);
  obstacles = add_to_dict(words, obstacles);

  x_bounds = state["obj_map"][0].length;
  y_bounds = state["obj_map"].length;

  path_end_node = a_star_solver(start_pos, end_pos, obstacles, move_actions, x_bounds, y_bounds, []);
  if (path_end_node == null) {
    path_moves = null;
    path_locations = null;
  }
  else {
    path_moves = get_moves(path_end_node);
    path_locations = get_move_positions(path_end_node);
  }
  return { path_moves, path_locations };
}

function get_moves(node) {
  if (node.parent == null) {
    return [];
  }

  var moves = get_moves(node.parent);
  moves.push(node.move);

  return moves;
}

function get_move_positions(node) {
  if (node.parent == null) {
    return [];
  }

  var moves = get_move_positions(node.parent);
  moves.push(node.get_pos());

  return moves;
}


function get_manhattan(start, end) {
  x_dist = Math.abs(start.x - end.x);
  y_dist = Math.abs(start.y - end.y);
  return x_dist + y_dist;
}


// psuedo-code from https://www.geeksforgeeks.org/a-search-algorithm/ used. 
function a_star_solver(cur_location, end_pos, obstacles, move_actions, x_bounds, y_bounds, path) {
  // A* Search Algorithm
  // 1.  Initialize the open list
  open_list = [];
  // 2.  Initialize the closed list
  //     put the starting node on the open 
  //     list (you can leave its f at zero)
  closed_list = [];
  // TODO check that this is adding to list correctly? Javascript can be weird
  start_node = new Node(cur_location, 0, null, null);
  open_list.push(start_node);

  // 3.  while the open list is not empty
  while (open_list.length > 0) {
    // a) find the node with the least f on 
    //    the open list, call it "q"
    prev_f = open_list[0].get_f();
    q_index = 0;
    for (let i = 1; i < open_list.length; ++i) {
      cur_f = open_list[i].get_f();
      if (cur_f < prev_f) {
        q_index = i;
      }
    }

    // b) pop q off the open list
    // TODO check this is actually popping
    q = open_list[q_index]; // get node
    open_list.splice(q_index, 1); // remove node from list

    // c) generate q's 4 successors and set their 
    //    parents to q
    // TODO: put in loop

    // for refence: const possActions = ["space", "right", "up", "left", "down"];

    // UP SUCCESSOR
    successors = [];
    next_node = new Node(q.get_pos().get_up(), null, q, "up");
    next_space = next_node.get_pos();
    next_str = next_node.get_pos().get_string();
    if (!(next_str in obstacles) &&
      (next_space.x < x_bounds - 1) && (next_space.y < y_bounds - 1) &&
      (next_space.x > 0) && (next_space.y > 0)) {
      successors.push(next_node);
    }

    // DOWN SUCCESSOR
    next_node = new Node(q.get_pos().get_dn(), null, q, "down");
    next_space = next_node.get_pos();
    next_str = next_node.get_pos().get_string();
    if (!(next_str in obstacles) &&
      (next_space.x < x_bounds - 1) && (next_space.y < y_bounds - 1) &&
      (next_space.x > 0) && (next_space.y > 0)) {
      successors.push(next_node);
    }

    // LEFT SUCCESSOR
    next_node = new Node(q.get_pos().get_left(), null, q, "left");
    next_space = next_node.get_pos();
    next_str = next_node.get_pos().get_string();
    if (!(next_str in obstacles) &&
      (next_space.x < x_bounds - 1) && (next_space.y < y_bounds - 1) &&
      (next_space.x > 0) && (next_space.y > 0)) {
      successors.push(next_node);
    }

    // RIGHT SUCCESSOR
    next_node = new Node(q.get_pos().get_right(), null, q, "right");
    next_space = next_node.get_pos();
    next_str = next_node.get_pos().get_string();
    if (!(next_str in obstacles) &&
      (next_space.x < x_bounds - 1) && (next_space.y < y_bounds - 1) &&
      (next_space.x > 0) && (next_space.y > 0)) {
      successors.push(next_node);
    }

    // d) for each successor
    for (let i = 0; i < successors.length; ++i) {
      succ_node = successors[i];
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
  return null;
}





module.exports = { floodfill_reachable, a_star_reachable, Position, add_to_dict, game_bound_check, a_star_avoid_push };