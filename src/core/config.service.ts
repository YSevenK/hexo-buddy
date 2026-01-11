import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

export class ConfigService {
    private get configPath() {
        return path.join(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '', '_config.yml');
    }

    getConfig() {
        if (!fs.existsSync(this.configPath)) return null;
        return yaml.load(fs.readFileSync(this.configPath, 'utf8')) as any;
    }

    async updateConfig(newConfig: any) {
        const current = this.getConfig();
        const merged = { ...current, ...newConfig };
        const yamlStr = yaml.dump(merged);
        fs.writeFileSync(this.configPath, yamlStr, 'utf8');
        vscode.window.showInformationMessage('配置已更新');
    }
}