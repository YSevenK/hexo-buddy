const vscode = acquireVsCodeApi();

document.getElementById('new')?.addEventListener('click', () => {
  vscode.postMessage({ type: 'NEW_POST' });
});

document.getElementById('preview')?.addEventListener('click', () => {
  vscode.postMessage({ type: 'PREVIEW' });
});

document.getElementById('deploy')?.addEventListener('click', () => {
  vscode.postMessage({ type: 'DEPLOY' });
});
