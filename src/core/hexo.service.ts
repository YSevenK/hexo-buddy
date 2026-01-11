import * as cp from 'child_process';
import * as vscode from 'vscode';

export class HexoService {
    private workspaceRoot: string | undefined;

    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    }

    // 执行 Hexo 命令的通用方法
    private exec(command: string): Promise<{ stdout: string; stderr: string }> {
        return new Promise((resolve, reject) => {
            if (!this.workspaceRoot) {
                return reject('未找到工作区');
            }
            cp.exec(command, { cwd: this.workspaceRoot }, (error, stdout, stderr) => {
                if (error) {
                    reject(stderr || error.message);
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });
    }

    async generate() {
        return this.exec('npx hexo generate');
    }

    async deploy() {
        return this.exec('npx hexo deploy');
    }

    async newPost(title: string) {
        return this.exec(`npx hexo new "${title}"`);
    }
}