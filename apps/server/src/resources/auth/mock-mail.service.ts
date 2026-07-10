import { Injectable, Logger } from '@nestjs/common';
import { AuthCodePurpose } from 'src/shared/types';

@Injectable()
export class MockMailService {
  private readonly logger = new Logger(MockMailService.name);

  async sendAuthCode(email: string, code: string, purpose: AuthCodePurpose) {
    this.logger.log(`Mock ${purpose} code for ${email}: ${code}`);
  }
}
