use_module("../js/prolog_wrapper.js").

/*TODO create isYou() and isWin() predicates in js wrapper*/
win(Map,Path):- isYou(Map,X), isWin(Map,X).
win(Map,Path):- isYou(Map,X), isWin(Map,Y), reachable(X,Y,Map,Path).
win(Map,Path):- isYou(Map,X), makeWin(Map,Y), reachable(X,Y,Map,Path).

reachable(X,Y,Map,Path):- floodfill(X,Y,Map,Path).

/*We can make something win either by changing its rules or transforming it.
Both predicates will be js queries*/
makeWin(Map,Y):- assertWin(Map,Y).
makeWin(Map,Y):- createWin(Map,Y).
