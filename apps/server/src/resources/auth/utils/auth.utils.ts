import { createHash } from 'crypto';
import { User } from '../../user/entities/user.entity';
import { AuthUser } from 'src/shared/types';

export const AUTH_CODE_TTL_MS = 10 * 60 * 1000;

export const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  isSuper: Boolean(user.isSuper),
});

export const createAuthCodeResponse = (
  message: string,
  user: User,
  code: string,
  includeMockCode: boolean,
) => ({
  message,
  data: {
    user,
    expiresIn: AUTH_CODE_TTL_MS,
    ...(includeMockCode ? { mockCode: code } : {}),
  },
});

export const createPkceChallenge = (codeVerifier: string) =>
  createHash('sha256').update(codeVerifier).digest('base64url');

export const isAllowedExtensionRedirectUri = (
  clientId: string,
  redirectUri: string,
  allowedClientIds: readonly string[],
) => {
  try {
    const url = new URL(redirectUri);
    return (
      (allowedClientIds.length === 0 || allowedClientIds.includes(clientId)) &&
      url.protocol === 'https:' &&
      url.hostname === `${clientId}.chromiumapp.org` &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
};
