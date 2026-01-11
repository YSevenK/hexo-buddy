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

                return {
                    title: data.title || file.replace('.md', ''),
                    date: data.date ? new Date(data.date).toLocaleDateString() : 'Unknown',
                    filePath: filePath,
                    isDraft: data.draft || false
                };
            });

        return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // 打开文章进行编辑
    async openPost(filePath: string) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
    }
}