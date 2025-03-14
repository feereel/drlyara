import { spawn } from 'child_process';
import { findYaraFiles, YaraFile, YaraRule } from './yaraTree';
import * as vscode from 'vscode';

export async function compileYaraFile(yaraFile: YaraFile): Promise<string> {
    return new Promise((resolve, reject) => {
        const yrProcess = spawn('yr', ['compile', '-o', '/dev/null', "--define", "drlcore_direction=\"inbound\"", yaraFile.filePath]);

        let stderr = '';
        yrProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        yrProcess.on('close', (code) => {
            if (code !== 0) {
                reject(stderr);
            } else {
                resolve('Compilation successful');
            }
        });
    });
}

async function checkUniqueRuleNames(yaraFiles: YaraFile[]):  Promise<string[]> {
    let ruleNames: string[] = []
    let duplicate: string[]= []

    for (const file of yaraFiles) {
        const rules = await file.updateYaraRules();
        for (const rule of rules) {
            if (ruleNames.includes(rule.label)) {
                duplicate.push(rule.label);
            } else {
                ruleNames.push(rule.label);
            }
        }
    }
    return Promise.resolve(duplicate);
}

export async function compileAllYaraFiles(yaraFiles: YaraFile[]): Promise<string> {

    const duplicate = await checkUniqueRuleNames(yaraFiles);

    if (duplicate.length > 0) {
        return Promise.reject(`Files contains duplicate rule names: ${duplicate}`);
    }

    const compilePromises = yaraFiles.map(file =>
        compileYaraFile(file)
            .catch(error => Promise.reject(error))
    );

    return Promise.allSettled(compilePromises)
        .then(results => {
            const errors: string[] = [];
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    errors.push(`File: ${yaraFiles[index].filePath}\nError: ${result.reason}`);
                }
            });

            if (errors.length > 0) {
                return Promise.reject(`Compilation failed for ${errors.length} file(s):\n${errors.join('\n\n')}`);
            }

            return Promise.resolve('All YARA files compiled successfully');
        });
}