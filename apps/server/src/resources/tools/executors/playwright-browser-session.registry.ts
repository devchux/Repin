import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type Page,
} from 'playwright';
import { randomUUID } from 'node:crypto';

interface ManagedSession {
  readonly context: BrowserContext;
  readonly pages: Map<string, Page>;
  readonly pageIds: WeakMap<Page, string>;
  idleTimer?: ReturnType<typeof setTimeout>;
}

@Injectable()
export class PlaywrightBrowserSessionRegistry implements OnModuleDestroy {
  private browser?: Browser;
  private readonly sessions = new Map<string, ManagedSession>();

  async get(sessionId: string): Promise<ManagedSession> {
    let session = this.sessions.get(sessionId);
    if (!session) {
      const browser = await this.getBrowser();
      const context = await browser.newContext({ acceptDownloads: true });
      session = { context, pages: new Map(), pageIds: new WeakMap() };
      this.sessions.set(sessionId, session);
      this.trackPage(session, await context.newPage());
      context.on('page', (page) => this.trackPage(session!, page));
    }
    this.refreshIdleTimeout(sessionId, session);
    return session;
  }

  pageId(session: ManagedSession, page: Page): string {
    let id = session.pageIds.get(page);
    if (!id) id = this.trackPage(session, page);
    return id;
  }

  async close(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    this.sessions.delete(sessionId);
    if (session.idleTimer) clearTimeout(session.idleTimer);
    await session.context.close();
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.sessions.keys()].map((id) => this.close(id)));
    await this.browser?.close();
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
      this.browser.on('disconnected', () => {
        this.browser = undefined;
        this.sessions.clear();
      });
    }
    return this.browser;
  }

  private trackPage(session: ManagedSession, page: Page): string {
    const id = randomUUID();
    session.pages.set(id, page);
    session.pageIds.set(page, id);
    page.on('close', () => session.pages.delete(id));
    return id;
  }

  private refreshIdleTimeout(sessionId: string, session: ManagedSession): void {
    if (session.idleTimer) clearTimeout(session.idleTimer);
    session.idleTimer = setTimeout(
      () => void this.close(sessionId),
      15 * 60_000,
    );
    session.idleTimer.unref?.();
  }
}

export type PlaywrightManagedSession = Awaited<
  ReturnType<PlaywrightBrowserSessionRegistry['get']>
>;
