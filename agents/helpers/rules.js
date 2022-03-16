const { path } = require("express/lib/application");
const { isEqual } = require("lodash");
const { accessGameState, Position, simulate, static, bounds, atLocation, objectFilter } = require("./helpers");
const { isNoun, isConnector, isProperty, isStop, canPush, canPushTo } = require("./predicates");
const simjs = require("../../js/simulation");

/* A class to pass around rules where the rule takes the form NOUN IS PROPERTY or NOUN IS NOUN */
class Rule {
  /**
   * Create a Rule.
   * @param {object} noun the subject of the rule, which applies to all matching phys_obj 
   * @param {object} connector an IS connector
   * @param {object} property a property to apply to all matching phys_obj - OR - a noun to transform all of the Rule.nouns into.
   */
  constructor(noun, connector, property) {
    this.noun = noun;
    this.connector = connector;
    this.property = property;
  }

  /**
   * See if this Rule is equal to something else.
   * @param {Any} other 
   * @returns {Boolean} true|false if all of the values for all of the fields of this Rule match other (even if they aren't the same Object)
   */
  equals(other) {
    return isEqual(this, other);
  }
}

/**
 * Generate all possible rules of combinations properties and nouns based on the current state and given words and rules lists. 
 * @param {State} state the current game state.
 * @param {Array<Word>} words possible words to filter OR an empty array.
 * @param {Array<Rule>} rules possible rules to filter OR an empty array.
 * @return {Array<Rule>} list of filtered rules - or all possible.
 */
function generateRules(state, words, rules) {
  let property_rules = generatePropertyRules(state, words, rules);
  let noun_rules = generateNounRules(state, words, rules);
  return property_rules.concat(noun_rules);
}

/**
 * Filter by words and/or rules from all of the property rules that can be generated from the current game state.
 * If words and rules are empty, all possible property rules are returned (cartesian product).
 * @param {State} state the current game state.
 * @param {Array<Word>} words possible words to filter OR an empty array.
 * @param {Array<Rule>} rules possible rules to filter OR an empty array.
 * @return {Array<Rule>} filtered rules - or all possible.
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
 * Filter by words and/or rules from all of the noun rules that can be generated from the current game state.
 * If words and rules are empty, all possible noun rules are returned (cartesian product).
 * @param {State} state the current game state.
 * @param {Array<Word>} words possible words to filter OR an empty array.
 * @param {Array<Rule>} rules possible rules to filter OR an empty array.
 * @return {Array<Rule>} filtered rules - or all possible.
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
 * Gets all rules given nouns, connectors, and properties.
 * @param {Array<Word>} nouns possible noun words.
 * @param {Array<Word>} connectors possible connector words.
 * @param {Array<Word>} properties possible property words.
 * @return {Array<Rule>} all possible rules from the given combination of words.
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
 * Filter out rules that are active in the current game state.
 * If rules is empty, all of the rules in effect in the current state.
 * @param {State} state the current game state.
 * @param {Array<Rule>} rules possible values of rule to filter OR an empty array.
 * @return {Array<Rule>} filter out all rules that are active in the current game state.
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
 * Filter out rules in the current game state that can be changed.
 * If rules is empty, all of the possible rules in this level.
 * @param {State} state the current game state.
 * @param {Array<Rule>} rules possible rules to filter OR an empty array.
 * @return {Array<Object>} for every rule that can be changed an object of the form 
 *                         {rule: <rule>, path: <path-to-change>}
 */
function canChangeRules(state, rules) {
  // first get all the rules that can be activated
  let outList = canActivateRules(state, rules);

  // next get all the rules that can be deactivated
  return outList.concat(canDeactivateRules(state, rules));
}

