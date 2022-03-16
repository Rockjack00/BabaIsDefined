const simjs = require("../../js/simulation");
const { isEqual } = require("lodash");

/** A helpful class to describe the position of something. */
class Position {
  // Assuming 0,0 starts in top left, and vertical is y, horizontal is x.

  /**
   * Create a Position.
   * @param {Integer} x an x location.
   * @param {Integer} y a y location.
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Get a new Position above this one.
   * @returns {Position} a new Position above of this one.
   */
  get_up() {
    var new_x = this.x;
    var new_y = this.y - 1;
    return new Position(new_x, new_y);
  }

  /**
   * Get a new Position below this one.
   * @returns {Position} a new Position below this one.
   */
  get_dn() {
    var new_x = this.x;
    var new_y = this.y + 1;
    return new Position(new_x, new_y);
  }

  /**
   * Get a new Position to the left this one.
   * @returns {Position} a new Position to the left this one.
   */
  get_left() {
    var new_x = this.x - 1;
    var new_y = this.y;
    return new Position(new_x, new_y);
  }

  /**
   * Get a new Position to the right this one.
   * @returns {Position} a new Position to the right this one.
   */
  get_right() {
    var new_x = this.x + 1;
    var new_y = this.y;
    return new Position(new_x, new_y);
  }

  /**
   * Get a new Position in the direction relative this one.
   * @param {String} dir_str a direction.
   * @returns {Position} a new Position in the direction relative this one.
   */
  get_dir(dir_str) {
    switch (dir_str) {
      case "right":
        return this.get_right();

      case "left":
        return this.get_left();

      case "up":
        return this.get_up();

      case "down":
        return this.get_dn();

      case "space":
        return new Position(this.x, this.y);
    }
    return null;
  }

  /**
   * Get the string representation of this Position.
   * @returns {String} a string representation of this Position.
   */
  get_string() {
    return "" + this.x + ", " + this.y;
  }
}

/**
 * Returns a list of objects based on the corresponding element
 * @param {State} state the current game state.
 * @param {String} element the element of the game state to retrieve.
 * @returns {Array<Object>} a list of objects from the state.
 */
function accessGameState(state, element) {
  return state[element];
}

/**
 * Add the given objects to a dictionary with the string representation of their position as the key
 * @param {Array<Object>} objs a list of objects to add to a dictionary.
 * @param {Object} dictionary the dictionary to add objects to
 * @returns {Object} the modified dictionary.
 */
function add_to_dict(objs, dictionary) {
  for (let obj of objs) {
    dictionary[new Position(obj.x, obj.y).get_string()] = obj;
  }

  return dictionary;
}

/**
 * Make a duplicate of the state to avoid pass by reference issues.
 * @param {State} state a game state.
 * @returns {State} a deep copy of the game state.
 */
function copy_state(state) {
  return simjs.newState(simjs.parseMap(simjs.showState(state)));
}

/**
 * Return the location to be pushed from as a new Position.
 * @param {Position} position Position object of pushable.
 * @param {string} direction direction pushable will be pushed.
 * @returns {Position} a new Position object at the location that an object needs to be pushed from.
 */
function pushing_side(position, direction) {
  let side_of_push;
  switch (direction) {
    case "right":
      side_of_push = position.get_left();
      break;
    case "up":
      side_of_push = position.get_dn();
      break;
    case "left":
      side_of_push = position.get_right();
      break;
    case "down":
      side_of_push = position.get_up();
      break;
  }
  return side_of_push;
}

/**
 * Get all combinations of items in a list, up to the length of the starting list.
 *    Example: [a,b,c] => [[a],[b],[c],[a,b],[a,c],[b,c],[a,b,c]]
 * @param {Array<Object>} start_list a list of items to combine.
 * @returns {Array<Array<Object>>} a list of all of the combinations of items in the list up the the length of start_list.
 */
function permutations_of_list(start_list) {
  // remove duplicates
  start_list = start_list.filter((pos, index) => {
    const str_pos = pos.get_string();
    return index === start_list.findIndex(obj => {
      return obj.get_string() === str_pos;
    });
  });

  // get all combinations
  let outer_list = []
  const bin_num = 2 ** start_list.length;
  for (let mask = 1; mask < bin_num; mask++) {
    let inner_list = [];
    for (let j = 0; j < start_list.length; j++) {
      let index_bin = 2 ** j;
      if ((index_bin & mask) != 0) { // example: Mask is 0110; 0100 index,  is true. ; 1000 index is false
        inner_list.push(start_list[j]);
      }
    }
    if (inner_list.length != 0) {
      outer_list.push(inner_list);
    }
  }
  return outer_list;
}

/**
 * Tests if an object is static (can't change position regardless of rules).
 * @param {State} state the current game state.
 * @param {Object} target any object or Position on the map.
 * @returns {Boolean} true|false if an object is static.
 */
