const { path } = require("express/lib/application");
const { isEqual } = require("lodash");
const { accessGameState, Position, simulate, static, bounds, atLocation, objectFilter } = require("./helpers");
const { isNoun, isConnector, isProperty, isStop, canPush, canPushTo } = require("./predicates");
const simjs = require("../../js/simulation");

/**
 * A class to pass around rules where the rule takes the form NOUN IS PROPERTY
 */
class Rule {
  /**
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
    return isEqual(this, other);
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
    return getRules(isNoun(state, []), isConnector(state, []), isProperty(state, []));
  } else if (words.length > 0 && rules.length == 0) { // Only generate property rules that can be made from words
    return getRules(isNoun(state, words), isConnector(state, words), isProperty(state, words));
  } else if (words.length == 0 && rules.length > 0) { // Filter property rules that can be made from the current state
    const all_rules = getRules(isNoun(state, []), isConnector(state, []), isProperty(state, []));
    return rules.filter((r) => all_rules.includes(r));
  }
  return rules;
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
    return getRules(isNoun(state, []), isConnector(state, []), isNoun(state, []));
  } else if (words.length > 0 && rules.length == 0) { // Only generate noun rules that can be made from words
    return getRules(isNoun(state, words), isConnector(state, words), isNoun(state, words));
  } else if (words.length == 0 && rules.length > 0) { // Filter noun rules that can be made from the current state
    const all_rules = getRules(isNoun(state, []), isConnector(state, []), isNoun(state, []));
    return rules.filter((r) => all_rules.includes(r));
  }
  return rules;
}

/**
 * @description Gets all rules given nouns, connectors, and properties.
 * @param {array} nouns possible noun words.
 * @param {array} connectors possible connector words.
 * @param {array} properties possible property words.
 * @return {array} all possible rules in triple of format {noun: n, connector: c, property: p}.
 *
 */
function getRules(nouns, connectors, properties) {
  let rules = [];

  // use this order so debugging is easier (and searching for alternatives is a bit)
  for (let n of nouns) {
    for (let p of properties) {
      for (let c of connectors) {


        // Remove self referencing rules (should only encounter this if dealing with NOUN IS NOUN rules)
        if (!isEqual(n, p)) {
          rules.push(new Rule(n, c, p));
        }
      }
    }
  }
  return rules;
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
      return active.some((ro) => {
        return ro.equals(r);
      });
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
  // first get all the rules that can be activated
  let outList = canActivateRules(state, rules);

  // next get all the rules that can be deactivated
  return outList.concat(canDeactivateRules(state, rules));

}

/**
 * @description Filter out rules that can be activated from the current game state.
 *              If rules is empty, filter from all of the possible rules in this level.
 * @param {state} state the current game state.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} filter out all rules that can be activated from the current game state.
 *                 Objects in this list are of the form {rule: <Rule>, path: <path>} 
 */
function canActivateRules(state, rules) {

  // if none were given, try to make all rules
  if (rules.length == 0) {
    rules = generateRules(state, [], []);
  }

  // remove any rules that are already in effect
  let existingRules = activeRules(state, rules);
  rules = rules.filter((rule) => {
    return !existingRules.some((exRule) => {
      return exRule.equals(rule);
    });
  });

  // find all the rules that can be created in those locations
  let outList = [];

  for (let rule of rules) {
    // generate all 1x3 candidate locations in the current state
    let locations = generateRuleCandidateLocations(state, rule);

    // TODO: intelligently select candidate locations based on starting locations of the words (some form of A*)

    // check if this rule can be made in each candidate location
    for (let loc of locations) {
      let fullPath = [];
      let nextState = state;
      let nextPath = [];

      // TODO: get all permutations of these orders (NOUN,CONN,PROP), (NOUN,PROP, CONN), (PROP,NOUN,CONN), ...

      // Get the noun in place
      if (!atLocation(rule.noun, loc[0])) {
        nextPath = canPushTo(nextState, rule.noun, loc[0], []);

        // continue if there is no path to do this action
        if (nextPath.length == 0) {
          continue;
        }
        fullPath = fullPath.concat(nextPath);
        nextState = simulate(nextState, nextPath);
      }

      // Get the connector in place
      if (!atLocation(rule.connector, loc[1])) {
        nextPath = canPushTo(nextState, rule.connector, loc[1], []);

        // continue if there is no path to do this action
        if (nextPath.length == 0) {
          continue;
        }
        fullPath = fullPath.concat(nextPath);
        nextState = simulate(nextState, nextPath);
      }

      // Get the property in place
      if (!atLocation(rule.property, loc[2])) {
        nextPath = canPushTo(state, rule.property, loc[2], []);

        // continue if there is no path to do this action
        if (nextPath.length == 0) {
          continue;
        }
        fullPath = fullPath.concat(nextPath);
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
  let outList = [];

  // get all the active rules if given the empty list
  if (rules.length == 0) {
    rules = activeRules(state, []);
  }

  // for each rule, find a path that deactivates it (if they exist)
  rules.forEach((rule) => {
    let deactivatePath = canDeactivateRule(state, rule);

    if (deactivatePath.length > 0) {
      outList.push({ "rule": rule, "path": path });
    }
  });

  return outList;
}

/**
 * @description If a rule can be deactivated, return a path to do so
 * @param {state} state the current game state.
 * @param {Rule} rule the rule to attempt to deactivate
 * @return {array} the first path found that deactivates this rule or an empty path if none are found.
 */
function canDeactivateRule(state, rule) {

  // make sure the rule is active
  if (!activeRules(state, [rule])) {
    return [];
  }

  // to save some time first check if all 3 words are static (since that happens a lot)
  let movableWords = Object.values(rule).filter((word) => { return !static(state, word) });
  if (movableWords.length == 0) {
    return [];
  }

  // get the rule direction
  let direction = ruleDirection(rule);
  for (let pushableWord of movableWords) {

    // find all the paths that could push this word perpendicular to the rule
    let possibleDirs = [];
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

/**
 * @description Generate all of the locations that a new rule could be created, including from other 
 * @param {State} state the current game state
 * @param {Rule} rule A rule (that is nonexistant) to search candidate locations for
 * @returns {Array} An array of 3-tuples of positions where a rule can be created
 */
function generateRuleCandidateLocations(state, rule) {
  const [x_bounds, y_bounds] = bounds(state);

  // get a range from start to end
  function* _range(start, end) {
    yield start;
    if (start === end) return;
    yield* range(start + 1, end);
  }

  let candidates = [];

  // are any words in rule static?  If so, limit the space to the surrounding area
  if (static(state, rule.noun)) {
    // horizontal
    candidates.push([new Position(rule.noun.x, rule.noun.y), new Position(rule.noun.x + 1, rule.noun.y), new Position(rule.noun.x + 2, rule.noun.y)]);
    // vertical
    candidates.push([new Position(rule.noun.x, rule.noun.y), new Position(rule.noun.x, rule.noun.y + 1), new Position(rule.noun.x, rule.noun.y + 2)]);
  }
  if (static(state, rule.connector)) {
    // if the noun is static, just give the remaining possibilities
    if (candidates.length > 0) {
      if (atLocation(rule.connector, candidates[0][1])) {
        return [candidates[0]];
      } else if (atLocation(rule.connector, candidates[1][1])) {
        return [candidates[1]];
      }
      return [];
    }

    // horizontal
    candidates.push([new Position(rule.connector.x - 1, rule.connector.y), new Position(rule.connector.x, rule.connector.y), new Position(rule.connector.x + 1, rule.connector.y)]);
    // vertical
    candidates.push([new Position(rule.connector.x, rule.connector.y - 1), new Position(rule.connector.x, rule.connector.y), new Position(rule.connector.x, rule.connector.y + 1)]);
  }
  if (static(state, rule.property)) {
    // if one of the other words is static and this isn't in either possible place, return empty
    if (candidates.length > 0) {
      if (atLocation(rule.property, candidates[0][2])) {
        return [candidates[0]];
      } else if (atLocation(rule.property, candidates[0][2])) {
        return [candidates[1]];
      }
      return [];
    }

    // horizontal
    candidates.push([new Position(rule.property.x - 2, rule.property.y), new Position(rule.property.x - 1, rule.property.y), new Position(rule.property.x, rule.property.y)]);
    // vertical
    candidates.push([new Position(rule.property.x, rule.property.y - 2), new Position(rule.property.x, rule.property.y - 1), new Position(rule.property.x, rule.property.y)]);
  }
  // if something is static, return the chocies.
  if (candidates.length > 0) {
    return candidates;
  }

  // Find candidates (filter any static options)
  for (let col in _range(1, x_bounds - 1)) {
    for (let row in _range(1, y_bounds - 1)) {
      let pos = new Position(col, row);



      // get all immovable obstacles that aren't words in this rule
      let obstacles = objectFilter(neighbors(pos), ([_, neighbor]) => {

        if (static(state, neighbor) || isStop(state, [neighbor])) {
          return true;
        }

        // check if this neighbor is a word in this rule
        return !Object.values(rule).some((word) => {
          return atLocation(word, neighbor)
        });
      });

      // horizontal
      if (!(obstacles.left || obstacles.right)) {
        candidates.push([new Position(col - 1, row), new Position(col, row), new Position(col + 1, row)]);
      }
      // vertical
      if (!(obstacles.up || obstacles.down)) {
        candidates.push([new Position(col, row - 1), new Position(col, row), new Position(col, row + 1)]);
      }
    }
  }

  return candidates;
}

module.exports = {
  generateRules,
  generatePropertyRules,
  generateNounRules,
  canChangeRules,
  canActivateRules,
  canDeactivateRules,
  activeRules,
  getRules
};
