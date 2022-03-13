const { path } = require("express/lib/application");
const util = require("util");
const { accessGameState } = require("./helpers");
const { isNoun, isConnector, isProperty, canPushThese } = require("./predicates");

/**
 * A class to pass around rules where the rule takes the form NOUN IS PROPERTY
 */
class Rule {
  /**
   *
   * @param {object} noun
   * @param {object} connector
   * @param {object} property
   */
  constructor(noun, connector, property) {
    this.noun = noun;
    this.connector = connector;
    this.property = property;
  }

  equals(other) {
    return util.isEqual(this, other);
  }
}

/**
 * @description Filter by words and/or rules from all of the rules that can be generated from the current game state.
 *              If words and rules are empty, all possible rules are returned (cartesian product).
 * @param {State} state the current game state.
 * @param {array} words possible words to filter OR an empty array.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} filtered rules - or all possible in triple of format {noun: n, is: i, property: p}.
 *
 */
function generateRules(state, words, rules) {
  rules = []

  // Generate all possible rules
  if (words.length == 0 && rules.length == 0) {
    const nouns = isNoun(state)
    const connectors = isConnector(state)
    const properties = isProperty(state)
    for (n of nouns) {
      for (c of connectors) {
        for (p of properties) {
          rules.push(new Rule(n, c, p))
        }
      }
    }
  }

  // 2. evaluate rules -> [],[],[rules]

  // 3. generate filtered subset -> [noun],[],[]

  // maybe?
  // 4. evaluate a filtered subset -> [noun],[],[rules]

  // 5. evaluate a filtered set -> [nouns], [properties], []

  return rules
}

/**
 * @description Filter out rules that are active in the current game state.
 *              If rules is empty, all of the rules in effect in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} rules possible values of rule to filter OR an empty array.
 * @return {array} filter out all rules that are active in the current game state.
 */
function activeRules(state, rules) {
  const stateRules = accessGameState(state, "rule_objs");

  let active = [];
  for (let i = 0; i < stateRules.length; i += 3) {
    active.push(new Rule(stateRules[i], stateRules[i + 1], stateRules[i + 2]));
  }

  if (rules.length > 0) {
    rules = rules.filter((r) => {
      active.some((ro) => ro.equals(r));
    });
  } else {
    rules = active;
  }
  return rules;
}

// TODO: implement canChangeRules
/**
 * @description Filter out rules in the current game state that can be changed.
 *              If rules is empty, all of the rules in effect in the current state.
 * @param {state} state the current game state.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} filter out all rules that can be changed in the current game state.
 */
function canChangeRules(state, rules) {
  // TODO: to save some time first check if all 3 words are static (since that happens a lot)

  // TODO: canActivateRules(state, rules) : can activate a rule if it isn't already?
  //        is there a 1x3 location to build the rule?
  //          for each candidate location:
  //          TODO: canPushTo(state, target, location, path) : can a target be pushed to a location?

  // canDeactivateRules(state, rules) : can deactivate an already active rule?

  return [];
}

// TODO:
/**
 * @description Filter out rules that can be activated from the current game state.
 *              If rules is empty, filter from all of the possible rules in this level.
 * @param {state} state the current game state.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} filter out all rules that can be activated from the current game state .
 */
function canActivateRules(state, rules) {
  return;
}

/**
 * @description Filter out rules in the current game state that can be deactivated.
 *              If rules is empty, filter from all of the active rules.
 * @param {state} state the current game state.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} filter out all rules that in the current game state that can be deactivated.
 */
function canDeactivateRules(state, rules) {
  let outList = []

  // get all the rules if they are active
  if (rules.length == 0) {
    rules = activeRules(state, [])
  }

  // for each rule, find a path that deactivates it (if they exist)
  rules.forEach((rule) => {
    if (path.length > 0) {
      outList.push({ "rule": rule, "path": canDeactivateRule(state, rule) })
    };
  })

  return outList;
}

/**
 * @description If a rule can be deactivated, return a path to do so
 * @param {state} state the current game state.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} the first path found that deactivates this rule or an empty path if none are found.
 */
function canDeactivateRule(state, rule) {

  // get the rule direction
  let direction = ruleDirection(rule);
  for (let pushableWord of rule.values()) {

    // find all the paths that could push this word perpendicular to the rule
    let possibleDirs = []
    if (direction == "down") {
      possibleDirs = canPush(state, pushableWord, ["left", "right"]);
    } else {
      possibleDirs = canPush(state, pushableWord, ["up", "down"]);

    }

    // just return the first path for any word
    if (possibleDirs.length > 0) {
      return possibleDirs[0].path;
    }
  }

  return [];
}

/**
 * @description Get the direction of an existing rule.
 * @param {Rule} rule an active rule
 * @returns {string} "down"|"right" if the rule reads top-to-bottom|left-to-right
 */

function ruleDirection(rule) {
  return rule.noun.x < rule.connector.x ? "left" : "down";
}


module.exports = { activeRules };
