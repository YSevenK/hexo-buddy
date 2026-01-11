import * as vscode from 'vscode';
import { HexoService } from './core/hexo.service';
import { HexoSidebarProvider } from './views/sidebar.provider';
import { PostService } from './core/post.service';
import { ThemeService } from './core/theme.service';
import { ConfigService } from './core/config.service';

export function activate(context: vscode.ExtensionContext) {
  const hexoService = new HexoService();
  const postService = new PostService();
  const themeService = new ThemeService();
  const configService = new ConfigService();

  const provider = new HexoSidebarProvider(context.extensionUri, hexoService, postService, themeService, configService);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("hexoBuddy.dashboard", provider)
  );
}
export function deactivate() { }