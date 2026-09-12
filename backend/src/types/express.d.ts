import { TokenPayload } from '../services/auth';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
