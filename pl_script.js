const { normalize } = require("path");
var pl = require("tau-prolog"); // access the knowledge base
const { getGamestate } = require("./js/simulation");

var simjs = require("./js/simulation"); // access the game states and simulation
var jsonjs = require("./js/json_io");

/* Instantiate a knowledge base */
var kb = pl.create();
const comp_limit = 100000; // maximum prolog steps
const coreKB = "./kb/logic.pl";

// Report a debug message
const DEBUG = true;
debug = (msg) => {
  if (DEBUG) {
    console.log(msg);
  }
};

// Get Node.js argument: node --inspect pl_script.js levels_path
const levels = process.argv[2];
const levelId = parseInt(process.argv[3]);
let lvlSet = jsonjs.getLevelSet(levels);
let lvl = jsonjs.getLevel(lvlSet, levelId);
let init_state = lvl.ascii;

var query = `isYou("${init_state}", baba).`;
// var query = `reachable(3,4,${init_state},Path)`;
// var query = `win("${init_state}",Path).`;

/* Initialize the core knowledge base */
kb.consult(coreKB, {
  /* Program parsed  correctly */
  success: function () {
    debug("Sucessfully loaded the core knowledge base.");
    /* Create a query for the knowledge base */
    kb.query(query, {
      /* Goal parsed correctly */
      success: function (goal) {
        debug(`Successfully parsed the goal: \n${goal}\n`);
        /* Asynchronously attempt to find a solution to the goal */
        kb.answer({
          /* Callback for when a solution has been found */
          success: function (answer) {
            // answer is a substitution like {X/apple}
            debug(kb.format_answer(answer)); // readable format: Path = [up,left,down,right, ...]

            /* Update the best solution with the answer */
            // solution = answer.links["Path"];
            // if (bestPath == null || length(bestPath) > length(solution)) {
            //   bestPath = solution;
            // }

            // return bestPath;
          },

          /* Uncaught error */
          error: function (err) {
            message =
              `Error in solving the level:\n${init_state}\n` + err.message;
            throw message;
          },

          /* No (more) answers */
          fail: function () {
            debug("No (more) solutions found.");
            return [];
          },

          /* Limit exceeded */
          limit: function () {
            console.log(`Computation limit (${comp_limit} steps) exceeded.`);
            return [];
          },
        });
      },

      /* Error parsing goal */
      error: function (err) {
        message = `Failed to parse the level:\n${init_state}\n` + err.message;
        throw message;
      },
    });
  },

  /* Error parsing program */
  error: function (err) {
    message =
      `Failed to load the core knowlege base at ${normalize(coreKB)}.\n` +
      err.message;
    throw message;
  },
});
