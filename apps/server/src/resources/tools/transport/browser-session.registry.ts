import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { BrowserSessionClientMessage } from '@repo/contracts/browser-session';
import type { BrowserToolExecutionContext } from '../types/browser-tool.types';
import type { ExtensionBrowserCommand } from '../executors/extension-browser-transport';

interface Connection {
  readonly send: (message: unknown) => void;
}

interface PendingCommand {
  readonly sessionKey: string;
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
  readonly cleanup: () => void;
}

@Injectable()
export class BrowserSessionRegistry {
  private readonly connections = new Map<string, Connection>();
  private readonly pending = new Map<string, PendingCommand>();

  register(
    userId: number,
    sessionId: string,
    connection: Connection,
  ): () => void {
    const key = this.sessionKey(userId, sessionId);
    this.disconnect(userId, sessionId, new Error('Browser session replaced'));
    this.connections.set(key, connection);
    return () => {
      if (this.connections.get(key) === connection) {
        this.disconnect(
          userId,
          sessionId,
          new Error('Browser session disconnected'),
        );
      }
    };
  }

  execute<TResult>(
    context: BrowserToolExecutionContext,
    command: ExtensionBrowserCommand,
    timeoutMs = 30_000,
  ): Promise<TResult> {
    const sessionKey = this.sessionKey(
      context.userId,
      context.browserSessionId,
    );
    const connection = this.connections.get(sessionKey);
    if (!connection) {
      throw new ServiceUnavailableException(
        'Browser extension session is not connected',
      );
    }

    return new Promise<TResult>((resolve, reject) => {
      const abort = () => {
        connection.send(this.cancelMessage(command.commandId));
        this.rejectPending(
          command.commandId,
          new Error('Browser command aborted'),
        );
      };
      const timer = setTimeout(() => {
        connection.send(this.cancelMessage(command.commandId));
        this.rejectPending(
          command.commandId,
          new Error('Browser command timed out'),
        );
      }, timeoutMs);
      const cleanup = () => context.signal?.removeEventListener('abort', abort);
      this.pending.set(command.commandId, {
        sessionKey,
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
        cleanup,
      });
      context.signal?.addEventListener('abort', abort, { once: true });
      connection.send({
        protocolVersion: 1,
        type: 'browser.command',
        payload: command,
      });
    });
  }

  receive(
    userId: number,
    sessionId: string,
    message: BrowserSessionClientMessage,
  ): void {
    const commandId =
      message.type === 'browser.command.result' ||
      message.type === 'browser.command.error'
        ? message.payload.commandId
        : undefined;
    if (
      commandId &&
      this.pending.get(commandId)?.sessionKey !==
        this.sessionKey(userId, sessionId)
    ) {
      return;
    }
    if (message.type === 'browser.command.result') {
      this.resolvePending(message.payload.commandId, message.payload.result);
    } else if (message.type === 'browser.command.error') {
      this.rejectPending(
        message.payload.commandId,
        new Error(`${message.payload.code}: ${message.payload.message}`),
      );
    }
  }

  private resolvePending(commandId: string, result: unknown): void {
    const pending = this.takePending(commandId);
    pending?.resolve(result);
  }

  private rejectPending(commandId: string, error: Error): void {
    const pending = this.takePending(commandId);
    pending?.reject(error);
  }

  private takePending(commandId: string): PendingCommand | undefined {
    const pending = this.pending.get(commandId);
    if (!pending) return undefined;
    this.pending.delete(commandId);
    clearTimeout(pending.timer);
    pending.cleanup();
    return pending;
  }

  private disconnect(userId: number, sessionId: string, error: Error): void {
    const sessionKey = this.sessionKey(userId, sessionId);
    this.connections.delete(sessionKey);
    for (const [commandId, command] of this.pending) {
      if (command.sessionKey === sessionKey) {
        this.rejectPending(commandId, error);
      }
    }
  }

  private cancelMessage(commandId: string) {
    return {
      protocolVersion: 1 as const,
      type: 'browser.command.cancel' as const,
      payload: { commandId },
    };
  }

  private sessionKey(userId: number, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }
}