/**
 * Filter out rules that can be activated from the current game state.
 * If rules is empty, filter from all of the possible rules in this level.
 * @param {State} state the current game state.
 * @param {Array<Rule>} rules possible rules to filter OR an empty array.
 * @return {Array<Object>} filter out all rules that can be activated from the current game state.
 *                         Objects in this list are of the form {rule: <Rule>, path: <path>} 
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
 * Filter out rules in the current game state that can be deactivated.
 * If rules is empty, filter from all of the active rules.
 * @param {State} state the current game state.
 * @param {Array<Rule>} rules possible rules to filter OR an empty array.
 * @return {Array<Object>} for every rules that can be deactivated, an object of the form 
 *                         {rule: <rule>, path: <path-to-change>}
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
      outList.push({ "rule": rule, "path": deactivatePath });
    }
  });

  return outList;
}

/**
 * If a rule can be deactivated, return a path to do so
 * @param {State} state the current game state.
 * @param {Rule} rule the rule to attempt to deactivate
 * @return {Array<String>} the first path found that deactivates this rule or an empty path if none are found.
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

    // just return the first path for any word including the final push direction to deactivate the rule
    if (possibleDirs.length > 0) {
      return possibleDirs[0].path.concat(possibleDirs[0].direction);
    }
  }

  return [];
}

/**
 * Get the direction of an existing rule.
 * @param {Rule} rule an active rule
 * @returns {string} "down"|"right" if the rule reads top-to-bottom|left-to-right
 */
function ruleDirection(rule) {
  return rule.noun.x < rule.connector.x ? "left" : "down";
}

/**
 * Generate all of the locations that a new rule could be created, including from other 
 * @param {State} state the current game state
 * @param {Rule} rule A rule (that is nonexistant) to search candidate locations for
 * @returns {Array<Array<Position>>} An array of 3-tuples of positions where a rule can be created
 */
function generateRuleCandidateLocations(state, rule) {
  const [x_bounds, y_bounds] = bounds(state);

  // get a range from start to end (inclusive)
  function* _range(start, end) {
    yield start;
    if (start === end) return;
    yield* _range(start + 1, end);
  }

  let candidates = [];

  // are any words in rule static?  If so, limit the space to the surrounding area
  if (static(state, rule.noun)) {
    // horizontal
    if (rule.noun.x < x_bounds - 3) {
      candidates.push([new Position(rule.noun.x, rule.noun.y), new Position(rule.noun.x + 1, rule.noun.y), new Position(rule.noun.x + 2, rule.noun.y)]);
    }
    // vertical
    if (rule.noun.y < y_bounds - 3) {
      candidates.push([new Position(rule.noun.x, rule.noun.y), new Position(rule.noun.x, rule.noun.y + 1), new Position(rule.noun.x, rule.noun.y + 2)]);
    }

    if (candidates.length == 0) {
      return [];
    }

  }
  if (static(state, rule.connector)) {
    // if the noun is static, just give the remaining possibilities
    if (candidates.length > 0) {
      return candidates.filter((c) => { return atLocation(rule.connector, c[1]) });
    }

    // horizontal
    if (rule.connector.x < x_bounds - 2 && rule.connector.x > 1) {
      candidates.push([new Position(rule.connector.x - 1, rule.connector.y), new Position(rule.connector.x, rule.connector.y), new Position(rule.connector.x + 1, rule.connector.y)]);
    }
    // vertical
    if (rule.connector.y < y_bounds - 2 && rule.connector.y > 1) {
      candidates.push([new Position(rule.connector.x, rule.connector.y - 1), new Position(rule.connector.x, rule.connector.y), new Position(rule.connector.x, rule.connector.y + 1)]);
    }

    if (candidates.length == 0) {
      return [];
    }
  }
  if (static(state, rule.property)) {
    // if one of the other words is static and this isn't in either possible place, return empty
    if (candidates.length > 0) {
      return candidates.filter((c) => { return atLocation(rule.property, c[2]) });
    }

    // horizontal
    if (rule.property.x < x_bounds - 1 && rule.property.x > 2) {

      candidates.push([new Position(rule.property.x - 2, rule.property.y), new Position(rule.property.x - 1, rule.property.y), new Position(rule.property.x, rule.property.y)]);
    }
    // vertical
    if (rule.property.y < y_bounds - 1 && rule.property.x > 2) {

      candidates.push([new Position(rule.property.x, rule.property.y - 2), new Position(rule.property.x, rule.property.y - 1), new Position(rule.property.x, rule.property.y)]);
    }
    if (candidates.length == 0) {
      return [];
    }

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

        // static objects, STOP objects, and edges are returned as obstacles
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
