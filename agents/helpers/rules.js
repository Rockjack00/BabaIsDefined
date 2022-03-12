const util = require("util");
const { accessGameState } = require("./helpers");

/**
 * A class to pass around rules where the rule takes the form NOUN IS PROPERTY
 */
class Rule {
  /**
   *
   * @param {object} noun
   * @param {object} is
   * @param {object} property
   */
  constructor(noun, is, property) {
    this.noun = noun;
    this.is = is;
    this.property = property;
  }

  equals(other) {
    return util.isEqual(this, other);
  }
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
 * @param {string} state the acsii representation of the current game state.
 * @param {array} rules possible rules to filter OR an empty array.
 * @return {array} filter out all rules that are active in the current game state.
 */
function canChangeRules(state, rules) {
  // TODO: are all 3 words static?
  return [];

  // TODO: canActivateRules(state, rules) : can activate a rule if it isn't already?
  //        is there a 1x3 location to build the rule?
  //          for each candidate location:
  //          TODO: canPushTo(state, target, location, path) : can a target be pushed to a location?

  // TODO: canDeactivateRules(state, rules) : can deactivate an already active rule?
  //   TODO: ruleDirection(state, rule) : get the direction of an existing rule
  //           canPushThese words in a direction perpendicular to the rule?
}

module.exports = { activeRules };
