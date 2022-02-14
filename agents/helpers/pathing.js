
// for Reference, this are the position actions
// const possActions = ['space', 'right', 'up', 'left', 'down'];

// const { path } = require("express/lib/application");


class Position {
    //assuming 0,0 starts in top left, and vertical is y, horizontal is x

    // todo - relocate this to a Typescript file?

    constructor(x,y){
        this.x = x;
        this.y = y;
    }

    get_up(){
        new_x = this.x;
        new_y = this.y + 1;
        return new Position(new_x,new_y);
    }

    get_dn(){
        new_x = this.x;
        new_y = this.y - 1;
        return new Position(new_x,new_y);
    }

    get_left(){
        new_x = this.x-1;
        new_y = this.y;
        return new Position(new_x,new_y);
    }

    get_right(){
        new_x = this.x+1;
        new_y = this.y;
        return new Position(new_x,new_y);
    }
}


function floodfill_reachable(start_pos, movable_spcs, goal_spcs, possActions){
    path = floodfill(start_pos, movable_spcs, goal_spcs, possActions);
    if (path == null){
        return false;
    }
    else {
        return true;
    }
}

function floodfill(start_pos, movable_spcs, goal_spcs, possActions){
    // only runs for actual moves. Ignores "space" which is "wait"
    range = 4;

    move_actions = possActions.slice(1,range+1);

    searched = []

    path = ff_recur(start_pos,movable_spcs,goal_spcs,searched,move_actions);

    return path;

}

// cur_location - Position object
// movable_spcs - reference to Dictionary of postition objects where we can move to without changing the state
// goal_spcs - reference to Dictionary of Goal Positions
// searched - reference to Dictionary of already searched locations. Starts empty.
// move_actions - Constant List of possible moves
//
// returns path to the goal
function ff_recur(cur_location, movable_spcs, goal_spcs, searched, move_actions){

    for (let i = 0; i<move_actions.length; ++i){
        switch(move_actions[i]){
            case "right":
                next_space =cur_location.get_right;
                next_move = "right";
                break;
            case "up":
                next_space =cur_location.get_up;
                next_move = "up";
                break;
            case "left":
                next_space =cur_location.get_left;
                next_move = "left";
                break;
            case "down":
                next_space =cur_location.get_dn;
                next_move = "down";
                break;
            default:
                next_space = null;
        }


        if (movable_spcs.includes(next_space) && !(searched.includes(next_space))){
            path.push(next_space);
            searched.push(next_space);
            if(goal_spcs.includes(next_space)){
                return path;
            }
            else{
                ff_return = ff_recur(next_space, movable_spcs, searched,move_actions); 

                if (ff_return != null){
                    return ff_return;
                }

            }
        }
    }

    // if loop is exited, no paths were found this way and a dead end was reached.
    return null;
}