function static(state, target) {
  const [x_bounds, y_bounds] = bounds(state);

  // Is the target position an edge?
  if (
    target.x == 0 ||
    target.y == 0 ||
    target.x == x_bounds ||
    target.y == y_bounds
  ) {
    return true;
  }

  function _static_recur(state, target, ignore_these) {

    // get all neighbors that haven't already been checked
    let target_neighbors = neighbors(state, target).filter((n) => {
      return !ignore_these.some((ignored) => {
        return isEqual(n.neighbor, ignored)
      })
    });

    ignore_these.push(target);


    // is there a static neighbor in a horizontal direction?
    function _horizTest(ns) {

      // target is touching a vertical edge so it can't be pushed horizontally
      if (target.x == 1 || target.x == x_bounds - 1) {
        return true;
      }
      return ns.some((n) => {

        return n.direction == "left" || n.direction == "right" ? _static_recur(state, n.neighbor, ignore_these) : false
      })
    }

    // is there a static neighbor in a vertical direction?
    function _vertTest(ns) {

      // target is touching a horizontal edge so it can't be pushed vertically
      if (target.y == 1 || target.y == y_bounds - 1) {
        return true;
      }
      return ns.some((n) => {
        return n.direction == "up" || n.direction == "down" ? _static_recur(state, n.neighbor, ignore_these) : false
      })
    }

    return _horizTest(target_neighbors) && _vertTest(target_neighbors);
  }

  return _static_recur(state, target, []);
}

/**
 * get objects that are neighbors of the target.
 * @param {State} state the current game state.
 * @param {Object} target an object or Position.
 * @returns {Array<Object>} A list of objects of the form {direction: <dir>, neighbor: <n>} containing all of the neighbors of target.
 */
function neighbors(state, target) {
  // make dictionary of all phys_objs and words in state. 
  let board_objs = add_to_dict(state["phys"], {});
  board_objs = add_to_dict(state["words"], board_objs);

  //make target a Postition, then get up, down, left, and right neighbors as objs
  let outList = [];
  const target_pos = new Position(target.x, target.y);

  for (let dir of ["right", "left", "up", "down"]) {
    let temp_pos = target_pos.get_dir(dir);
    let neighbor = board_objs[temp_pos.get_string()];
    if (neighbor != null) {
      outList.push({ "direction": dir, "neighbor": neighbor });
    }
  }

  return outList;
}

/**
 * Simulate the path based on the current path and return the simulated state.
 * @param {State} state the starting state.
 * @param {Array} path the list of steps to step the simulation through.
 * @returns the new state after the path is taken.
 */
function simulate(state, path) {
  state = copy_state(state);

  return path.reduce(function (
    currState,
    step
  ) {
    return simjs.nextMove(step, currState)["next_state"];
  },
    state);
}

/**
 * Get end location of a path.
 * @param {Position} start_loc the starting location
 * @param {Array<String>} path the list of steps to step the simulation through
 * @returns {Position} a new position at the end of the path.
 */
function simulate_pos(start_loc, path) {
  last_loc = new Position(start_loc.x, start_loc.y);
  for (move of path) {
    last_loc = last_loc.get_dir(move);
  }
  return last_loc;
}

/**
 * check if an object is at the specified location.
 * @param {*} state
 * @param {Object} object the object.
 * @param {Position} position the location to see if it lives there.
 * @returns {Boolean} true|false if the object is the same at the specified position
 */
function atLocation(state, object, position) {
  let obj_dict = add_to_dict(state["phys"], {});
  obj_dict = add_to_dict(state["words"], obj_dict);

  let obj_at_pos = obj_dict[position.get_string()];

  if (obj_at_pos == undefined) {
    return false;
  }
  return (obj_at_pos["type"] == object["type"]) && (obj_at_pos["name"] == object["name"]);
}

/**
 * 
 * @param {*} object 
 * @param {*} position 
 * @returns {Boolean} true|false if the exact object is at the specified position
 */
function objectAtLocation(object, position) {
  return (object.x == position.x) && (object.y == position.y);
}

/**
 * Get the maximum bounds of the state.
 * @param {State} state a game state.
 * @returns {Array<Integer>} a 2-tuple of the last index of each dimension in the state.
 */
function bounds(state) {
  return [state["obj_map"][0].length - 1, state["obj_map"].length - 1];
}

/**
 * Filter and object's entries based on its keys and values.
 *   from https://stackoverflow.com/questions/5072136/javascript-filter-for-objects
 * @param {Object} obj The object to filter.
 * @param {(String,Object) => Boolean} predicate a test function that takes in the key and value and returns a boolean if the value should be included.
 * @returns the filtered object.
 */
function objectFilter(obj, predicate) {
  return Object.fromEntries(Object.entries(obj).filter(predicate));
}

// TODO: check that movers are moving in the same directions
/**
 * Determine if two states are equivalent.
 * @param {State} prev_state a game state.
 * @param {State} cur_state an other game state.
 * @returns {Boolean} true|false if the two states have all objects in the same locations.
 */
function state_equality(prev_state, cur_state) {
  prev = simjs.showState(prev_state)
  cur = simjs.showState(cur_state);
  return prev == cur;
}

module.exports = {
  accessGameState,
  copy_state,
  add_to_dict,
  Position,
  permutations_of_list,
  static,
  neighbors,
  simulate,
  bounds,
  atLocation,
  objectFilter,
  pushing_side,
  state_equality,
  simulate_pos,
  objectAtLocation
};
