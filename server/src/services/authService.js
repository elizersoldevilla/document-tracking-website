import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

const TOKEN_ISSUER = 'clear-tracking-api';
const TOKEN_AUDIENCE = 'clear-tracking-web';

function publicUser(user) {
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export class AuthService {
  constructor({ userRepository, jwtSecret }) {
    this.userRepository = userRepository;
    this.jwtSecret = jwtSecret;
  }

  async login(email, password) {
    const user = await this.userRepository.findByEmail(email.trim().toLowerCase());
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordMatches) {
      throw new AppError('Invalid email or password.', {
        status: 401,
        code: 'INVALID_CREDENTIALS',
      });
    }

    const token = jwt.sign(
      { role: user.role },
      this.jwtSecret,
      {
        algorithm: 'HS256',
        subject: String(user.id),
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        expiresIn: '8h',
      },
    );

    return { token, user: publicUser(user) };
  }

  async authenticate(token) {
    let payload;
    try {
      payload = jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
      });
    } catch {
      throw new AppError('Your session is invalid or has expired.', {
        status: 401,
        code: 'INVALID_SESSION',
      });
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new AppError('Your account is no longer available.', {
        status: 401,
        code: 'ACCOUNT_UNAVAILABLE',
      });
    }

    return user;
  }
}
