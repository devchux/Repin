import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Page } from 'playwright';
import { PlaywrightBrowserSessionRegistry } from './playwright-browser-session.registry';
import type {
  BrowserInteractionCommand,
  BrowserInteractionResult,
  BrowserNavigationCommand,
  BrowserNavigationResult,
  BrowserPageState,
  BrowserTab,
  BrowserToolExecutionContext,
  BrowserToolExecutor,
  TabTargetInput,
} from '../types/browser-tool.types';

@Injectable()
export class PlaywrightBrowserExecutor implements BrowserToolExecutor {
  private readonly revisions = new WeakMap<Page, string>();

  constructor(private readonly sessions: PlaywrightBrowserSessionRegistry) {}

  async navigate(
    context: BrowserToolExecutionContext,
    input: { url: string; tabId?: string },
  ) {
    const page = await this.page(context, input);
    await page.goto(input.url, { waitUntil: 'domcontentloaded' });
    return this.pageState(context, page);
  }

  async goBack(context: BrowserToolExecutionContext, input: TabTargetInput) {
    const page = await this.page(context, input);
    await page.goBack({ waitUntil: 'domcontentloaded' });
    return this.pageState(context, page);
  }

  async goForward(context: BrowserToolExecutionContext, input: TabTargetInput) {
    const page = await this.page(context, input);
    await page.goForward({ waitUntil: 'domcontentloaded' });
    return this.pageState(context, page);
  }

  async reloadPage(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    const page = await this.page(context, input);
    await page.reload({ waitUntil: 'domcontentloaded' });
    return this.pageState(context, page);
  }

  async getSnapshot(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { includeText?: boolean; maxElements?: number },
  ) {
    const page = await this.page(context, input);
    const maximum = input.maxElements ?? 500;
    const elements = await page
      .locator('a,button,input,select,textarea,[role],[contenteditable="true"]')
      .evaluateAll(
        (nodes, limit) =>
          nodes.slice(0, limit).map((node, index) => {
            const element = node as HTMLElement;
            const ref = `e${index + 1}`;
            element.dataset.repinAgentRef = ref;
            const control = element as HTMLInputElement;
            return {
              ref,
              role:
                element.getAttribute('role') ?? element.tagName.toLowerCase(),
              name:
                (element.getAttribute('aria-label') ??
                  element.innerText?.trim()) ||
                undefined,
              value: control.type === 'password' ? undefined : control.value,
              disabled: control.disabled,
              focused: document.activeElement === element,
            };
          }),
        maximum,
      );
    const viewport = page.viewportSize() ?? { width: 0, height: 0 };
    const position = await page.evaluate(() => ({ scrollX, scrollY }));
    return {
      tabId: await this.tabId(context, page),
      documentRevision: this.revision(page),
      url: page.url(),
      title: await page.title(),
      capturedAt: new Date().toISOString(),
      viewport: { ...viewport, ...position },
      elements,
      text: input.includeText
        ? (await page.locator('body').innerText()).slice(0, 100_000)
        : undefined,
      truncated: elements.length >= maximum,
    };
  }

  async getScreenshot(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & {
      fullPage?: boolean;
      format?: 'png' | 'jpeg';
      quality?: number;
    },
  ) {
    const page = await this.page(context, input);
    const type = input.format ?? 'png';
    const data = await page.screenshot({
      type,
      fullPage: input.fullPage,
      quality: type === 'jpeg' ? input.quality : undefined,
    });
    const viewport = page.viewportSize() ?? { width: 0, height: 0 };
    return {
      tabId: await this.tabId(context, page),
      url: page.url(),
      capturedAt: new Date().toISOString(),
      mimeType:
        type === 'jpeg' ? ('image/jpeg' as const) : ('image/png' as const),
      dataBase64: data.toString('base64'),
      width: viewport.width,
      height: viewport.height,
      fullPage: Boolean(input.fullPage),
    };
  }

  async getPageMetadata(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    const page = await this.page(context, input);
    const metadata = await page.evaluate(() => ({
      description:
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute('content') ?? undefined,
      canonicalUrl:
        document.querySelector('link[rel="canonical"]')?.getAttribute('href') ??
        undefined,
      language: document.documentElement.lang || undefined,
      contentType: document.contentType,
      readyState: document.readyState,
    }));
    return {
      tabId: await this.tabId(context, page),
      documentRevision: this.revision(page),
      url: page.url(),
      title: await page.title(),
      ...metadata,
      capturedAt: new Date().toISOString(),
    };
  }

