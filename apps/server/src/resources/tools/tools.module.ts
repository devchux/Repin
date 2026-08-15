import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { ExtensionBrowserExecutor } from './executors/extension-browser.executor';
import { BROWSER_TOOL_EXECUTOR } from './types/browser-tool.types';
import { AuthModule } from '../auth/auth.module';
import { EXTENSION_BROWSER_TRANSPORT } from './executors/extension-browser-transport';
import { BrowserSessionController } from './transport/browser-session.controller';
import { BrowserSessionGateway } from './transport/browser-session.gateway';
import { BrowserSessionRegistry } from './transport/browser-session.registry';
import { WebSocketExtensionBrowserTransport } from './transport/websocket-extension-browser.transport';
import { BrowserToolApprovalController } from './policy/browser-tool-approval.controller';
import { BrowserToolApprovalService } from './policy/browser-tool-approval.service';
import { BrowserExecutorRouter } from './executors/browser-executor.router';
import { PlaywrightBrowserExecutor } from './executors/playwright-browser.executor';
import { PlaywrightBrowserSessionRegistry } from './executors/playwright-browser-session.registry';

@Module({
  imports: [AuthModule],
  controllers: [BrowserSessionController, BrowserToolApprovalController],
  providers: [
    BrowserSessionRegistry,
    BrowserToolApprovalService,
    BrowserSessionGateway,
    WebSocketExtensionBrowserTransport,
    {
      provide: EXTENSION_BROWSER_TRANSPORT,
      useExisting: WebSocketExtensionBrowserTransport,
    },
    ExtensionBrowserExecutor,
    PlaywrightBrowserSessionRegistry,
    PlaywrightBrowserExecutor,
    BrowserExecutorRouter,
    {
      provide: BROWSER_TOOL_EXECUTOR,
      useExisting: BrowserExecutorRouter,
    },
    ToolsService,
  ],
  exports: [ToolsService],
})
export class ToolsModule {}
