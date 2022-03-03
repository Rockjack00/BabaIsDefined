// Import Tau Prolog core and create a session
const pl = require("tau-prolog");
const session = pl.create(1000);
const show = x => console.log(session.format_answer(x));

// Get Node.js argument: node ./script.js item
const item = process.argv[2];

// Program and goal
const program = `
    % Products
    item(id(1), name(bread)).
    item(id(2), name(water)).
    item(id(3), name(apple)).
    % Shops
    shop(id(1), name(tau), location(spain)).
    shop(id(2), name(swi), location(netherlands)).
    % Stock
    stock(item(1), shop(1), count(23), price(0.33)).
    stock(item(2), shop(1), count(17), price(0.25)).
    stock(item(2), shop(2), count(34), price(0.31)).
    stock(item(3), shop(2), count(15), price(0.45)).
`;
const goal = `
    item(id(ItemID), name(${item})),
    stock(item(ItemID), shop(ShopID), _, price(Price)),
    shop(id(ShopID), name(Shop), _).
`;

// Consult program, query goal, and show answers
session.consult(program, {
    success: function() {
        session.query(goal, {
            success: function() {
                session.answers(show);
            }
        })
    }
});