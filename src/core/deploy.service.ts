import { HexoService } from './hexo.service';
import { Logger } from '../utils/logger';

export class DeployService {
    constructor(private hexoService: HexoService) { }

    async runDeploy(onProgress: (msg: string) => void) {
        try {
            onProgress('正在生成静态文件...');
            await this.hexoService.generate();
            onProgress('正在推送至远程仓库...');
            await this.hexoService.deploy();
            onProgress('✅ 部署成功');
        } catch (err) {
            Logger.log(`[ERROR] ${err}`);
            onProgress(`❌ 部署失败: ${err}`);
        }
    }
}