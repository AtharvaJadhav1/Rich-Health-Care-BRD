import { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { prisma } from "./db";

export type AuthUser = {
  id: string;
  role: string;
  phone: string;
  memberCode: string;
};

export function issuePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "Rhc";
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${out}9`;
}

const JWT_SECRET = process.env.JWT_SECRET ?? "rich-health-care-dev-secret";

export function signToken(user: AuthUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function readToken(header?: string): AuthUser | null {
  if (!header?.startsWith("Bearer ")) return null;
  try {
    return jwt.verify(header.slice(7), JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = readToken(request.headers.authorization);
  if (!user) {
    reply.code(401).send({ error: "Sign in required." });
    return null;
  }
  const member = await prisma.member.findUnique({ where: { id: user.id } });
  if (!member) {
    reply.code(401).send({ error: "Account not found." });
    return null;
  }
  if (member.status === "BLOCKED") {
    reply.code(403).send({ error: "This account is blocked." });
    return null;
  }
  return member;
}

export async function requireRole(
  request: FastifyRequest,
  reply: FastifyReply,
  role: "ADMIN" | "MEMBER",
) {
  const member = await requireAuth(request, reply);
  if (!member) return null;
  if (member.role !== role) {
    reply.code(403).send({ error: "You do not have access to this action." });
    return null;
  }
  return member;
}