  async getElement(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { ref: string; documentRevision: string },
  ) {
    const page = await this.page(context, input);
    this.assertRevision(page, input.documentRevision);
    const locator = page.locator(`[data-repin-agent-ref="${input.ref}"]`);
    const data = await locator.evaluate((node) => {
      const element = node as HTMLElement;
      const bounds = element.getBoundingClientRect();
      return {
        role: element.getAttribute('role') ?? element.tagName.toLowerCase(),
        name: element.getAttribute('aria-label') ?? element.innerText,
        text: element.innerText,
        visible: bounds.width > 0 && bounds.height > 0,
        editable:
          element.isContentEditable ||
          element instanceof HTMLInputElement ||
          element instanceof HTMLTextAreaElement,
        attributes: Object.fromEntries(
          [...element.attributes]
            .filter(({ name }) => !name.startsWith('on'))
            .map(({ name, value }) => [
              name,
              name === 'value' ? '[redacted]' : value,
            ]),
        ),
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      };
    });
    return {
      tabId: await this.tabId(context, page),
      documentRevision: this.revision(page),
      ref: input.ref,
      ...data,
      actions: [],
    };
  }

  async getSelectedText(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    const page = await this.page(context, input);
    const selection = await page.evaluate(() => ({
      text: getSelection()?.toString() ?? '',
      collapsed: getSelection()?.isCollapsed ?? true,
    }));
    return {
      tabId: await this.tabId(context, page),
      documentRevision: this.revision(page),
      ...selection,
    };
  }

  async getForms(
    context: BrowserToolExecutionContext,
    input: TabTargetInput & { maxForms?: number },
  ) {
    const page = await this.page(context, input);
    const forms = await page.locator('form').evaluateAll(
      (nodes, limit) =>
        nodes.slice(0, limit).map((node, formIndex) => {
          const form = node as HTMLFormElement;
          const ref = `form${formIndex + 1}`;
          form.dataset.repinAgentRef = ref;
          return {
            ref,
            name: form.name || undefined,
            action: form.action,
            method: form.method,
            fields: [...form.elements]
              .filter(
                (field) =>
                  field instanceof HTMLInputElement ||
                  field instanceof HTMLSelectElement ||
                  field instanceof HTMLTextAreaElement,
              )
              .map((field, index) => {
                const control = field as HTMLInputElement;
                const fieldRef = `form${formIndex + 1}field${index + 1}`;
                control.dataset.repinAgentRef = fieldRef;
                return {
                  ref: fieldRef,
                  name: control.name,
                  type: control.type,
                  value:
                    control.type === 'password' ? undefined : control.value,
                  redacted: control.type === 'password',
                  required: control.required,
                  disabled: control.disabled,
                  valid: control.validity.valid,
                  validationMessage: control.validationMessage || undefined,
                };
              }),
          };
        }),
      input.maxForms ?? 100,
    );
    return {
      tabId: await this.tabId(context, page),
      documentRevision: this.revision(page),
      forms,
      truncated: forms.length >= (input.maxForms ?? 100),
    };
  }

  async getNavigationState(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    const page = await this.page(context, input);
    const state = await page.evaluate(() => ({
      readyState: document.readyState,
      canGoBack: history.length > 1,
    }));
    return {
      tabId: await this.tabId(context, page),
      url: page.url(),
      loading: state.readyState === 'loading',
      canGoBack: state.canGoBack,
      canGoForward: false,
      readyState: state.readyState,
    };
  }

  async getFrames(context: BrowserToolExecutionContext, input: TabTargetInput) {
    const page = await this.page(context, input);
    return {
      tabId: await this.tabId(context, page),
      frames: page.frames().map((frame, index) => ({
        id: String(index),
        parentId: frame.parentFrame()
          ? String(page.frames().indexOf(frame.parentFrame()!))
          : undefined,
        url: frame.url(),
        origin: this.origin(frame.url()),
        name: frame.name() || undefined,
        accessible: true,
      })),
    };
  }
  async getConsoleMessages(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    return {
      tabId: await this.tabId(context, await this.page(context, input)),
      messages: [],
      truncated: false,
    };
  }
  async getNetworkActivity(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    return {
      tabId: await this.tabId(context, await this.page(context, input)),
      requests: [],
      pendingCount: 0,
      truncated: false,
    };
  }
  async getDownloads() {
    return { downloads: [], truncated: false };
  }
  async getDialog(context: BrowserToolExecutionContext, input: TabTargetInput) {
    return {
      tabId: await this.tabId(context, await this.page(context, input)),
      open: false,
    };
  }
  async getStorageSummary(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ) {
    const page = await this.page(context, input);
    const storage = await page.evaluate(() => ({
      localStorage: {
        keyCount: localStorage.length,
        keys: Object.keys(localStorage),
      },
      sessionStorage: {
        keyCount: sessionStorage.length,
        keys: Object.keys(sessionStorage),
      },
    }));
    return {
      tabId: await this.tabId(context, page),
      origin: this.origin(page.url()),
      cookies: { count: (await page.context().cookies(page.url())).length },
      ...storage,
      indexedDb: { databaseCount: 0, names: [] },
    };
  }

