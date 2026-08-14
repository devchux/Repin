import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { ExtensionBrowserExecutor } from './executors/extension-browser.executor';
import { BROWSER_TOOL_EXECUTOR } from './types/browser-tool.types';

@Module({
  providers: [
    ExtensionBrowserExecutor,
    {
      provide: BROWSER_TOOL_EXECUTOR,
      useExisting: ExtensionBrowserExecutor,
    },
    ToolsService,
  ],
  exports: [ToolsService],
})
export class ToolsModule {}
