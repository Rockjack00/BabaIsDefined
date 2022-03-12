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
  //   const currState = {};
  //   newState(currState, ascii_map);
  game_elements = state[element];
  return game_elements;
}

function add_to_dict(phys_objs, dictionary) {
  for (const obj of phys_objs) {
    temp_pt = new Position(obj.x, obj.y);
    dictionary[temp_pt.get_string()] = obj;
  }

  return dictionary;
}

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



// Tests if an object is static (can't change position regardless of rules)
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

  let neighbors = target_neighbors(state, target); // TODO: implement neighbors()

  return (
    ((static(neighbors.up) || static(neighbors.down)) &&
      static(neighbors.left)) ||
    static(neighbors.right)
  );
}

// gets phys_objs that are neighbors of the target
function target_neighbors(state, target) {
  // make dictionary of all phys_objs and words in state. 
  board_objs = {};
  board_objs = add_to_dict(state["phys"], board_objs);
  board_objs = add_to_dict(state["words"], board_objs);

  //make target a Postition, then get up, down, left, and right neighbors as objs
  neighbors = [];
  target_pos = new Position(target.x, target.y);
  dirs = ["right", "left", "up", "down"];

  for (direction of dirs) {
    temp_pos = target_pos.get_dir(direction);
    obj_here = board_objs[temp_pos.get_string()];
    if (obj_here != null) {
      neighbors.push(obj_here);
    }
  }

  return neighbors;
}

// Return true if a coordinate is reachable given the current state
// function reachable(pathing_type, x_obj, y_obj, state, path) {
//   if (pathing_type == "floodfill") {
//     return pathing.floodfill_reachable(x_obj, y_obj, state, path);
//   } else {
//     console.log("ERROR: unknown pathing type" + pathing_type);
//   }
// }

module.exports = { accessGameState, deepCopy, deepCopyObject, add_to_dict, Position, permutations_of_list, static };