  async listTabs(context: BrowserToolExecutionContext) {
    const session = await this.sessions.get(context.browserSessionId);
    return Promise.all(
      [...session.pages.values()].map((page) =>
        this.normalizeTab(context, page),
      ),
    );
  }
  async openTab(
    context: BrowserToolExecutionContext,
    input: { url?: string; active?: boolean },
  ) {
    const session = await this.sessions.get(context.browserSessionId);
    const page = await session.context.newPage();
    if (input.url)
      await page.goto(input.url, { waitUntil: 'domcontentloaded' });
    return this.normalizeTab(context, page);
  }
  async activateTab(
    context: BrowserToolExecutionContext,
    input: { tabId: string },
  ) {
    const page = await this.page(context, input);
    await page.bringToFront();
    return this.normalizeTab(context, page);
  }
  async closeTab(
    context: BrowserToolExecutionContext,
    input: { tabId: string },
  ) {
    await (await this.page(context, input)).close();
    return { tabId: input.tabId, closed: true as const };
  }

  async navigateBrowser(
    context: BrowserToolExecutionContext,
    command: BrowserNavigationCommand,
  ): Promise<BrowserNavigationResult> {
    switch (command.name) {
      case 'browser_stop_loading': {
        const page = await this.page(context, command.input);
        await page.evaluate(() => stop());
        return { tabId: await this.tabId(context, page), stopped: true };
      }
      case 'browser_get_history':
        throw new Error(
          'Playwright does not expose browser session history entries',
        );
      case 'browser_go_to_history_entry':
        throw new Error(
          'Playwright does not expose navigation history entry IDs',
        );
      case 'browser_duplicate_tab': {
        const source = await this.page(context, command.input);
        return this.openTab(context, {
          url: source.url(),
          active: command.input.active,
        });
      }
      case 'browser_list_windows': {
        const tabs = await this.listTabs(context);
        return [
          {
            id: context.browserSessionId,
            focused: true,
            incognito: true,
            state: 'normal' as const,
            tabs,
          },
        ];
      }
      case 'browser_open_window': {
        const tab = await this.openTab(context, {
          url: command.input.urls?.[0],
        });
        return {
          id: context.browserSessionId,
          focused: true,
          incognito: true,
          state: command.input.state ?? 'normal',
          tabs: [tab],
        };
      }
      case 'browser_close_window':
        await this.sessions.close(context.browserSessionId);
        return { windowId: command.input.windowId, closed: true };
      case 'browser_move_tab':
      case 'browser_pin_tab':
      case 'browser_reopen_closed_tab':
        throw new Error(
          `${command.name} is not supported by managed Playwright contexts`,
        );
    }
  }

