import * as vscode from 'vscode';
import { HexoService } from '../core/hexo.service';
import { PostService } from '../core/post.service';
import { ThemeService } from '../core/theme.service';
import { ConfigService } from '../core/config.service';
import { Logger } from '../utils/logger';
import { DeployService } from '../core/deploy.service';
import { I18n, type Language } from '../utils/i18n';
import * as fs from 'fs';

export class HexoSidebarProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private currentTab = 'dashboard';
    private currentLang: Language = 'zh-CN';

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

        // 从配置加载语言设置
        const config = this.configService.getConfig();
        this.currentLang = (config?.pluginLanguage || 'zh-CN') as Language;
        I18n.setLanguage(this.currentLang);

        webviewView.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.type) {
                case 'switchTab':
                    this.currentTab = msg.tab || msg.data || msg.value || this.currentTab;
                    this.render();
                    break;
                case 'setLanguage':
                    const lang = msg.language as Language;
                    if (lang && (lang === 'zh-CN' || lang === 'en-US')) {
                        this.currentLang = lang;
                        I18n.setLanguage(lang);
                        await this.configService.updateConfig({ pluginLanguage: lang });
                        this.render();
                    }
                    break;
                case 'newPost':
                    const title = await vscode.window.showInputBox({ prompt: 'New post title' });
                    if (title) {
                        try {
                            await this.hexoService.newPost(title);
                            vscode.window.showInformationMessage(I18n.t('posts.createSuccess') + title);
                        } catch (err) {
                            vscode.window.showErrorMessage(I18n.t('posts.createFailed') + err);
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
                        vscode.window.showInformationMessage(I18n.t('config.saveSuccess'));
                    } catch (err) {
                        vscode.window.showErrorMessage(I18n.t('config.saveFailed'));
                    }
                    this.render();
                    break;
                case 'deletePost':
                    const confirm = await vscode.window.showWarningMessage(I18n.t('posts.deleteConfirm'), I18n.t('posts.confirm'), I18n.t('posts.cancel'));
                    if (confirm === I18n.t('posts.confirm')) {
                        try {
                            const p = msg.path;
                            if (!p) throw new Error('path empty');
                            const realPath = require('path').normalize(p);
                            fs.unlinkSync(realPath);
                            vscode.window.showInformationMessage(I18n.t('posts.deleteSuccess') + realPath);
                        } catch (err) {
                            vscode.window.showErrorMessage(I18n.t('posts.deleteFailed') + String(err));
                        }
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
        const deployService = new DeployService(this.hexoService);
        // 更新UI显示部署状态
        this._view.webview.postMessage({ type: 'deployStatus', status: 'Starting' });
        try {
            await deployService.runDeploy((msg: string) => {
                const entry = Logger.log(msg);
                if (this._view) {
                    this._view.webview.postMessage({ type: 'deployStatus', status: msg });
                    this._view.webview.postMessage({ type: 'logs', logs: Logger.getLogs() });
                }
            });
            // 完成后刷新
            this._view.webview.postMessage({ type: 'deployStatus', status: 'Completed' });
            this.render();
        } catch (error) {
            const em = String(error || 'Unknown error');
            Logger.log('[DEPLOY ERROR] ' + em);
            if (this._view) this._view.webview.postMessage({ type: 'deployStatus', status: 'Error: ' + em });
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
            // 发送初始 tab selection + language
            setTimeout(() => {
                this._view!.webview.postMessage({
                    type: 'setTab',
                    tab: this.currentTab,
                    html: inner,
                    language: this.currentLang
                });
            }, 50);
        } catch (err) {
            console.error('加载 dashboard 模板失败', err);
            this._view.webview.html = '<pre>' + I18n.t('msg.loadFailed') + '</pre>';
        }
    }

    private getLastDeployTime(): string {
        try {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!root) return 'Unknown';
            const pubPath = require('path').join(root, 'public');
            if (!require('fs').existsSync(pubPath)) return 'Never';
            const stat = require('fs').statSync(pubPath);
            return stat.mtime.toLocaleString();
        } catch (e) {
            return 'Error';
        }
    }

    private renderTabContent(posts: any[], config: any, currentTheme: string, themes: string[]) {
        const t = (key: string) => I18n.t(key);
        switch (this.currentTab) {
            case 'dashboard':
                const lastDeploy = this.getLastDeployTime();
                return `
                <div class="card">
                    <p>📝 ${t('dashboard.posts')}: <strong>${posts.length}</strong></p>
                    <p>🎨 ${t('dashboard.theme')}: <strong>${currentTheme}</strong></p>
                    <p>🚀 ${t('dashboard.lastDeploy')}: <strong>${lastDeploy}</strong></p>
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
                <button class="btn-primary" onclick="send('newPost')">${t('posts.newPost')}</button>
                <div class="list">${postItems}</div>
            `;

            case 'themes':
                const themeList = themes.map(t => `
                <div class="theme-item ${t === currentTheme ? 'active' : ''}">
                    <span>${t}</span>
                    ${t === currentTheme ? '<span>' + I18n.t('themes.current') + '</span>' : `<button onclick="send('switchTheme', '${t}')">${I18n.t('themes.apply')}</button>`}
                </div>
            `).join('');
                return `<h3>${t('themes.title')}</h3><div class="list">${themeList}</div>`;

            case 'config':
                return `
                <h3>${t('config.title')}</h3>
                <label>${t('config.siteTitle')}</label>
                <input id="cfg-title" value="${config?.title || ''}">
                <label>${t('config.author')}</label>
                <input id="cfg-author" value="${config?.author || ''}">
                <label>${t('config.url')}</label>
                <input id="cfg-url" value="${config?.url || ''}">
                <button class="btn-primary" onclick="save()">${t('config.save')}</button>
            `;

            case 'deploy':
                return `
                <h3>${t('deploy.title')}</h3>
                <div class="card">
                    <p>${t('deploy.target')}: <strong>GitHub Pages</strong></p>
                    <p>${t('deploy.status')}: <span id="deploy-status">${t('deploy.ready')}</span></p>
                </div>
                <button class="btn-primary" onclick="send('runDeploy')">${t('deploy.button')}</button>
                <div id="deploy-logs" class="log-container"></div>
            `;

            case 'logs':
                const logs = Logger.getLogs().map(l => `<div class="log-line">${l}</div>`).join('');
                return `<h3>${t('logs.title')}</h3><div class="log-container">${logs}</div>`;

            case 'settings':
                return `
                <h3>⚙️ Settings</h3>
                <label>${t('config.language')}</label>
                <div style="display:flex;gap:8px;margin:8px 0;">
                    <button onclick="send('setLanguage', 'zh-CN')" style="${this.currentLang === 'zh-CN' ? 'background: var(--vscode-button-background);' : ''}">中文</button>
                    <button onclick="send('setLanguage', 'en-US')" style="${this.currentLang === 'en-US' ? 'background: var(--vscode-button-background);' : ''}">English</button>
                </div>
            `;

            default:
                return `Unknown tab`;
        }
    }
}