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
function rule(state, rules) {
  const stateRules = accessGameState(state, "rule_objs");

  let ruleObjects = [];
  for (let i = 0; i < stateRules.length; i += 3) {
    ruleObjects.push(
      new Rule(stateRules[i], stateRules[i + 1], stateRules[i + 2])
    );
  }

  if (rules.length > 0) {
    rules = rules.filter((r) => {
      ruleObjects.some((ro) => ro.equals(r));
    });
  } else {
    rules = ruleObjects;
  }
  return rules;
}

/**
 * @description Filter out rules in the current game state that can be .
 *              If rules is empty, all of the rules in effect in the current state.
 * @param {string} state the acsii representation of the current game state.
 * @param {array} rules possible values of rule to filter OR an empty array.
 * @return {array} filter out all rules that are active in the current game state.
 */
function canChangeRule(state, rules) {}

module.exports = { rule };