  async interact(
    context: BrowserToolExecutionContext,
    command: BrowserInteractionCommand,
  ): Promise<BrowserInteractionResult> {
    const page = await this.page(context, command.input);
    const input = command.input;
    const locator =
      'ref' in input && input.ref
        ? page.locator(`[data-repin-agent-ref="${input.ref}"]`)
        : undefined;
    if ('documentRevision' in input && input.documentRevision)
      this.assertRevision(page, input.documentRevision);
    switch (command.name) {
      case 'browser_click':
        await locator!.click();
        break;
      case 'browser_double_click':
        await locator!.dblclick();
        break;
      case 'browser_hover':
        await locator!.hover();
        break;
      case 'browser_focus':
        await locator!.focus();
        break;
      case 'browser_type':
        await locator!.pressSequentially(command.input.text);
        break;
      case 'browser_fill':
        await locator!.fill(command.input.text);
        break;
      case 'browser_clear':
        await locator!.clear();
        break;
      case 'browser_press_key':
        await (locator ?? page.locator('body')).press(command.input.key);
        break;
      case 'browser_select_option':
        await locator!.selectOption(
          command.input.values ??
            command.input.labels?.map((label) => ({ label })) ??
            command.input.indexes?.map((index) => ({ index })),
        );
        break;
      case 'browser_check':
        await locator!.check();
        break;
      case 'browser_uncheck':
        await locator!.uncheck();
        break;
      case 'browser_scroll':
        if (locator) await locator.scrollIntoViewIfNeeded();
        else
          await page.mouse.wheel(
            command.input.deltaX ?? 0,
            command.input.deltaY ?? 0,
          );
        break;
      case 'browser_drag_and_drop':
        await page
          .locator(`[data-repin-agent-ref="${command.input.sourceRef}"]`)
          .dragTo(
            page.locator(`[data-repin-agent-ref="${command.input.targetRef}"]`),
          );
        break;
      case 'browser_submit_form':
        await locator!.evaluate((form) =>
          (form as HTMLFormElement).requestSubmit(),
        );
        break;
      case 'browser_handle_dialog':
        throw new Error('Dialog handling requires an active dialog listener');
      case 'browser_set_permission':
        await page.context().grantPermissions([command.input.permission], {
          origin: this.origin(page.url()),
        });
        break;
      case 'browser_download':
        if (command.input.url) await page.goto(command.input.url);
        else await locator!.click();
        break;
      case 'browser_resize_viewport':
        await page.setViewportSize({
          width: command.input.width,
          height: command.input.height,
        });
        break;
      case 'browser_wait':
        await this.wait(page, command);
        break;
      case 'browser_key_down':
        await page.keyboard.down(command.input.key);
        break;
      case 'browser_key_up':
        await page.keyboard.up(command.input.key);
        break;
      case 'browser_insert_text':
        await page.keyboard.insertText(command.input.text);
        break;
      case 'browser_mouse_move':
        await page.mouse.move(command.input.x, command.input.y, {
          steps: command.input.steps,
        });
        break;
      case 'browser_mouse_down':
        await page.mouse.move(command.input.x, command.input.y);
        await page.mouse.down({
          button: command.input.button,
          clickCount: command.input.clickCount,
        });
        break;
      case 'browser_mouse_up':
        await page.mouse.move(command.input.x, command.input.y);
        await page.mouse.up({
          button: command.input.button,
          clickCount: command.input.clickCount,
        });
        break;
      case 'browser_mouse_wheel':
        if (command.input.x !== undefined && command.input.y !== undefined)
          await page.mouse.move(command.input.x, command.input.y);
        await page.mouse.wheel(
          command.input.deltaX ?? 0,
          command.input.deltaY ?? 0,
        );
        break;
      case 'browser_upload_files':
      case 'browser_copy':
      case 'browser_paste':
      case 'browser_switch_frame':
      case 'browser_execute_script':
        throw new Error(
          `${command.name} requires a managed artifact or script registry`,
        );
    }
    context.signal?.throwIfAborted();
    return {
      success: true,
      tabId: await this.tabId(context, page),
      documentRevision: this.revision(page),
    };
  }

  private async page(
    context: BrowserToolExecutionContext,
    input: TabTargetInput,
  ): Promise<Page> {
    context.signal?.throwIfAborted();
    const session = await this.sessions.get(context.browserSessionId);
    const page = input.tabId
      ? session.pages.get(input.tabId)
      : [...session.pages.values()].at(-1);
    if (!page)
      throw new Error(
        `Managed browser tab not found: ${input.tabId ?? 'active'}`,
      );
    return page;
  }
  private async tabId(context: BrowserToolExecutionContext, page: Page) {
    return this.sessions.pageId(
      await this.sessions.get(context.browserSessionId),
      page,
    );
  }
  private async normalizeTab(
    context: BrowserToolExecutionContext,
    page: Page,
  ): Promise<BrowserTab> {
    return {
      id: await this.tabId(context, page),
      windowId: context.browserSessionId,
      url: page.url(),
      title: await page.title(),
      active: true,
      pinned: false,
    };
  }
  private async pageState(
    context: BrowserToolExecutionContext,
    page: Page,
  ): Promise<BrowserPageState> {
    return { tab: await this.normalizeTab(context, page) };
  }
  private revision(page: Page): string {
    let revision = this.revisions.get(page);
    if (!revision) {
      revision = randomUUID();
      this.revisions.set(page, revision);
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) this.revisions.set(page, randomUUID());
      });
    }
    return revision;
  }
  private assertRevision(page: Page, revision: string) {
    if (this.revision(page) !== revision) throw new Error('Snapshot is stale');
  }
  private origin(url: string) {
    try {
      return new URL(url).origin;
    } catch {
      return '';
    }
  }
  private async wait(
    page: Page,
    command: Extract<BrowserInteractionCommand, { name: 'browser_wait' }>,
  ) {
    const { condition, timeoutMs = 30_000 } = command.input;
    if (condition === 'network_idle')
      await page.waitForLoadState('networkidle', { timeout: timeoutMs });
    else if (condition === 'navigation_completed')
      await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs });
    else if (condition === 'url_changed')
      await page.waitForURL((url) => url.toString() !== command.input.url, {
        timeout: timeoutMs,
      });
    else if (condition === 'text_present')
      await page
        .getByText(command.input.text!)
        .waitFor({ state: 'visible', timeout: timeoutMs });
    else {
      const locator = page.locator(
        `[data-repin-agent-ref="${command.input.ref}"]`,
      );
      await locator.waitFor({
        state: condition === 'element_visible' ? 'visible' : 'hidden',
        timeout: timeoutMs,
      });
    }
  }
}
