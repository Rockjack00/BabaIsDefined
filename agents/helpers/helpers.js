// MAKE SURE NOT TO HAVE CIRCULAR DEPENDENCIES

// Returns a list of phys_obj based on the corresponding element
function accessGameState(state, element) {
  //   const currState = {};
  //   newState(currState, ascii_map);
  game_elements = state[element];
  return game_elements;
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

  let neighbors = neighbors(state, target); // TODO: implement neighbors()

  return (
    ((static(neighbors.up) || static(neighbors.down)) &&
      static(neighbors.left)) ||
    static(neighbors.right)
  );
}

// Return true if a coordinate is reachable given the current state
// function reachable(pathing_type, x_obj, y_obj, state, path) {
//   if (pathing_type == "floodfill") {
//     return pathing.floodfill_reachable(x_obj, y_obj, state, path);
//   } else {
//     console.log("ERROR: unknown pathing type" + pathing_type);
//   }
// }

module.exports = { accessGameState, static };
