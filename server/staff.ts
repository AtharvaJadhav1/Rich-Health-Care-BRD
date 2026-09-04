import { FastifyReply, FastifyRequest } from "fastify";
import { requireAuth } from "./auth";

export function isAdminRole(role: string) {
  return role === "ADMIN";
}

export function isSupportRole(role: string) {
  return role === "SUPPORT";
}

export function isStaffRole(role: string) {
  return isAdminRole(role) || isSupportRole(role);
}

export async function requireStaff(request: FastifyRequest, reply: FastifyReply) {
  const member = await requireAuth(request, reply);
  if (!member) return null;
  if (!isStaffRole(member.role)) {
    reply.code(403).send({ error: "Staff access required." });
    return null;
  }
  return member;
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const member = await requireStaff(request, reply);
  if (!member) return null;
  if (!isAdminRole(member.role)) {
    reply.code(403).send({ error: "Admin access required." });
    return null;
  }
  return member;
}
