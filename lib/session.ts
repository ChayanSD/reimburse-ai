import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { redis } from "./redis";

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: Date;
  updatedAt: Date;
}

const SESSION_TTL = 60 * 60 * 24 * 7;
const COOKIE_NAME = "session_id";


export async function createSession(user: SessionUser): Promise<string> {
  const sessionId = nanoid();

  const sessionData: SessionUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  await redis.setex(
    `session:${sessionId}`,
    SESSION_TTL,
    JSON.stringify(sessionData)
  );

  return sessionId;
}


export async function getSession(): Promise<SessionUser | null> {
  const cookieStore =await cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;

  if (!sessionId) {
    console.log("No session ID found in cookies");
    return null;
  }

  const sessionKey = `session:${sessionId}`;
  const sessionData = await redis.get(sessionKey);

  if (!sessionData) {
    console.log(`No session found in Redis for key: ${sessionKey}`);
    return null;
  }

  // Extend TTL on access
  await redis.expire(sessionKey, SESSION_TTL);

  let parsedSession: SessionUser;
  if (typeof sessionData === 'string') {
    parsedSession = JSON.parse(sessionData);
  } else {
    parsedSession = sessionData as SessionUser;
  }

  return {
    ...parsedSession,
    createdAt: new Date(parsedSession.createdAt),
    updatedAt: new Date(parsedSession.updatedAt),
  };
}


export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;

  if (sessionId) {
    await redis.del(`session:${sessionId}`);
  }
}

export async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
