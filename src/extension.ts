import * as vscode from 'vscode';
import { YaraRulesProvider, YaraFile, YaraRule } from './yara/yaraTree';
import { compileYaraFile, compileAllYaraFiles } from './yara/yaraCompiler';
import axios from 'axios';

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

  const compileFileCommand = vscode.commands.registerCommand('yaraCompiler.compileFile', async (yaraFile: YaraFile) => {
    try {
      await compileYaraFile(yaraFile);
      vscode.window.showInformationMessage(`File "${yaraFile.label}" compiled successfully!`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to compile file "${yaraFile.label}": ${error}`);
    }
  });

  const compileAllFilesCommand = vscode.commands.registerCommand('yaraCompiler.compileAllFiles', async () => {
    try {
      await compileAllYaraFiles(yaraRulesProvider.yaraFiles);
      vscode.window.showInformationMessage(`Files compiled successfully!`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to compile files: ${error}`);
    }
  });


  const pusher = vscode.commands.registerCommand('yaraCompiler.pushRules', async () => {
    const url = process.env.PUSH_URL;
    if (!url) {
      vscode.window.showErrorMessage('PUSH_URL is not set in environment variables');
      return;
    }

    try {
      const response = await axios.get(url);
      vscode.window.showInformationMessage(`Rules sended...`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to send request: ${error}`);
    }
  });
}