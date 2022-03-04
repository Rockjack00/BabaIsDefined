var pathing = require("helpers/pathing");

// Returns a list of phys_obj based on the corresponding element
function accessGameState(element, ascii_map) {
    const currState = {};
    newState(currState, ascii_map);
    game_elements = currState[element];
    return game_elements;    
}

// Return true if a coordinate is reachable given the current state
function reachable(pathing_type, x_obj, y_obj, state, path) {
    if (pathing_type == "floodfill") {
        return pathing.floodfill_reachable(x_obj, y_obj, state, path)
    }
    else {
        console.log("ERROR: unknown pathing type" + pathing_type)
    }
}