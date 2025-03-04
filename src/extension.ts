import * as vscode from 'vscode';
import { YaraRulesProvider } from './yara/yaraTree';

export function activate(context: vscode.ExtensionContext) {

    const yaraRulesProvider = new YaraRulesProvider();
    vscode.window.createTreeView('yaraCompiler', { treeDataProvider: yaraRulesProvider, showCollapseAll: true });
    vscode.commands.registerCommand('yaraCompiler.refresh', () => yaraRulesProvider.refresh());

    const disposable = vscode.commands.registerCommand('yaraCompiler.openYaraFile', (filePath: string) => {
      vscode.workspace.openTextDocument(filePath).then((document) => {
        vscode.window.showTextDocument(document);
      });
    });

    const openRuleCommand = vscode.commands.registerCommand('yaraCompiler.openRule', async (filePath: string, ruleName: string) => {
      const document = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(document);
    
      const ruleRegex = new RegExp(`rule\\s+${ruleName}`);
      const text = document.getText();
      const match = text.match(ruleRegex);
    
      if (match && match.index !== undefined) {
        const position = document.positionAt(match.index);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(new vscode.Range(position, position));
      } else {
        vscode.window.showErrorMessage(`Rule "${ruleName}" not found in file.`);
      }
    });
}