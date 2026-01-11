import * as vscode from 'vscode';
import { HexoService } from '../core/hexo.service';
import { PostService } from '../core/post.service';
import { ThemeService } from '../core/theme.service';
import { ConfigService } from '../core/config.service';
import { Logger } from '../utils/logger';
import * as fs from 'fs';

export class HexoSidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private currentTab = 'dashboard';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly hexoService: HexoService,
        private readonly postService: PostService,
        private readonly themeService: ThemeService,
        private readonly configService: ConfigService
    ) { }

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };

        webviewView.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.type) {
                case 'switchTab':
                    this.currentTab = msg.tab || msg.data || msg.value || this.currentTab;
                    this.render();
                    break;
                case 'newPost':
                    // 简单创建新文章：弹出输入框获取标题并新建文件（如果需要更复杂逻辑请在 PostService 中实现）
                    const title = await vscode.window.showInputBox({ prompt: 'New post title' });
                    if (title) {
                        // 使用 workspace 根目录生成简单文件
                        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                        if (root) {
                            const fileName = title.replace(/[^a-z0-9\-]/gi, '-').toLowerCase() + '.md';
                            const folder = require('path').join(root, 'source', '_posts');
                            try {
                                if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
                                const filePath = require('path').join(folder, fileName);
                                fs.writeFileSync(filePath, `---\ntitle: ${title}\ndate: ${new Date().toISOString()}\n---\n\n`);
                                await this.postService.openPost(filePath);
                            } catch (err) {
                                vscode.window.showErrorMessage('创建文章失败');
                            }
                        } else {
                            vscode.window.showErrorMessage('未找到 workspace 根目录');
                        }
                    }
                    this.render();
                    break;
                case 'openPost':
                    if (msg.path) await this.postService.openPost(msg.path);
                    break;
                case 'saveConfig':
                    try {
                        await this.configService.updateConfig(msg.data || msg.value || {});
                        vscode.window.showInformationMessage('配置已保存');
                    } catch (err) {
                        vscode.window.showErrorMessage('保存配置失败');
                    }
                    this.render();
                    break;
                case 'deletePost':
                    const confirm = await vscode.window.showWarningMessage('确定删除这篇文章吗？', '确认', '取消');
                    if (confirm === '确认') {
                        fs.unlinkSync(msg.path); // 使用 fs.ts 封装
                        this.render();
                    }
                    break;
                case 'switchTheme':
                    await this.configService.updateConfig({ theme: msg.theme });
                    this.render();
                    break;
                case 'runDeploy':
                    // 部署逻辑：调用 DeployService 并通过 postMessage 实时更新 UI 进度
                    this.executeDeployment();
                    break;
                // ... 其他 case
            }
        });

        this.render();
    }

    private async executeDeployment(): Promise<void> {
        if (!this._view) return;

        // 更新UI显示部署状态
        this._view.webview.postMessage({ type: 'deployStatus', status: 'In Progress' });

        try {
            // TODO: 实际的部署逻辑应该在这里实现
            // 比如调用DeployService.deploy()
            console.log('执行部署操作...');

            // 模拟部署过程
            setTimeout(() => {
                this._view!.webview.postMessage({ type: 'deployStatus', status: 'Completed' });
                this.render(); // 重新渲染视图更新状态
            }, 1000);
        } catch (error) {
            this._view.webview.postMessage({ type: 'deployStatus', status: 'Error' });
            console.error('部署失败:', error);
        }
    }

    async render() {
        if (!this._view) return;
        const posts = await this.postService.getPostList();
        const config = this.configService.getConfig();
        const currentTheme = this.themeService.getCurrentTheme();
        const themes = await this.themeService.getInstalledThemes(); // 获取主题列表
        // 从独立 HTML 模板加载并注入动态部分（主要是 tab 内容）
        try {
            const path = require('path');
            const candidates = [
                path.join(__dirname, 'dashboard.html'),
                path.join(this._extensionUri.fsPath, 'out', 'views', 'dashboard.html'),
                path.join(this._extensionUri.fsPath, 'views', 'dashboard.html'),
                path.join(this._extensionUri.fsPath, 'src', 'views', 'dashboard.html'),
                path.join(this._extensionUri.fsPath, 'dist', 'views', 'dashboard.html')
            ];
            let tpl = '';
            const found = candidates.find(p => fs.existsSync(p));
            if (found) {
                tpl = fs.readFileSync(found, 'utf8');
            } else {
                throw new Error('dashboard.html not found. Tried: ' + candidates.join(';'));
            }
            const inner = this.renderTabContent(posts, config, currentTheme, themes);
            tpl = tpl.replace('<!--TAB_CONTENT-->', inner);
            // 通过 postMessage 告知 webview 当前 tab，以便设置选中状态（安全）
            this._view.webview.html = tpl;
            // 发送初始 tab selection + html（兼容更新）
            setTimeout(() => {
                this._view!.webview.postMessage({ type: 'setTab', tab: this.currentTab, html: inner });
            }, 50);
        } catch (err) {
            console.error('加载 dashboard 模板失败', err);
            this._view.webview.html = '<pre>加载界面失败，请查看扩展输出。</pre>';
        }
    }

    private renderTabContent(posts: any[], config: any, currentTheme: string, themes: string[]) {
        switch (this.currentTab) {
            case 'dashboard':
                return `
                <div class="card">
                    <p>📝 文章数量: <strong>${posts.length}</strong></p>
                    <p>🎨 当前主题: <strong>${currentTheme}</strong></p>
                    <p>🚀 上次部署: 2025-01-02 21:30</p>
                </div>
                <div class="btn-group">
                    <button onclick="send('newPost')">➕ New Post</button>
                    <button onclick="tab('deploy')">🚀 Deploy</button>
                </div>
            `;

            case 'posts':
                const postItems = posts.map(p => `
                <div class="post-item">
                    <div onclick="send('openPost', '${p.filePath.replace(/\\/g, '/')}')">
                        <div class="post-title">${p.isDraft ? '📝' : '📄'} ${p.title}</div>
                        <div class="post-date">${p.date}</div>
                    </div>
                    <span class="delete-icon" onclick="send('deletePost', '${p.filePath.replace(/\\/g, '/')}')">🗑️</span>
                </div>
            `).join('');
                return `
                <button class="btn-primary" onclick="send('newPost')">➕ New Post</button>
                <div class="list">${postItems}</div>
            `;

            case 'themes':
                const themeList = themes.map(t => `
                <div class="theme-item ${t === currentTheme ? 'active' : ''}">
                    <span>${t}</span>
                    ${t === currentTheme ? '<span>(Current)</span>' : `<button onclick="send('switchTheme', '${t}')">Apply</button>`}
                </div>
            `).join('');
                return `<h3>🎨 Themes</h3><div class="list">${themeList}</div>`;

            case 'config':
                return `
                <h3>⚙️ Config</h3>
                <label>Site Title</label>
                <input id="cfg-title" value="${config?.title || ''}">
                <label>Author</label>
                <input id="cfg-author" value="${config?.author || ''}">
                <label>URL</label>
                <input id="cfg-url" value="${config?.url || ''}">
                <button class="btn-primary" onclick="save()">Save Config</button>
            `;

            case 'deploy':
                return `
                <h3>🚀 Deploy</h3>
                <div class="card">
                    <p>Target: <strong>GitHub Pages</strong></p>
                    <p>Status: <span id="deploy-status">Ready</span></p>
                </div>
                <button class="btn-primary" onclick="send('runDeploy')">Deploy Now</button>
                <div id="deploy-logs" class="log-container"></div>
            `;

            case 'logs':
                const logs = Logger.getLogs().map(l => `<div class="log-line">${l}</div>`).join('');
                return `<h3>📜 Logs</h3><div class="log-container">${logs}</div>`;

            default:
                return `未知状态`;
        }
    }
}