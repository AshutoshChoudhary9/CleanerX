import jwt from 'jsonwebtoken';

type JwtPayload = {
  userId: string;
  email: string;
  name: string;
};

const JWT_SECRET = process.env.JWT_SECRET!;

export function signAuthToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAuthToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
