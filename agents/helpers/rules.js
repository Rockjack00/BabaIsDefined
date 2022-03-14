const { path } = require("express/lib/application");
const util = require("util");
const { accessGameState, Position, simulate } = require("./helpers");
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
 * @description Generate property and noun rules based on the current state and given words and rules lists. 
 *              Return the concatenation of property rules and noun rules.
 * @param {State} state the current game state.
 * @param {array} words possible words to filter OR an empty array.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} filtered rules - or all possible in triple of format {noun: n, connector: c, property: p} or format {noun: n, connector: c, noun: n}.
 *
 */
function generateRules(state, words, rules) {
    let property_rules = generatePropertyRules(state, words, rules);
    let noun_rules = generateNounRules(state, words, rules);
    return property_rules.concat(noun_rules);
}

/**
 * @description Filter by words and/or rules from all of the property rules that can be generated from the current game state.
 *              If words and rules are empty, all possible property rules are returned (cartesian product).
 * @param {State} state the current game state.
 * @param {array} words possible words to filter OR an empty array.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} filtered rules - or all possible in triple of format {noun: n, connector: c, property: p}.
 *
 */
function generatePropertyRules(state, words, rules) {
    if (words.length == 0 && rules.length == 0) { // Generate all possible property rules
        return getRules(isNoun(state), isConnector(state), isProperty(state))
    } else if (words.length > 0 && rules.length == 0) { // Only generate property rules that can be made from words
        return getRules(isNoun(state, words), isConnector(state, words), isProperty(state, words))
    } else if (words.length == 0 && rules.length > 0) { // Filter property rules that can be made from the current state
        const all_rules = getRules(isNoun(state), isConnector(state), isProperty(state))
        return rules.filter((r) => all_rules.includes(r))
    }
    return rules
}

/**
 * @description Filter by words and/or rules from all of the noun rules that can be generated from the current game state.
 *              If words and rules are empty, all possible noun rules are returned (cartesian product).
 * @param {State} state the current game state.
 * @param {array} words possible words to filter OR an empty array.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} filtered rules - or all possible in triple of format {noun: n, connector: c, noun: n}.
 *
 */
function generateNounRules(state, words, rules) {
  if (words.length == 0 && rules.length == 0) { // Generate all possible noun rules
    return getRules(isNoun(state), isConnector(state), isNoun(state))
  } else if (words.length > 0 && rules.length == 0) { // Only generate noun rules that can be made from words
    return getRules(isNoun(state, words), isConnector(state, words), isNoun(state, words))
  } else if (words.length == 0 && rules.length > 0) { // Filter noun rules that can be made from the current state
    const all_rules = getRules(isNoun(state), isConnector(state), isNoun(state))
    return rules.filter((r) => all_rules.includes(r))
  }
  return rules
}

/**
 * @description Gets all rules given nouns, connectors, and properties.
 * @param {array} nouns possible noun words.
 * @param {array} connectors possible connector words.
 * @param {array} properties possible property words.
 * @return {array} all possible rules in triple of format {noun: n, connector: c, property: p}.
 *
 */
getRules(nouns, connectors, properties) {
  rules = []
  for (n of nouns) {
    for (c of connectors) {
      for (p of properties) {
        rules.push(new Rule(n, c, p))
      }
    }
  }
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

/**
 * @description Filter out rules in the current game state that can be changed.
 *              If rules is empty, all of the possible rules in this level.
 * @param {state} state the current game state.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} for every rules that can be changed an object of the form {rule: <rule>, path: <path-to-change>}
 */
function canChangeRules(state, rules) {

  let outList = [];

  // first get all the rules that can be activated
  // TODO: implement canActivateRules
  outList = canActivateRules(state, rules);

  // next get all the rules that can be deactivated
  outList.concat(canDeactivateRules(state, rules));

  return outList;
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

  // if none were given, try to make all rules
  if (rules.length == 0) {
    rules = generateRules(state, [], [])
  }

  // remove any rules that are already in effect
  let existingRules = activeRules(state, rules);
  rules.filter(rule => !existingRules.includes(rule))


  // TODO: generate all 1x3 candidate locations in the current state
  // locations are a list of the three positions in order

  // find all the rules that can be created in those locations
  let outList = [];

  for (let rule of rules) {
    // TODO: intelligently select candidate locations based on starting locations of the words (some form of A*)

    // check if this rule can be made in each candidate location
    for (let loc of locations) {
      // TODO: implement atLocation(object, position)
      let fullPath = [];
      let nextState = state;
      let nextPath = [];

      // Get the noun in place
      if (!atLocation(rule.noun, loc[0])) {
        nextPath = canPushTo(state, rule.noun, loc[0], []);

        // continue if there is no path to do this action
        if (nextPath.length == 0) {
          continue
        }
        fullPath.concat(nextPath);
        nextState = simulate(state, nextPath);
      }

      // Get the connector in place
      if (!atLocation(rule.connector, loc[1])) {
        nextPath = canPushTo(state, rule.connector, loc[1], []);

        // continue if there is no path to do this action
        if (nextPath.length == 0) {
          continue
        }
        fullPath.concat(nextPath);
        nextState = simulate(state, nextPath);
      }

      // Get the property in place
      if (!atLocation(rule.property, loc[2])) {
        nextPath = canPushTo(state, rule.property, loc[2], []);

        // continue if there is no path to do this action
        if (nextPath.length == 0) {
          continue
        }
        fullPath.concat(nextPath);
      }

      // we found a location that works!
      outList.push({ "rule": rule, "path": fullPath });
      break;
    }
  }
  return outList;
}

/**
 * @description Filter out rules in the current game state that can be deactivated.
 *              If rules is empty, filter from all of the active rules.
 * @param {state} state the current game state.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} for every rules that can be deactivated, an object of the form {rule: <rule>, path: <path-to-change>}
 */
function canDeactivateRules(state, rules) {
  let outList = []

  // get all the active rules if given the empty list
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

  // make sure the rule is active
  if (!activeRules(state, [rule])) {
    return [];
  }

  // to save some time first check if all 3 words are static (since that happens a lot)
  let movableWords = rule.values().filter((word) => { return !static(state, word) });
  if (movableWords.length == 0) {
    return [];
  }

  // get the rule direction
  let direction = ruleDirection(rule);
  for (let pushableWord of movableWords) {

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


module.exports = {
    generateRules,
    generatePropertyRules,
    generateNounRules,
    canChangeRules,
    canActivateRules,
    activeRules,
    getRules
};
