import bcrypt from 'bcryptjs';
import { LIMITS, utf8ByteLength, type LoginInput, type RegisterData } from '@stride/shared';
import { config } from '../../config';
import { prisma } from '../../db';
import { Prisma } from '../../generated/prisma/client';
import { AppError, notFound } from '../../lib/errors';
import { toUser } from '../../lib/serializers';
import { signSessionToken } from './tokens';

type User = ReturnType<typeof toUser>;

export interface SessionResult {
  user: User;
  token: string;
  expiresAt: Date;
}

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');

const emailTaken = () =>
  new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.', {
    email: 'An account with this email already exists.',
  });

// Compared against when the email is unknown, so both failure paths cost one bcrypt check and
// response timing does not reveal which emails have accounts.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () =>
  (dummyHash ??= bcrypt.hash('stride-timing-equaliser', config.BCRYPT_ROUNDS));

async function createSession(user: Parameters<typeof toUser>[0]): Promise<SessionResult> {
  const expiresAt = new Date(Date.now() + config.sessionTtlMs);
  const session = await prisma.authSession.create({
    data: { userId: user.id, expiresAt },
    select: { id: true },
  });
  return { user: toUser(user), token: signSessionToken(user.id, session.id, expiresAt), expiresAt };
}

export async function register(input: RegisterData): Promise<SessionResult> {
  const passwordHash = await bcrypt.hash(input.password, config.BCRYPT_ROUNDS);
  try {
    const user = await prisma.user.create({
      data: { fullName: input.fullName, email: input.email, passwordHash },
    });
    return await createSession(user);
  } catch (error) {
    // The unique index on the normalised email is the source of truth (no check-then-insert race).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw emailTaken();
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<SessionResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // bcrypt only reads 72 bytes; refuse longer passwords rather than matching on a prefix.
  const tooLong = utf8ByteLength(input.password) > LIMITS.passwordMaxBytes;
  const matches = await bcrypt.compare(
    input.password,
    user?.passwordHash ?? (await getDummyHash()),
  );
  if (!user || !matches || tooLong) throw invalidCredentials();
  return createSession(user);
}

/** Revokes one login session. Other sessions (e.g. the same user's phone) stay signed in. */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCurrentUser(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, email: true, createdAt: true },
  });
  if (!user) throw notFound('Account');
  return toUser(user);
}
