import { BrowserSessionRegistry } from './browser-session.registry';

describe('BrowserSessionRegistry', () => {
  const context = {
    userId: 1,
    runId: 'run-1',
    browserSessionId: 'session-1',
  };
  const command = {
    commandId: 'command-1',
    runId: 'run-1',
    name: 'browser_list_tabs' as const,
    input: {},
  };

  it('correlates extension results with pending commands', async () => {
    const registry = new BrowserSessionRegistry();
    const send = jest.fn();
    registry.register(1, 'session-1', { send });

    const result = registry.execute(context, command);
    registry.receive(1, 'session-1', {
      protocolVersion: 1,
      type: 'browser.command.result',
      payload: { commandId: 'command-1', result: ['tab-1'] },
    });

    await expect(result).resolves.toEqual(['tab-1']);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'browser.command' }),
    );
  });

  it('cancels pending commands when the run is aborted', async () => {
    const registry = new BrowserSessionRegistry();
    const send = jest.fn();
    registry.register(1, 'session-1', { send });
    const controller = new AbortController();

    const result = registry.execute(
      { ...context, signal: controller.signal },
      command,
    );
    controller.abort();

    await expect(result).rejects.toThrow('Browser command aborted');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'browser.command.cancel' }),
    );
  });

  it('rejects commands sent to disconnected sessions', () => {
    const registry = new BrowserSessionRegistry();
    expect(() => registry.execute(context, command)).toThrow(
      'Browser extension session is not connected',
    );
  });
});
