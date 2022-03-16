# BabaIsDefined

A class project for CSC 481 - Knowledge Based Systems at Cal Poly taught by Dr. Rodrigo Canaan. 

We create an agent that intelligently solves
levels for the game 'Baba Is You' based on the [KekeCompetition](https://github.com/MasterMilkX/KekeCompetition) framework
created by M Charity.

Contributors: Tyler Olson, Adam Albanese, Arman Rafian, Gregory Hastings

[Competition Website](http://keke-ai-competition.com/)

## Style Checking

In order to maintain project readability, we will use the following
style checkers and linters.

### Format on Save

In your editor of choice, enable format on save so that linting is
done automatically.
For VSCode, add the following to `.vscode/settings.json`:

```json
{
    "editor.defaultFormatter": null,
    "editor.formatOnSave": true,
    "[javascript]": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "prettier.tabWidth": 4
    }
}
```

### Prettier and ESLint for JavaScript

To install ESLint and Prettier, run the following command:

```
npm install --save-dev eslint prettier eslint-config-prettier eslint-plugin-prettier husky lint-staged
```

The following Prettier options are modified from their default value:
| Option | Description |
| ------ | ----------- |
| `"jsxBracketSameLine": true` | Put the > of a multi-line JSX element at the end of the last line instead of being alone on the next line (does not apply to self closing elements). |
| `"endOfLine": "auto"` | Maintain existing line endings (mixed values within one file are normalized by looking at what’s used after the first line). |

---

## KekeCompetition - JS Version

### Introduction

Framework for the Keke Competition - an AI competition for the puzzle game 'Baba is You'.
This version uses the JS implementation originally found on the [Baba is Y'all](http://equius.gil.engineering.nyu.edu/) website

### Requirements

-   NodeJS
-   Web-browser (preferably Google Chrome)
-   Terminal
-   A text editor (for creating agents)
-   Tau-prolog (A Prolog interpreter for JavaScript)

### Installation

1. Clone this repository to your local machine
2. Download and install the package manager [NodeJS](https://nodejs.org/en/download/)
3. Run the command `npm install` to install the necessary packages found in the [package-lock.json](package-lock.json) file

### Usage

#### Start the server:

1. Run the command `node index-server.js`.
2. In a browser, go to the URL `localhost:8080`
   _Note_: this port number can be changed on _line 15_ in the [index-server.js](index-server.js) file

#### Attaching VSCode Debugger

1. To enable Auto Attach feature, from the Command Palette (Ctrl+Shift+P) type `Toggle Auto Attach`. Select the option `Only With Flag`, the flag being `--inspect`.
2. Now to run the server with the debugger, simply do the same but with the flag: `node --inspect index-server.js`

### Quick Start

1. To create a new agent, copy the `empty_AGENT.js` file and rename it with the following convention:
   `[NAME]_AGENT.py`.
2. Modify the `step()` and `init()` functions in the agent code.
3. In the evaluator app on your browser, select your agent from the dropdown on the right
4. Select the level set you want to test on from the dropdown on the right
5. Press 'Run Agent' to evaluate the levels from the selected level set

For more information, check the [competition wiki](https://github.com/MasterMilkX/KekeCompetition/wiki)

### License

[MIT](https://choosealicense.com/licenses/mit/)
