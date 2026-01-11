export type Language = 'zh-CN' | 'en-US';

const translations = {
    'zh-CN': {
        // Navigation
        'nav.dashboard': '📊 仪表盘',
        'nav.posts': '📝 文章',
        'nav.themes': '🎨 主题',
        'nav.config': '⚙️ 配置',
        'nav.deploy': '🚀 部署',
        'nav.logs': '📜 日志',
        'nav.settings': '⚙️ 设置',

        // Dashboard
        'dashboard.posts': '文章数量',
        'dashboard.theme': '当前主题',
        'dashboard.lastDeploy': '上次部署',
        'dashboard.never': '从未',
        'dashboard.error': '错误',
        'dashboard.unknown': '未知',

        // Posts
        'posts.newPost': '➕ 新建文章',
        'posts.deleteConfirm': '确定删除这篇文章吗？',
        'posts.confirm': '确认',
        'posts.cancel': '取消',
        'posts.createSuccess': '已创建文章：',
        'posts.createFailed': '创建文章失败: ',
        'posts.deleteSuccess': '已删除：',
        'posts.deleteFailed': '删除失败：',

        // Themes
        'themes.title': '🎨 主题',
        'themes.current': '(当前)',
        'themes.apply': '应用',

        // Config
        'config.title': '⚙️ 配置',
        'config.siteTitle': '站点标题',
        'config.author': '作者',
        'config.url': '链接',
        'config.save': '保存配置',
        'config.saveSuccess': '配置已保存',
        'config.saveFailed': '保存配置失败',
        'config.language': '语言',

        // Deploy
        'deploy.title': '🚀 部署',
        'deploy.target': '目标',
        'deploy.status': '状态',
        'deploy.ready': '就绪',
        'deploy.button': '立即部署',
        'deploy.starting': '开始部署',
        'deploy.completed': '部署完成',
        'deploy.failed': '部署失败',

        // Logs
        'logs.title': '📜 日志',

        // Settings
        'settings.title': '🔧 设置',
        'settings.language': '语言',
        'settings.languageCN': '中文',
        'settings.languageEN': 'English',

        // Messages
        'msg.loadFailed': '加载界面失败，请查看扩展输出。',
    },
    'en-US': {
        // Navigation
        'nav.dashboard': '📊 Dashboard',
        'nav.posts': '📝 Posts',
        'nav.themes': '🎨 Themes',
        'nav.config': '⚙️ Config',
        'nav.deploy': '🚀 Deploy',
        'nav.logs': '📜 Logs',
        'nav.settings': '⚙️ Settings',

        // Dashboard
        'dashboard.posts': 'Posts Count',
        'dashboard.theme': 'Current Theme',
        'dashboard.lastDeploy': 'Last Deploy',
        'dashboard.never': 'Never',
        'dashboard.error': 'Error',
        'dashboard.unknown': 'Unknown',

        // Posts
        'posts.newPost': '➕ New Post',
        'posts.deleteConfirm': 'Delete this post?',
        'posts.confirm': 'Confirm',
        'posts.cancel': 'Cancel',
        'posts.createSuccess': 'Post created: ',
        'posts.createFailed': 'Failed to create post: ',
        'posts.deleteSuccess': 'Deleted: ',
        'posts.deleteFailed': 'Delete failed: ',

        // Themes
        'themes.title': '🎨 Themes',
        'themes.current': '(Current)',
        'themes.apply': 'Apply',

        // Config
        'config.title': '⚙️ Config',
        'config.siteTitle': 'Site Title',
        'config.author': 'Author',
        'config.url': 'URL',
        'config.save': 'Save Config',
        'config.saveSuccess': 'Config saved',
        'config.saveFailed': 'Failed to save config',
        'config.language': 'Language',

        // Deploy
        'deploy.title': '🚀 Deploy',
        'deploy.target': 'Target',
        'deploy.status': 'Status',
        'deploy.ready': 'Ready',
        'deploy.button': 'Deploy Now',
        'deploy.starting': 'Starting',
        'deploy.completed': 'Completed',
        'deploy.failed': 'Deploy failed',

        // Logs
        'logs.title': '📜 Logs',

        // Settings
        'settings.title': '🔧 Settings',
        'settings.language': 'Language',
        'settings.languageCN': '中文',
        'settings.languageEN': 'English',

        // Messages
        'msg.loadFailed': 'Failed to load UI, check extension output.',
    }
};

export class I18n {
    private static currentLang: Language = 'zh-CN';

    static setLanguage(lang: Language) {
        this.currentLang = lang;
    }

    static getLanguage(): Language {
        return this.currentLang;
    }

    static t(key: string): string {
        const trans = translations[this.currentLang] as any;
        return trans?.[key] || key;
    }
}
