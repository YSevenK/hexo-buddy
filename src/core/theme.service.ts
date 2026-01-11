import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

export class ThemeService {
    private get rootPath(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    }

    // 获取当前使用的主题名称
    getCurrentTheme(): string {
        const configPath = path.join(this.rootPath || '', '_config.yml');
        if (!fs.existsSync(configPath)) return 'unknown';

        const config: any = yaml.load(fs.readFileSync(configPath, 'utf8'));
        return config.theme || 'landscape';
    }

    // 获取已安装的主题列表
    getInstalledThemes(): string[] {
        const themesPath = path.join(this.rootPath || '', 'themes');
        if (!fs.existsSync(themesPath)) return [];
        return fs.readdirSync(themesPath).filter(f =>
            fs.statSync(path.join(themesPath, f)).isDirectory()
        );
    }
}