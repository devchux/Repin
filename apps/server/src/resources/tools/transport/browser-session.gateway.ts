import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { BrowserSessionClientMessage } from '@repo/contracts/browser-session';
import type { Server } from 'node:http';
import { WebSocketServer, type RawData } from 'ws';
import type { Configuration } from 'src/shared/types';
import { BrowserSessionRegistry } from './browser-session.registry';

interface BrowserTicket {
  readonly sub: number;
  readonly browserSessionId: string;
}

@Injectable()
export class BrowserSessionGateway {
  private readonly logger = new Logger(BrowserSessionGateway.name);
  private attached = false;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Configuration>,
    private readonly sessions: BrowserSessionRegistry,
  ) {}

  attach(server: Server): void {
    if (this.attached) return;
    this.attached = true;
    const websocketServer = new WebSocketServer({
      noServer: true,
      maxPayload: 2_000_000,
    });

    server.on('upgrade', async (request, socket, head) => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (url.pathname !== '/api/browser-sessions/connect') return;

      try {
        const ticket = url.searchParams.get('ticket');
        if (!ticket) throw new Error('Connection ticket is required');
        const payload = await this.jwtService.verifyAsync<BrowserTicket>(
          ticket,
          {
            secret: this.config.get('auth.accessTokenSecret', { infer: true }),
            audience: 'repin-browser-extension',
            issuer: 'repin-server',
          },
        );
        websocketServer.handleUpgrade(request, socket, head, (websocket) => {
          const unregister = this.sessions.register(
            payload.sub,
            payload.browserSessionId,
            { send: (message) => websocket.send(JSON.stringify(message)) },
          );
          websocket.on('message', (data) =>
            this.receive(payload.sub, payload.browserSessionId, data),
          );
          websocket.on('close', unregister);
          websocket.on('error', unregister);
        });
      } catch (error) {
        this.logger.warn(
          `Rejected browser WebSocket: ${error instanceof Error ? error.message : 'invalid ticket'}`,
        );
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
      }
    });
  }

  private receive(userId: number, sessionId: string, data: RawData): void {
    try {
      const message = JSON.parse(
        data.toString(),
      ) as BrowserSessionClientMessage;
      if (message.protocolVersion !== 1) return;
      this.sessions.receive(userId, sessionId, message);
    } catch {
      this.logger.warn('Ignored invalid browser-session message');
    }
  }
}
