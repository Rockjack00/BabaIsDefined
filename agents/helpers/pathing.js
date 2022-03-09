
const { accessGameState } = require("./helpers");

// for Reference, this are the position actions
const possActions = ["space", "right", "up", "left", "down"];

// global variable for storing searched locations
var searched = {};

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
function floodfill_reachable(state, x_obj, y_obj) {
  start_pos = new Position(x_obj.x, x_obj.y);
  end_pos = new Position(y_obj.x, y_obj.y);

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
      (next_space.x < x_bounds - 1) && (next_space.y < y_bounds - 1) &&
      (next_space.x > 0) && (next_space.y > 0)) {
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


module.exports = { floodfill_reachable };