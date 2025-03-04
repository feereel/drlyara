import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class YaraRulesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null> = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null> = this._onDidChangeTreeData.event;

    private watcher: vscode.FileSystemWatcher;

    constructor() {
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*.yara');
    
        this.watcher.onDidChange(() => this.refresh());
        this.watcher.onDidCreate(() => this.refresh());
        this.watcher.onDidDelete(() => this.refresh());
      }
    

	refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
	}

    getTreeItem(element: YaraFile): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        if (element) {
          if (element instanceof YaraFile) {
            return this.getYaraRules(element);
          }
          return Promise.resolve([]);
        } else {
          return this.getYaraFiles();
        }
      }

    private async getYaraFiles(): Promise<YaraFile[]> {
        const yaraFiles: YaraFile[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
    
        if (workspaceFolders) {
          for (const folder of workspaceFolders) {
            const yaraFilesInFolder = await this.findYaraFiles(folder.uri.fsPath);
            yaraFiles.push(...yaraFilesInFolder);
          }
        }
        return yaraFiles;
    }

    private async findYaraFiles(folderPath: string): Promise<YaraFile[]> {
        const yaraFiles: YaraFile[] = [];
        const files = await fs.promises.readdir(folderPath, { withFileTypes: true });

        for (const file of files) {
            const fullPath = path.join(folderPath, file.name);
            if (file.isDirectory()) {
                const subFolderFiles = await this.findYaraFiles(fullPath);
                yaraFiles.push(...subFolderFiles);
            } else if (file.isFile() && file.name.endsWith('.yara')) {
                yaraFiles.push(new YaraFile(file.name, fullPath, vscode.TreeItemCollapsibleState.Collapsed));
            }
        }

        return yaraFiles;
    }

    private async getYaraRules(yaraFile: YaraFile): Promise<YaraRule[]> {
        const rules: YaraRule[] = [];
        const fileContent = await fs.promises.readFile(yaraFile.filePath, 'utf-8');
    
        const ruleRegex = /rule\s+([^\s{]+)/g;
        let match;
        while ((match = ruleRegex.exec(fileContent)) !== null) {
          const ruleName = match[1];
          rules.push(new YaraRule(ruleName, yaraFile));
        }
    
        return rules;
      }
}

class YaraFile extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly filePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    ) {
        super(label, collapsibleState);
        this.command = {
            command: 'yaraCompiler.openYaraFile',
            title: 'Open YARA File',
            arguments: [filePath]
        };
        this.iconPath = path.join(__dirname, '..', '..', 'resources', 'yara-icon.svg');

        this.tooltip = filePath;
    }
}

class YaraRule extends vscode.TreeItem {
    constructor(
      public readonly label: string,
      public readonly parent: YaraFile
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Rule: ${label}`;
        this.iconPath = new vscode.ThemeIcon('symbol-method');

        this.command = {
            command: 'yaraCompiler.openRule',
            title: 'Open Rule',
            arguments: [parent.filePath, label] // Передаем путь к файлу и имя правила
          };
    }
}