use_module("../js/prolog_wrapper.js").

/*TODO create isYou() and isWin() predicates in js wrapper*/
win(State,Path):- isYou(State,X), isWin(State,X).
win(State,Path):- isYou(State,X), isWin(State,Y), reachable(X,Y,State,Path).
win(State,Path):- isYou(State,X), makeWin(State,Y), reachable(X,Y,State,Path).

/*reachable(X,Y,State,Path):- floodfill(X,Y,State,Path).*/

/*We can make something win either by changing its rules or transforming it.
Both predicates will be js queries*/
makeWin(State,Y):- assertWin(State,Y).
makeWin(State,Y):- createWin(State,Y).
