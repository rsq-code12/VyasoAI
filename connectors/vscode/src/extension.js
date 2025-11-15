const vscode = require('vscode');

function activate(context) {
  console.log('Vyaso AI VS Code extension activated');
  context.subscriptions.push(
    vscode.commands.registerCommand('vyasoai.hello', () => {
      vscode.window.showInformationMessage('Vyaso AI says hello!');
    })
  );
}

function deactivate() {}

module.exports = { activate, deactivate };