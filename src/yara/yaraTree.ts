import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class YaraRulesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null> = new vscode.EventEmitter<vscode.TreeItem | undefined | null>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null> = this._onDidChangeTreeData.event;

    private watcher: vscode.FileSystemWatcher;

    public yaraFiles: YaraFile[] = [];

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
                return element.updateYaraRules();
            }
            return Promise.resolve([]);
        } else {
            return this.getYaraFiles();
        }
    }

    private async getYaraFiles(): Promise<YaraFile[]> {
        this.yaraFiles = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (workspaceFolders) {
            for (const folder of workspaceFolders) {
                const yaraFilesInFolder = await findYaraFiles(folder.uri.fsPath);
                this.yaraFiles.push(...yaraFilesInFolder);
            }
        }
        return this.yaraFiles;
    }
}

export class YaraFile extends vscode.TreeItem {
    public rules: YaraRule[] = [];

    constructor(
        public readonly label: string,
        public readonly filePath: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    ) {
        super(label, collapsibleState);
        this.iconPath = vscode.ThemeIcon.File;
        this.contextValue = 'yaraFile';
        this.tooltip = filePath;

        this.command = {
            command: 'yaraCompiler.openYaraFile',
            title: 'Open YARA File',
            arguments: [filePath]
        };
    }

    public async updateYaraRules(): Promise<YaraRule[]> {
        const fileContent = await fs.promises.readFile(this.filePath, 'utf-8');
        const ruleRegex = /rule\s+([^\s{]+)/g;
        let match;

        this.rules = [];

        while ((match = ruleRegex.exec(fileContent)) !== null) {
            const ruleName = match[1];
            const rule = new YaraRule(ruleName, this);
            this.rules.push(rule);
        }

        return this.rules;
    }
}

export class YaraRule extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly parent: YaraFile
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.tooltip = `Rule: ${label}`;
        this.iconPath = new vscode.ThemeIcon('symbol-method');
        this.contextValue = 'yaraRule';

        this.command = {
            command: 'yaraCompiler.openRule',
            title: 'Open Rule',
            arguments: [parent.filePath, label]
        };

    }
}

export async function findYaraFiles(folderPath: string): Promise<YaraFile[]> {
    const yaraFiles: YaraFile[] = [];
    const files = await fs.promises.readdir(folderPath, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(folderPath, file.name);
        if (file.isDirectory()) {
            const subFolderFiles = await findYaraFiles(fullPath);
            yaraFiles.push(...subFolderFiles);
        } else if (file.isFile() && file.name.endsWith('.yara')) {
            yaraFiles.push(new YaraFile(file.name, fullPath, vscode.TreeItemCollapsibleState.Collapsed));
        }
    }

    return yaraFiles;
}