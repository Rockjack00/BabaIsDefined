// MAKE SURE NOT TO HAVE CIRCULAR DEPENDENCIES

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
        return this.get_right();

      case "left":
        return this.get_left();

      case "up":
        return this.get_up();

      case "down":
        return this.get_dn();


    }
    return null;
  }

  get_string() {
    return "" + this.x + ", " + this.y;
  }
}

// Returns a list of phys_obj based on the corresponding element
function accessGameState(state, element) {
  game_elements = state[element];
  return game_elements;
}

// Add the given phys_objs to a dictionary with their position as the key
function add_to_dict(phys_objs, dictionary) {
  for (const obj of phys_objs) {
    let temp_pt = new Position(obj.x, obj.y);
    dictionary[temp_pt.get_string()] = obj;
  }

  return dictionary;
}

// TODO: use the Lodash.copy and Lodash.deepcopy methods
//Both DEEPCOPY code blocks from default_AGENT.js, by Milk 
// COPIES ANYTHING NOT AN OBJECT
// DEEP COPY CODE FROM HTTPS://MEDIUM.COM/@ZIYOSHAMS/DEEP-COPYING-JAVASCRIPT-ARRAYS-4D5FC45A6E3E
function deepCopy(arr) {
  let copy = [];
  arr.forEach(elem => {
    if (Array.isArray(elem)) {
      copy.push(deepCopy(elem))
    } else {
      if (typeof elem === 'object') {
        copy.push(deepCopyObject(elem))
      } else {
        copy.push(elem)
      }
    }
  })
  return copy;
}

// DEEP COPY AN OBJECT
function deepCopyObject(obj) {
  let tempObj = {};
  for (let [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      tempObj[key] = deepCopy(value);
    } else {
      if (typeof value === 'object') {
        tempObj[key] = deepCopyObject(value);
      } else {
        tempObj[key] = value
      }
    }
  }
  return tempObj;
}

/**
 * @description Makes a duplicate of the state. To avoid pass by reference issues
 */
function copy_state(state) {
  return simjs.newState(simjs.parseMap(simjs.showState(state)));
}

/**
 * @description: Example: [a,b,c] => [[a],[b],[c],[a,b],[a,c],[b,c]]
 */
function permutations_of_list(start_list) {
  if (start_list.length < 2) {
    return [start_list];
  }
  if (start_list.length == 2) {
    list_a = [[start_list[0]]];
    list_a.push([start_list[1]])
    list_a.push(deepCopy(start_list));
    return list_a;
  }

  perms = [];
  index = 0;
  temp_list = [];
  for (item of start_list) {
    temp_list.push(item);
  }
  perms.concat(temp_list);
  index++;

  while (index < start_list.length) {
    prev_list = deepCopy(temp_list);
    temp_list = []
    for (let i = 0; i < prev_list.length - 1; i++) {
      for (let j = i + 1; j < start_list.length; j++) {
        temp_list.push(prev_list[i].push(start_list[j]));
      }
    }
    perms.concat(temp_list);
  }

  perms.push(start_list);

  return perms;
}

/**
 * @description Tests if an object is static (can't change position regardless of rules)
 * @param {State} state the current game state
 * @param {object} target any object or Position on the map
 * @returns {boolean} true|false if an object is static
 */
function static(state, target) {
  const x_bounds = state["obj_map"][0].length;
  const y_bounds = state["obj_map"].length;

  if (
    target.x == 0 ||
    target.y == 0 ||
    target.x == x_bounds ||
    target.y == y_bounds
  ) {
    return true;
  }

  let target_neighbors = neighbors(state, target);

  return (("up" in target_neighbors && static(target_neighbors.up)) ||
    ("down" in target_neighbors && static(target_neighbors.down))) &&
    (("left" in target_neighbors && static(target_neighbors.left)) ||
      ("right" in target_neighbors && static(target_neighbors.up)))
}

/**
 * @description get objects that are neighbors of the target
 * @param {State} state the current game state
 * @param {Object} target an object or Position
 * @returns {Object} An object of the form {direction: neighbor} containing all of the neighbors of target.
 */
function neighbors(state, target) {
  // make dictionary of all phys_objs and words in state. 
  let board_objs = add_to_dict(state["phys"], {});
  board_objs = add_to_dict(state["words"], board_objs);

  //make target a Postition, then get up, down, left, and right neighbors as objs
  let out = {};
  const target_pos = new Position(target.x, target.y);

  for (let dir of ["right", "left", "up", "down"]) {
    let temp_pos = target_pos.get_dir(dir);
    let neighbor = board_objs[temp_pos.get_string()];
    if (neighbor != null) {
      outList.update({ dir: neighbor });
    }
  }

  return outList;
}

/**
 * @description Simulate the path based on the current path and return the simulated state
 * @param {State} state the starting state
 * @param {Array} path the list of steps to step the simulation through
 * @returns 
 */

function simulate(state, path) {
  // TODO: change this to simjs.newState() - its probably a lot faster
  //    maybe give the option to actually simulate (in case there could be side effects?)
  return reachablePath.reduce(function (
    currState,
    step
  ) {
    return simjs.nextMove(step, currState)["next_state"];
  },
    state);
}

/**
 * @description check if an object is at the specified location
 * @param {object} object 
 * @param {Position} position 
 * @returns 
 */
function atLocation(object, position) {
  return object.x == position.x && object.y == position.y
}

module.exports = {
  accessGameState,
  deepCopy,
  deepCopyObject,
  copy_state,
  add_to_dict,
  Position,
  permutations_of_list,
  static,
  simulate,
  atLocation
};
