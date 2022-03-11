// MAKE SURE NOT TO HAVE CIRCULAR DEPENDENCIES

// Returns a list of phys_obj based on the corresponding element
function accessGameState(state, element) {
  //   const currState = {};
  //   newState(currState, ascii_map);
  game_elements = state[element];
  return game_elements;
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



// Return true if a coordinate is reachable given the current state
// function reachable(pathing_type, x_obj, y_obj, state, path) {
//   if (pathing_type == "floodfill") {
//     return pathing.floodfill_reachable(x_obj, y_obj, state, path);
//   } else {
//     console.log("ERROR: unknown pathing type" + pathing_type);
//   }
// }

module.exports = { accessGameState, deepCopy, deepCopyObject };
