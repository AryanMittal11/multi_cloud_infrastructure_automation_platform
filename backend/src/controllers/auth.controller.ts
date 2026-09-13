import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth';
import { env } from '../config/env';

const REFRESH_COOKIE_NAME = 'multicloud_refresh_token';

/**
 * Cookie options for secure HttpOnly token storage
 */
const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

/**
 * Extracts a cookie value from the raw Cookie header if cookie-parser is not loaded
 */
function getCookie(req: Request, name: string): string | undefined {
  if ((req as any).cookies && (req as any).cookies[name]) {
    return (req as any).cookies[name];
  }
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : undefined;
}

export const authController = {
  /**
   * POST /api/auth/register
   */
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password, role } = req.body;
      const result = await authService.register({ name, email, password, role });

      // Set HttpOnly refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOptions());

      res.status(201).json({
        message: 'User successfully registered',
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/login
   */
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      // Set HttpOnly refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOptions());

      res.status(200).json({
        message: 'Authentication successful',
        user: result.user,
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/refresh
   */
  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = getCookie(req, REFRESH_COOKIE_NAME) || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token not provided' });
      }

      const newTokens = await authService.rotateRefreshToken(refreshToken);

      // Set rotated HttpOnly refresh cookie
      res.cookie(REFRESH_COOKIE_NAME, newTokens.refreshToken, getCookieOptions());

      res.status(200).json({
        message: 'Tokens successfully refreshed',
        accessToken: newTokens.accessToken,
        expiresIn: newTokens.expiresIn,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/auth/logout
   */
  logout: async (_req: Request, res: Response) => {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
      path: '/',
    });

    res.status(200).json({ message: 'Successfully logged out' });
  },

  /**
   * GET /api/auth/me
   */
  me: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userContext = (req as any).user;
      if (!userContext?.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await authService.getUserById(userContext.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  },
};
