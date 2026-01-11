import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import matter from 'gray-matter';

export interface PostInfo {
    title: string;
    date: string;
    filePath: string;
    isDraft: boolean;
}

export class PostService {
    private get postsPath(): string | undefined {
        const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        return root ? path.join(root, 'source', '_posts') : undefined;
    }

    // 获取所有文章列表
    async getPostList(): Promise<PostInfo[]> {
        const folderPath = this.postsPath;
        if (!folderPath || !fs.existsSync(folderPath)) return [];

        const files = fs.readdirSync(folderPath);
        const posts = files
            .filter(file => file.endsWith('.md'))
            .map(file => {
                const filePath = path.join(folderPath, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const { data } = matter(content); // 解析 YAML 头

                // 计算日期优先级：front-matter date -> filename YYYY-MM-DD -> file mtime -> 0
                let dateMs = 0;
                let dateStr = 'Unknown';
                if (data && data.date) {
                    const d = new Date(data.date);
                    if (!isNaN(d.getTime())) {
                        dateMs = d.getTime();
                        dateStr = d.toLocaleDateString();
                    }
                }
                if (!dateMs) {
                    // 尝试从文件名提取日期 (Hexo 常见格式：YYYY-MM-DD-title.md)
                    const m = file.match(/^(\\d{4}-\\d{2}-\\d{2})/);
                    if (m) {
                        const d = new Date(m[1]);
                        if (!isNaN(d.getTime())) {
                            dateMs = d.getTime();
                            dateStr = d.toLocaleDateString();
                        }
                    }
                }
                if (!dateMs) {
                    try {
                        const stat = fs.statSync(filePath);
                        dateMs = stat.mtime.getTime();
                        dateStr = stat.mtime.toLocaleDateString();
                    } catch (e) {
                        // keep Unknown
                    }
                }

                return {
                    title: (data && data.title) ? data.title : file.replace('.md', ''),
                    date: dateStr,
                    filePath: filePath,
                    isDraft: !!(data && data.draft),
                    // internal for sorting
                    _dateMs: dateMs
                } as any;
            });

        return posts
            .sort((a: any, b: any) => (b._dateMs || 0) - (a._dateMs || 0))
            .map((p: any) => ({ title: p.title, date: p.date, filePath: p.filePath, isDraft: p.isDraft }));
    }

    // 打开文章进行编辑
    async openPost(filePath: string) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
    }
}