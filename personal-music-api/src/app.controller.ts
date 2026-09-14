import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('diag')
  async getDiag(@Query('id') id: string = '2678642316') {
    const results: any = {};
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`https://music-api.gdstudio.xyz/api.php?types=url&id=${id}&source=netease`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const text = await res.text();
      results.gdstudio = { status: res.status, headers: Object.fromEntries(res.headers.entries()), text: text.slice(0, 300) };
    } catch (e: any) {
      results.gdstudio = { error: e.message, stack: e.stack };
    }

    try {
      const metingRes = await fetch(`https://api.injahow.cn/meting/?type=url&id=${id}`, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      results.meting = { status: metingRes.status, url: metingRes.url, length: metingRes.headers.get('content-length') };
    } catch (e: any) {
      results.meting = { error: e.message };
    }

    return results;
  }
}

