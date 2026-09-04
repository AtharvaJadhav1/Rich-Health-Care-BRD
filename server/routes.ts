import bcrypt from "bcrypt";
import { z } from "zod";
import { FastifyInstance } from "fastify";
import { prisma } from "./db";
import { requireAuth, signToken } from "./auth";
import { requireAdmin, requireStaff } from "./staff";
import { isActiveMemberStatus } from "./member-status";
import { utcDateKey } from "./dates";
import { computeMatching } from "./matching";
import { activateMember, fetchMemberTreeView, getOrCreateVolume, nextMemberCode, reserveTreeSlot } from "./tree";
import { creditWallet } from "./wallet";
import { isValidPan, normalizePan } from "./credentials";
import {
  approvePinActivation,
  consumePinForJoining,
  generateAdminPins,
  issuePin,
  publicPin,
  rejectPinActivation,
  requestPinActivation,
  adminActivateMemberWithPin,
  transferPinToMember,
} from "./pins";
import { bootstrapCompany, ensurePlanAndCatalog, publicStatus } from "./bootstrap";
import {
  approveWeeklyPayout,
  generateWeeklyReports,
  memberTeamSummary,
} from "./weekly";

const registerSchema = z
  .object({
    name: z.string().min(2),
    phone: z.string().regex(/^[0-9]{10}$/, "Enter a 10-digit mobile number."),
    panNumber: z.string().min(10),
    password: z.string().min(8, "Password must be at least 8 characters."),
    sponsorCode: z.string().min(3),
    placementCode: z.string().min(3),
    position: z.enum(["LEFT", "RIGHT"]),
    dateOfBirth: z.string().min(1),
    at: z.string().min(2),
    city: z.string().min(2),
    state: z.string().min(2),
    agreeTerms: z.literal(true, { message: "You must agree to the terms and privacy policy." }),
  })
  .refine(
    (data) => {
      const dob = new Date(data.dateOfBirth);
      return !Number.isNaN(dob.getTime()) && dob < new Date();
    },
    { message: "Enter a valid date of birth.", path: ["dateOfBirth"] },
  );

const loginSchema = z.object({
  memberCode: z.string().min(3).optional(),
  phone: z.string().min(3).optional(),
  password: z.string().min(1),
});

function publicMember(
  member: {
    id: string;
    name: string;
    phone: string;
    memberCode: string;
    role: string;
    rank: string | null;
    status: string;
    kycStatus: string;
    panNumber: string;
    photoUrl: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    sponsorId: string | null;
    parentId: string | null;
    position: string | null;
    activatedAt: Date | null;
    createdAt: Date;
    accountName?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    ifsc?: string | null;
    upiId?: string | null;
  },
  opts: { includePan?: boolean } = {},
) {
  return {
    id: member.id,
    name: member.name,
    phone: member.phone,
    memberCode: member.memberCode,
    role: member.role,
    rank: member.rank,
    status: member.status,
    kycStatus: member.kycStatus,
    photoUrl: member.photoUrl,
    address: member.address,
    city: member.city ?? null,
    state: member.state ?? null,
    panNumber: opts.includePan ? member.panNumber : undefined,
    sponsorId: member.sponsorId,
    parentId: member.parentId,
    position: member.position,
    activatedAt: member.activatedAt,
    createdAt: member.createdAt,
    accountName: member.accountName ?? null,
    bankName: member.bankName ?? null,
    accountNumber: member.accountNumber ?? null,
    ifsc: member.ifsc ?? null,
    upiId: member.upiId ?? null,
  };
}

async function plan() {
  return prisma.planConfig.findUniqueOrThrow({ where: { id: "default" } });
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true }));

  app.get("/public/status", async () => publicStatus());

  app.post("/setup", async (request, reply) => {
    const parsed = z
      .object({
        companyName: z.string().min(2),
        adminName: z.string().min(2),
        adminPhone: z.string().regex(/^[0-9]{10}$/),
        adminPassword: z.string().min(8),
        adminPan: z.string().min(10),
        rootName: z.string().min(2),
        rootPhone: z.string().regex(/^[0-9]{10}$/),
        rootPan: z.string().min(10),
        accountName: z.string().optional(),
        bankName: z.string().optional(),
        accountNumber: z.string().optional(),
        ifsc: z.string().optional(),
        upiId: z.string().optional(),
        contactEmail: z.string().optional(),
        contactPhone: z.string().optional(),
      })
      .safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Fill company, admin, first distributor, and PAN details." });
    }
    if (!isValidPan(normalizePan(parsed.data.adminPan)) || !isValidPan(normalizePan(parsed.data.rootPan))) {
      return reply.code(400).send({ error: "Enter valid PAN numbers (e.g. ABCDE1234F)." });
    }
    if (parsed.data.adminPhone === parsed.data.rootPhone) {
      return reply.code(400).send({ error: "Admin and first distributor need different phone numbers." });
    }
    if (normalizePan(parsed.data.adminPan) === normalizePan(parsed.data.rootPan)) {
      return reply.code(400).send({ error: "Admin and first distributor need different PAN numbers." });
    }
    try {
      return await bootstrapCompany({
        ...parsed.data,
        adminPan: normalizePan(parsed.data.adminPan),
        rootPan: normalizePan(parsed.data.rootPan),
      });
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "Setup failed." });
    }
  });

  app.get("/plan", async () => plan());

  app.get("/products", async () => {
    return prisma.product.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  });

  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    }
    const {
      name,
      phone,
      sponsorCode,
      placementCode,
      position,
      password,
      dateOfBirth,
      at,
      city,
      state,
    } = parsed.data;
    if ((await prisma.member.count()) === 0) {
      return reply.code(409).send({ error: "Platform is not set up yet. Open /setup first." });
    }
    const panNumber = normalizePan(parsed.data.panNumber);
    if (!isValidPan(panNumber)) {
      return reply.code(400).send({ error: "Enter a valid PAN (e.g. ABCDE1234F)." });
    }
    const existing = await prisma.member.findUnique({ where: { phone } });
    if (existing) {
      return reply.code(409).send({ error: "This mobile number is already registered." });
    }
    const panTaken = await prisma.member.findFirst({ where: { panNumber } });
    if (panTaken) {
      return reply.code(409).send({ error: "This PAN is already registered." });
    }
    const sponsor = await prisma.member.findUnique({
      where: { memberCode: sponsorCode.trim().toUpperCase() },
    });
    if (!sponsor || sponsor.role !== "MEMBER" || sponsor.status === "BLOCKED") {
      return reply.code(400).send({ error: "Sponsor ID must be a valid distributor Member ID." });
    }
    const placement = await prisma.member.findUnique({
      where: { memberCode: placementCode.trim().toUpperCase() },
    });
    if (!placement || placement.role !== "MEMBER") {
      return reply.code(400).send({ error: "Placement ID must be a valid distributor Member ID." });
    }
    try {
      const member = await prisma.$transaction(async (tx) => {
        const treePlacement = await reserveTreeSlot(placement.id, position, tx);
        return tx.member.create({
          data: {
            name: name.trim(),
            phone,
            panNumber,
            kycStatus: "PENDING",
            password: await bcrypt.hash(password, 12),
            memberCode: await nextMemberCode(),
            sponsorId: sponsor.id,
            parentId: treePlacement.parentId,
            position: treePlacement.position,
            address: at.trim(),
            city: city.trim(),
            state: state.trim(),
            dateOfBirth: new Date(dateOfBirth),
            role: "MEMBER",
            status: "PENDING_PIN",
            rank: "Distributor",
            wallet: { create: { balance: 0 } },
          },
        });
      });
      const fresh = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
      const token = signToken({
        id: fresh.id,
        role: fresh.role,
        phone: fresh.phone,
        memberCode: fresh.memberCode,
      });
      return {
        token,
        member: publicMember(fresh, { includePan: true }),
        credentials: { memberCode: fresh.memberCode, password },
      };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "Invalid placement." });
    }
  });

  app.post(
    "/auth/login",
    {
      config: {
        rateLimit: { max: 12, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Enter Member ID and password." });
    }
    const loginId = (parsed.data.memberCode ?? parsed.data.phone ?? "").trim();
    if (!loginId) {
      return reply.code(400).send({ error: "Enter Member ID or phone, and password." });
    }
    const member = await prisma.member.findFirst({
      where: {
        OR: [{ memberCode: loginId.toUpperCase() }, { phone: loginId }],
      },
    });
    if (!member || !(await bcrypt.compare(parsed.data.password, member.password))) {
      return reply.code(401).send({ error: "Incorrect Member ID or password." });
    }
    if (member.status === "BLOCKED") {
      return reply.code(403).send({ error: "This account is blocked. Contact support." });
    }
    if (member.issuedPassword) {
      await prisma.member.update({ where: { id: member.id }, data: { issuedPassword: null } });
    }
    const token = signToken({
      id: member.id,
      role: member.role,
      phone: member.phone,
      memberCode: member.memberCode,
    });
    return { token, member: publicMember(member, { includePan: true }) };
  });

  app.post("/auth/verify-pin", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const body = z
      .object({
        memberCode: z.string().min(3),
        pinCode: z.string().min(4),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Enter your Member ID and PIN." });
    }
    if (member.memberCode !== body.data.memberCode.trim().toUpperCase()) {
      return reply.code(400).send({ error: "Member ID must match your logged-in account." });
    }
    if (isActiveMemberStatus(member.status)) {
      return reply.code(400).send({ error: "Your account is already active." });
    }
    if (member.status !== "PENDING_PIN" && member.status !== "PENDING_PAYMENT") {
      return reply.code(400).send({ error: "PIN verification is not available for this account." });
    }
    try {
      const pin = await requestPinActivation(member.id, body.data.pinCode);
      return {
        ok: true,
        pending: true,
        message: "PIN submitted. Admin will review and approve your activation.",
        pin: publicPin(pin),
      };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "PIN submission failed." });
    }
  });

  app.get("/member/pin-activation", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const pending = await prisma.pin.findFirst({
      where: { usedForMemberId: member.id, status: "PENDING_APPROVAL" },
    });
    return { pending: pending ? publicPin(pending) : null };
  });

  app.get("/member/me", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const sponsor = member.sponsorId
      ? await prisma.member.findUnique({
          where: { id: member.sponsorId },
          select: { name: true, memberCode: true },
        })
      : null;
    const parent = member.parentId
      ? await prisma.member.findUnique({
          where: { id: member.parentId },
          select: { name: true, memberCode: true },
        })
      : null;
    const cfg = await plan();
    return { member: publicMember(member, { includePan: true }), sponsor, parent, plan: cfg };
  });

  app.patch("/member/me", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const body = z
      .object({
        address: z.string().max(200).optional(),
        city: z.string().max(100).optional(),
        state: z.string().max(100).optional(),
        photoUrl: z.string().max(500).optional(),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "You can only update address and photo here." });
    }
    const updated = await prisma.member.update({
      where: { id: member.id },
      data: {
        ...(body.data.address !== undefined ? { address: body.data.address.trim() || null } : {}),
        ...(body.data.city !== undefined ? { city: body.data.city.trim() || null } : {}),
        ...(body.data.state !== undefined ? { state: body.data.state.trim() || null } : {}),
        ...(body.data.photoUrl !== undefined ? { photoUrl: body.data.photoUrl || null } : {}),
      },
    });
    return { member: publicMember(updated, { includePan: true }) };
  });

  app.get("/member/tree", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const { tree, viewerId } = await fetchMemberTreeView(member.id, 5);
    const today = utcDateKey();
    const volume = await prisma.binaryVolume.findUnique({
      where: { memberId_date: { memberId: member.id, date: today } },
    });
    const previous = await prisma.binaryVolume.findFirst({
      where: { memberId: member.id, date: { lt: today } },
      orderBy: { date: "desc" },
    });
    return {
      tree,
      viewerId,
      today,
      volume: volume ?? {
        leftCount: 0,
        rightCount: 0,
        carryLeft: previous
          ? previous.carryLeft + previous.leftCount - previous.pairsMatched
          : 0,
        carryRight: previous
          ? previous.carryRight + previous.rightCount - previous.pairsMatched
          : 0,
        pairsMatched: 0,
        payout: 0,
        matched: false,
      },
    };
  });

  app.get("/member/team", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    return memberTeamSummary(member.id);
  });

  app.get("/member/weekly-payouts", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    return prisma.weeklyPayout.findMany({
      where: { memberId: member.id },
      orderBy: { weekStart: "desc" },
    });
  });

  app.patch("/member/bank", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const body = z
      .object({
        accountName: z.string().min(2),
        bankName: z.string().min(2),
        accountNumber: z.string().min(6),
        ifsc: z.string().min(4),
        upiId: z.string().optional(),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Enter bank name, account holder, account number, and IFSC." });
    }
    const updated = await prisma.member.update({
      where: { id: member.id },
      data: {
        accountName: body.data.accountName.trim(),
        bankName: body.data.bankName.trim(),
        accountNumber: body.data.accountNumber.trim(),
        ifsc: body.data.ifsc.trim().toUpperCase(),
        upiId: body.data.upiId?.trim() || null,
      },
    });
    return publicMember(updated, { includePan: true });
  });

  app.get("/member/wallet", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const q = request.query as { type?: string; from?: string; to?: string };
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { memberId: member.id },
      include: {
        ledger: {
          where: {
            ...(q.type ? { type: q.type } : {}),
            ...(q.from || q.to
              ? {
                  createdAt: {
                    ...(q.from ? { gte: new Date(q.from) } : {}),
                    ...(q.to ? { lte: new Date(`${q.to}T23:59:59.000Z`) } : {}),
                  },
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return wallet;
  });

  app.get("/member/payments", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    return prisma.paymentSubmission.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
    });
  });

  app.get("/member/orders", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    return prisma.order.findMany({
      where: { memberId: member.id },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
  });

  app.post("/orders", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const body = z
      .object({ productId: z.string(), quantity: z.number().int().min(1) })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Choose a product and quantity." });
    const product = await prisma.product.findUnique({ where: { id: body.data.productId } });
    if (!product || !product.active) {
      return reply.code(404).send({ error: "Product is not available." });
    }
    if (product.stock < body.data.quantity) {
      return reply.code(400).send({ error: "Not enough stock for this order." });
    }
    const order = await prisma.order.create({
      data: {
        memberId: member.id,
        productId: product.id,
        quantity: body.data.quantity,
        status: "PENDING",
      },
      include: { product: true },
    });
    return order;
  });

  app.post("/payments/submit", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const body = z
      .object({
        purpose: z.enum(["JOINING", "ORDER", "PIN"]),
        amount: z.number().int().positive(),
        referenceNo: z.string().min(4),
        screenshotUrl: z.string().url().optional().or(z.literal("")),
        orderId: z.string().optional(),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Enter amount and a valid UTR / reference number." });
    }
    const cfg = await plan();
    if (body.data.purpose === "JOINING") {
      if (isActiveMemberStatus(member.status)) {
        return reply.code(400).send({ error: "Joining fee is already approved." });
      }
      if (body.data.amount !== cfg.joiningAmount) {
        return reply.code(400).send({
          error: `Joining payment must be ₹${cfg.joiningAmount}.`,
        });
      }
    }
    if (body.data.purpose === "PIN") {
      if (!isActiveMemberStatus(member.status)) {
        return reply.code(400).send({ error: "Activate your ID before requesting PINs." });
      }
      if (body.data.amount !== cfg.joiningAmount) {
        return reply.code(400).send({
          error: `PIN payment must be ₹${cfg.joiningAmount}.`,
        });
      }
    }
    if (body.data.purpose === "ORDER") {
      if (!body.data.orderId) {
        return reply.code(400).send({ error: "Order payments must include an order." });
      }
      const order = await prisma.order.findFirst({
        where: { id: body.data.orderId, memberId: member.id },
        include: { product: true },
      });
      if (!order) return reply.code(404).send({ error: "Order not found." });
      if (order.status !== "PENDING") {
        return reply.code(400).send({ error: "This order is not awaiting payment." });
      }
      const expected = order.product.dp * order.quantity;
      if (body.data.amount !== expected) {
        return reply.code(400).send({ error: `Order payment must be ₹${expected}.` });
      }
    }
    const pending = await prisma.paymentSubmission.findFirst({
      where: {
        memberId: member.id,
        purpose: body.data.purpose,
        status: "PENDING",
        orderId: body.data.orderId ?? null,
      },
    });
    if (pending) {
      return reply.code(409).send({ error: "You already have a pending payment for this." });
    }
    const payment = await prisma.paymentSubmission.create({
      data: {
        memberId: member.id,
        purpose: body.data.purpose,
        amount: body.data.amount,
        referenceNo: body.data.referenceNo.trim(),
        screenshotUrl: body.data.screenshotUrl || null,
        orderId: body.data.orderId ?? null,
        status: "PENDING",
      },
    });
    return payment;
  });

  app.post("/kyc/submit", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const body = z
      .object({
        panNumber: z.string().min(10),
        panImageUrl: z.string().min(8),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Submit PAN number and a document image URL." });
    }
    const panNumber = normalizePan(body.data.panNumber);
    if (!isValidPan(panNumber)) {
      return reply.code(400).send({ error: "Enter a valid PAN (e.g. ABCDE1234F)." });
    }
    const pending = await prisma.kycSubmission.findFirst({
      where: { memberId: member.id, status: "PENDING" },
    });
    if (pending) {
      return reply.code(409).send({ error: "You already have a KYC submission waiting for review." });
    }
    await prisma.member.update({
      where: { id: member.id },
      data: { panNumber, kycStatus: "PENDING" },
    });
    return prisma.kycSubmission.create({
      data: {
        memberId: member.id,
        panNumber,
        panImageUrl: body.data.panImageUrl.trim(),
        status: "PENDING",
      },
    });
  });

  app.get("/member/kyc", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const submissions = await prisma.kycSubmission.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        panNumber: true,
        status: true,
        adminNote: true,
        createdAt: true,
        reviewedAt: true,
      },
    });
    return { kycStatus: member.kycStatus, panNumber: member.panNumber, submissions };
  });

  app.post("/pins/generate", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const body = z
      .object({
        referenceNo: z.string().min(4),
        screenshotUrl: z.string().url().optional().or(z.literal("")),
      })
      .safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Enter a UTR / reference number for the PIN payment." });
    }
    if (!isActiveMemberStatus(member.status)) {
      return reply.code(400).send({ error: "Activate your ID before requesting PINs." });
    }
    const cfg = await plan();
    const pending = await prisma.paymentSubmission.findFirst({
      where: { memberId: member.id, purpose: "PIN", status: "PENDING" },
    });
    if (pending) {
      return reply.code(409).send({ error: "You already have a pending PIN request." });
    }
    return prisma.paymentSubmission.create({
      data: {
        memberId: member.id,
        purpose: "PIN",
        amount: cfg.joiningAmount,
        referenceNo: body.data.referenceNo.trim(),
        screenshotUrl: body.data.screenshotUrl || null,
        status: "PENDING",
      },
    });
  });

  app.post("/pins/use", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const body = z
      .object({
        code: z.string().min(4).optional(),
        pinId: z.string().min(1).optional(),
      })
      .safeParse(request.body);
    if (!body.success || (!body.data.code && !body.data.pinId)) {
      return reply.code(400).send({ error: "Enter a PIN code." });
    }
    try {
      if (member.status === "PENDING_PIN" || member.status === "PENDING_PAYMENT") {
        if (!body.data.code) {
          return reply.code(400).send({ error: "Enter the PIN code you received." });
        }
        const pin = await requestPinActivation(member.id, body.data.code);
        return {
          ok: true,
          pending: true,
          message: "PIN submitted for admin approval.",
          pin: publicPin(pin),
        };
      }
      const pin = await consumePinForJoining(body.data, member.id);
      const fresh = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
      return { ok: true, pin: publicPin(pin), member: publicMember(fresh, { includePan: true }) };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "Could not use PIN." });
    }
  });

  app.post("/pins/:id/transfer", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const { id } = request.params as { id: string };
    const body = z.object({ memberCode: z.string().min(3) }).safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Enter the recipient Member ID." });
    }
    const pin = await prisma.pin.findUnique({ where: { id } });
    if (!pin || pin.ownerId !== member.id) {
      return reply.code(404).send({ error: "PIN not found." });
    }
    if (pin.status !== "UNUSED") {
      return reply.code(400).send({ error: "Only unused PINs can be transferred." });
    }
    const recipient = await prisma.member.findUnique({
      where: { memberCode: body.data.memberCode.trim().toUpperCase() },
    });
    if (!recipient || recipient.role !== "MEMBER") {
      return reply.code(400).send({ error: "Recipient Member ID was not found." });
    }
    if (recipient.id === member.id) {
      return reply.code(400).send({ error: "You already own this PIN." });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.pin.update({
        where: { id: pin.id },
        data: { ownerId: recipient.id },
      });
      await tx.pinTransfer.create({
        data: {
          pinId: pin.id,
          fromMemberId: member.id,
          toMemberId: recipient.id,
        },
      });
      return next;
    });
    return publicPin(updated);
  });

  app.get("/pins/used", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const pins = await prisma.pin.findMany({
      where: { ownerId: member.id, status: "USED" },
      orderBy: { usedAt: "desc" },
    });
    return pins.map(publicPin);
  });

  app.get("/pins/unused", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const pins = await prisma.pin.findMany({
      where: { ownerId: member.id, status: "UNUSED" },
      orderBy: { createdAt: "desc" },
    });
    return pins.map(publicPin);
  });

  app.get("/admin/payments/pending", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    return prisma.paymentSubmission.findMany({
      where: { status: "PENDING" },
      include: {
        member: { select: { name: true, memberCode: true, phone: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  });

  app.get("/admin/payments", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const q = request.query as { status?: string };
    return prisma.paymentSubmission.findMany({
      where: q.status ? { status: q.status } : undefined,
      include: {
        member: { select: { name: true, memberCode: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  app.get("/admin/payments/export", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const rows = await prisma.paymentSubmission.findMany({
      include: { member: true },
      orderBy: { createdAt: "desc" },
    });
    const header = [
      "id",
      "date",
      "memberCode",
      "name",
      "phone",
      "purpose",
      "amount",
      "referenceNo",
      "status",
      "adminNote",
    ];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.createdAt.toISOString(),
          r.member.memberCode,
          csvCell(r.member.name),
          r.member.phone,
          r.purpose,
          r.amount,
          csvCell(r.referenceNo),
          r.status,
          csvCell(r.adminNote ?? ""),
        ].join(","),
      ),
    ].join("\n");
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", "attachment; filename=payments.csv");
    return csv;
  });

  app.patch("/admin/payments/:id/approve", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const payment = await prisma.paymentSubmission.findUnique({ where: { id } });
    if (!payment) return reply.code(404).send({ error: "Payment not found." });
    if (payment.status !== "PENDING") {
      return reply.code(400).send({ error: "This payment was already reviewed." });
    }
    const member = await prisma.member.findUniqueOrThrow({ where: { id: payment.memberId } });
    const cfg = await plan();

    await prisma.paymentSubmission.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    });

    if (payment.purpose === "JOINING") {
      await activateMember(member.id);
    }

    if (payment.purpose === "PIN") {
      const pin = await issuePin(member.id, payment.id, admin.id);
      return { ok: true, pin: publicPin(pin) };
    }

    if (payment.purpose === "ORDER" && payment.orderId) {
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: payment.orderId },
        include: { product: true },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PAID" },
      });
      await prisma.product.update({
        where: { id: order.productId },
        data: { stock: { decrement: order.quantity } },
      });
      const retail = cfg.retailIncomePerUnit * order.quantity;
      await creditWallet({
        memberId: member.id,
        type: "RETAIL_INCOME",
        amount: retail,
        note: `Retail margin on ${order.quantity} × ${order.product.name}`,
      });
    }

    return { ok: true };
  });

  app.patch("/admin/payments/:id/reject", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = z.object({ adminNote: z.string().min(2) }).safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Add a note so the member knows why it was rejected." });
    }
    const payment = await prisma.paymentSubmission.findUnique({ where: { id } });
    if (!payment) return reply.code(404).send({ error: "Payment not found." });
    if (payment.status !== "PENDING") {
      return reply.code(400).send({ error: "This payment was already reviewed." });
    }
    return prisma.paymentSubmission.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminNote: body.data.adminNote,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    });
  });

  app.get("/admin/kyc/pending", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    return prisma.kycSubmission.findMany({
      where: { status: "PENDING" },
      include: {
        member: { select: { name: true, memberCode: true, phone: true, kycStatus: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  });

  app.patch("/admin/kyc/:id/approve", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const submission = await prisma.kycSubmission.findUnique({ where: { id } });
    if (!submission) return reply.code(404).send({ error: "KYC submission not found." });
    if (submission.status !== "PENDING") {
      return reply.code(400).send({ error: "This KYC submission was already reviewed." });
    }
    await prisma.$transaction([
      prisma.kycSubmission.update({
        where: { id },
        data: { status: "VERIFIED", reviewedBy: admin.id, reviewedAt: new Date() },
      }),
      prisma.member.update({
        where: { id: submission.memberId },
        data: { kycStatus: "VERIFIED", panNumber: submission.panNumber },
      }),
    ]);
    return { ok: true };
  });

  app.patch("/admin/kyc/:id/reject", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = z.object({ adminNote: z.string().min(2) }).safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Add a note so the member knows why it was rejected." });
    }
    const submission = await prisma.kycSubmission.findUnique({ where: { id } });
    if (!submission) return reply.code(404).send({ error: "KYC submission not found." });
    if (submission.status !== "PENDING") {
      return reply.code(400).send({ error: "This KYC submission was already reviewed." });
    }
    await prisma.$transaction([
      prisma.kycSubmission.update({
        where: { id },
        data: {
          status: "REJECTED",
          adminNote: body.data.adminNote,
          reviewedBy: admin.id,
          reviewedAt: new Date(),
        },
      }),
      prisma.member.update({
        where: { id: submission.memberId },
        data: { kycStatus: "REJECTED" },
      }),
    ]);
    return { ok: true };
  });

  app.get("/admin/pins", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const pending = await prisma.paymentSubmission.findMany({
      where: { purpose: "PIN", status: "PENDING" },
      include: {
        member: { select: { name: true, memberCode: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const activationQueue = await prisma.pin.findMany({
      where: { status: "PENDING_APPROVAL" },
      include: {
        owner: { select: { name: true, memberCode: true } },
      },
      orderBy: { usedAt: "asc" },
    });
    const activationRows = await Promise.all(
      activationQueue.map(async (pin) => {
        const target = pin.usedForMemberId
          ? await prisma.member.findUnique({
              where: { id: pin.usedForMemberId },
              select: { id: true, name: true, memberCode: true, phone: true, status: true },
            })
          : null;
        return { pin: publicPin(pin), member: target, owner: pin.owner };
      }),
    );
    const recent = await prisma.pin.findMany({
      include: { owner: { select: { name: true, memberCode: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { pending, activationQueue: activationRows, recent };
  });

  app.post("/admin/pins/generate", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const body = z
      .object({
        count: z.number().int().min(1).max(50).default(1),
        memberCode: z.string().optional(),
        activate: z.boolean().optional(),
      })
      .safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Enter how many PINs to generate (1–50)." });
    }
    try {
      const pins = await generateAdminPins({
        adminId: admin.id,
        count: body.data.count,
        assignedMemberCode: body.data.memberCode,
      });
      if (body.data.activate && body.data.memberCode) {
        const target = await prisma.member.findUnique({
          where: { memberCode: body.data.memberCode.trim().toUpperCase() },
        });
        if (!target) {
          return reply.code(400).send({ error: "Member ID not found for activation." });
        }
        const activated = await adminActivateMemberWithPin({
          memberId: target.id,
          adminId: admin.id,
          pinId: pins[0]?.id,
        });
        const fresh = await prisma.member.findUniqueOrThrow({ where: { id: target.id } });
        return {
          pins: pins.map(publicPin),
          activated: publicPin(activated),
          member: publicMember(fresh, { includePan: true }),
        };
      }
      return { pins: pins.map(publicPin) };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "Could not generate PINs." });
    }
  });

  app.patch("/admin/pins/:id/approve", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    try {
      const pin = await approvePinActivation(id);
      const member = pin.usedForMemberId
        ? await prisma.member.findUniqueOrThrow({ where: { id: pin.usedForMemberId } })
        : null;
      return {
        ok: true,
        pin: publicPin(pin),
        member: member ? publicMember(member, { includePan: true }) : null,
      };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "Could not approve PIN." });
    }
  });

  app.patch("/admin/pins/:id/reject", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    try {
      await rejectPinActivation(id);
      return { ok: true };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "Could not reject PIN." });
    }
  });

  app.post("/admin/pins/:id/transfer", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    const body = z.object({ memberCode: z.string().min(3) }).safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Enter the recipient Member ID." });
    }
    try {
      const pin = await transferPinToMember(id, body.data.memberCode);
      return { pin: publicPin(pin) };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "Could not transfer PIN." });
    }
  });

  app.post("/admin/pins/:id/activate", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = z.object({ memberCode: z.string().min(3) }).safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Enter the Member ID to activate." });
    }
    const target = await prisma.member.findUnique({
      where: { memberCode: body.data.memberCode.trim().toUpperCase() },
    });
    if (!target || target.role !== "MEMBER") {
      return reply.code(404).send({ error: "Member not found." });
    }
    try {
      const pin = await adminActivateMemberWithPin({
        memberId: target.id,
        adminId: admin.id,
        pinId: id,
      });
      const fresh = await prisma.member.findUniqueOrThrow({ where: { id: target.id } });
      return {
        ok: true,
        pin: publicPin(pin),
        member: publicMember(fresh, { includePan: true }),
      };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "Could not activate PIN." });
    }
  });

  app.post("/admin/members/:id/activate", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = z
      .object({
        pinId: z.string().optional(),
        pinCode: z.string().optional(),
        generatePin: z.boolean().optional(),
      })
      .safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid activation request." });
    }
    try {
      const pin = await adminActivateMemberWithPin({
        memberId: id,
        adminId: admin.id,
        pinId: body.data.pinId,
        pinCode: body.data.pinCode,
        generateIfMissing: body.data.generatePin ?? (!body.data.pinId && !body.data.pinCode),
      });
      const fresh = await prisma.member.findUniqueOrThrow({ where: { id } });
      return {
        ok: true,
        pin: publicPin(pin),
        member: publicMember(fresh, { includePan: true }),
      };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "Could not activate member." });
    }
  });

  app.post("/admin/run-matching", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const body = z.object({ date: z.string().optional() }).safeParse(request.body ?? {});
    const date = body.success && body.data.date ? body.data.date : utcDateKey();
    const existing = await prisma.matchingRun.findUnique({ where: { date } });
    if (existing) {
      return reply.code(409).send({
        error: `Matching already ran for ${date}.`,
        run: existing,
      });
    }
    const cfg = await plan();
    const members = await prisma.member.findMany({
      where: { role: "MEMBER", status: { in: ["ACTIVE", "GREEN"] } },
    });
    let pairsTotal = 0;
    let payoutTotal = 0;
    for (const member of members) {
      const volume = await getOrCreateVolume(member.id, date);
      if (volume.matched) continue;
      const result = computeMatching({
        carryLeft: volume.carryLeft,
        carryRight: volume.carryRight,
        newLeft: volume.leftCount,
        newRight: volume.rightCount,
        pairValue: cfg.pairValue,
        dailyCap: cfg.dailyPairCap,
        gstPercent: cfg.gstPercent,
        adminCutPercent: cfg.adminCutPercent,
      });
      await prisma.binaryVolume.update({
        where: { id: volume.id },
        data: {
          pairsMatched: result.pairsMatched,
          payout: result.netPayout,
          matched: true,
        },
      });
      if (result.netPayout > 0) {
        await creditWallet({
          memberId: member.id,
          type: "MATCHING_INCOME",
          amount: result.netPayout,
          grossAmount: result.grossPayout,
          gstCut: result.gstCut,
          adminCut: result.adminCut,
          note: `${result.pairsMatched} pair(s) on ${date}. Gross ₹${result.grossPayout}, GST ₹${result.gstCut}, admin ₹${result.adminCut}.`,
        });
      }
      pairsTotal += result.pairsMatched;
      payoutTotal += result.netPayout;
    }
    const run = await prisma.matchingRun.create({
      data: {
        date,
        membersProcessed: members.length,
        pairsTotal,
        payoutTotal,
      },
    });
    return { run };
  });

  app.get("/admin/matching/runs", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    return prisma.matchingRun.findMany({ orderBy: { date: "desc" }, take: 30 });
  });

  app.get("/admin/members", async (request, reply) => {
    if (!(await requireStaff(request, reply))) return;
    const q = request.query as { q?: string; status?: string };
    return prisma.member.findMany({
      where: {
        role: "MEMBER",
        ...(q.status ? { status: q.status } : {}),
        ...(q.q
          ? {
              OR: [
                { name: { contains: q.q } },
                { phone: { contains: q.q } },
                { memberCode: { contains: q.q.toUpperCase() } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        memberCode: true,
        panNumber: true,
        kycStatus: true,
        status: true,
        rank: true,
        position: true,
        issuedPassword: true,
        createdAt: true,
        wallet: { select: { balance: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  app.patch("/admin/members/:id/status", async (request, reply) => {
    if (!(await requireStaff(request, reply))) return;
    const { id } = request.params as { id: string };
    const body = z.object({ status: z.enum(["BLOCKED", "RESTORE"]) }).safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Status must be BLOCKED or RESTORE." });
    }
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member || member.role !== "MEMBER") {
      return reply.code(404).send({ error: "Member not found." });
    }
    if (body.data.status === "BLOCKED") {
      return prisma.member.update({ where: { id }, data: { status: "BLOCKED" } });
    }
    if (member.status !== "BLOCKED") {
      return reply.code(400).send({ error: "Only blocked members can be restored." });
    }
    const nextStatus = member.activatedAt ? "GREEN" : "PENDING_PIN";
    return prisma.member.update({ where: { id }, data: { status: nextStatus } });
  });

  app.patch("/admin/members/:id/name", async (request, reply) => {
    if (!(await requireStaff(request, reply))) return;
    const { id } = request.params as { id: string };
    const body = z.object({ name: z.string().min(2).max(120) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Enter a valid name." });
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member || member.role !== "MEMBER") {
      return reply.code(404).send({ error: "Member not found." });
    }
    return prisma.member.update({
      where: { id },
      data: { name: body.data.name.trim() },
    });
  });

  app.patch("/admin/members/:id/password", async (request, reply) => {
    if (!(await requireStaff(request, reply))) return;
    const { id } = request.params as { id: string };
    const body = z.object({ password: z.string().min(8) }).safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Password must be at least 8 characters." });
    }
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member || member.role !== "MEMBER") {
      return reply.code(404).send({ error: "Member not found." });
    }
    return prisma.member.update({
      where: { id },
      data: { password: await bcrypt.hash(body.data.password, 12) },
    });
  });

  app.patch("/admin/members/:id/role", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    const body = z.object({ role: z.enum(["MEMBER", "SUPPORT"]) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Role must be MEMBER or SUPPORT." });
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member) return reply.code(404).send({ error: "Member not found." });
    if (member.role === "ADMIN") {
      return reply.code(400).send({ error: "Cannot change the admin role from here." });
    }
    return prisma.member.update({
      where: { id },
      data: { role: body.data.role },
    });
  });

  app.patch("/admin/members/:id/rank", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    const body = z.object({ rank: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Enter a rank label." });
    return prisma.member.update({
      where: { id },
      data: { rank: body.data.rank },
    });
  });

  app.get("/admin/members/:id/report", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        wallet: { include: { ledger: { orderBy: { createdAt: "desc" } } } },
        payments: { orderBy: { createdAt: "desc" } },
        orders: { include: { product: true }, orderBy: { createdAt: "desc" } },
        weeklyPayouts: { orderBy: { weekStart: "desc" } },
        sponsor: { select: { name: true, memberCode: true } },
        parent: { select: { name: true, memberCode: true } },
      },
    });
    if (!member || member.role !== "MEMBER") {
      return reply.code(404).send({ error: "Member not found." });
    }
    const team = await memberTeamSummary(member.id);
    return {
      member: publicMember(member, { includePan: true }),
      sponsor: member.sponsor,
      parent: member.parent,
      wallet: member.wallet,
      payments: member.payments,
      orders: member.orders,
      weeklyPayouts: member.weeklyPayouts,
      team,
    };
  });

  app.get("/admin/weekly-payouts", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const q = request.query as { status?: string; weekStart?: string };
    return prisma.weeklyPayout.findMany({
      where: {
        ...(q.status ? { status: q.status } : {}),
        ...(q.weekStart ? { weekStart: q.weekStart } : {}),
      },
      include: {
        member: {
          select: {
            name: true,
            memberCode: true,
            phone: true,
            status: true,
            accountName: true,
            bankName: true,
            accountNumber: true,
            ifsc: true,
            upiId: true,
          },
        },
      },
      orderBy: [{ weekStart: "desc" }, { generatedAmount: "desc" }],
    });
  });

  app.get("/admin/weekly-payouts/export", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const rows = await prisma.weeklyPayout.findMany({
      include: { member: true },
      orderBy: { weekStart: "desc" },
    });
    const csv = [
      [
        "id",
        "weekStart",
        "weekEnd",
        "memberCode",
        "name",
        "phone",
        "generatedAmount",
        "matchingAmount",
        "retailAmount",
        "downlineTotal",
        "status",
        "accountNumber",
        "ifsc",
      ].join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.weekStart,
          r.weekEnd,
          r.member.memberCode,
          csvCell(r.member.name),
          r.member.phone,
          r.generatedAmount,
          r.matchingAmount,
          r.retailAmount,
          r.downlineTotal,
          r.status,
          csvCell(r.member.accountNumber ?? ""),
          csvCell(r.member.ifsc ?? ""),
        ].join(","),
      ),
    ].join("\n");
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", "attachment; filename=weekly-payouts.csv");
    return csv;
  });

  app.post("/admin/weekly-payouts/generate", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const body = z.object({ weekStart: z.string().optional() }).safeParse(request.body ?? {});
    const weekStart = body.success ? body.data.weekStart : undefined;
    return generateWeeklyReports(weekStart);
  });

  app.patch("/admin/weekly-payouts/:id/approve", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const { id } = request.params as { id: string };
    try {
      return await approveWeeklyPayout(id, admin.id);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 400;
      return reply.code(status).send({ error: err instanceof Error ? err.message : "Could not approve." });
    }
  });

  app.patch("/admin/weekly-payouts/:id/reject", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = z.object({ adminNote: z.string().min(2) }).safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "Add a note so the member knows why payout was held." });
    }
    const payout = await prisma.weeklyPayout.findUnique({ where: { id } });
    if (!payout) return reply.code(404).send({ error: "Weekly report not found." });
    if (payout.status === "APPROVED") {
      return reply.code(400).send({ error: "Approved weekly payouts cannot be rejected." });
    }
    return prisma.weeklyPayout.update({
      where: { id },
      data: {
        status: "REJECTED",
        adminNote: body.data.adminNote,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    });
  });

  app.get("/admin/payouts/export", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const rows = await prisma.ledgerEntry.findMany({
      include: { wallet: { include: { member: true } } },
      orderBy: { createdAt: "desc" },
    });
    const csv = [
      [
        "id",
        "date",
        "memberCode",
        "name",
        "type",
        "netAmount",
        "grossAmount",
        "gstCut",
        "adminCut",
        "note",
      ].join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.createdAt.toISOString(),
          r.wallet.member.memberCode,
          csvCell(r.wallet.member.name),
          r.type,
          r.amount,
          r.grossAmount ?? "",
          r.gstCut ?? "",
          r.adminCut ?? "",
          csvCell(r.note ?? ""),
        ].join(","),
      ),
    ].join("\n");
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", "attachment; filename=payouts.csv");
    return csv;
  });

  app.get("/admin/config", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    return plan();
  });

  app.patch("/admin/config", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const body = z
      .object({
        joiningAmount: z.number().int().positive(),
        pairValue: z.number().int().positive(),
        dailyPairCap: z.number().int().positive(),
        gstPercent: z.number().int().min(0).max(50),
        adminCutPercent: z.number().int().min(0).max(50),
        retailIncomePerUnit: z.number().int().min(0),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Check plan values." });
    return prisma.planConfig.update({ where: { id: "default" }, data: body.data });
  });

  app.get("/admin/company", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    await ensurePlanAndCatalog();
    return prisma.companySettings.findUniqueOrThrow({ where: { id: "default" } });
  });

  app.patch("/admin/company", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const body = z
      .object({
        companyName: z.string().min(2),
        accountName: z.string(),
        bankName: z.string(),
        accountNumber: z.string(),
        ifsc: z.string(),
        upiId: z.string(),
        contactEmail: z.string(),
        contactPhone: z.string(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Check company bank and contact details." });
    return prisma.companySettings.update({
      where: { id: "default" },
      data: { ...body.data, ifsc: body.data.ifsc.trim().toUpperCase() },
    });
  });

  app.get("/admin/products", async (request, reply) => {
    if (!(await requireStaff(request, reply))) return;
    return prisma.product.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  });

  app.post("/admin/products", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const body = productSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Fill product name, DP, MRP, and stock." });
    return prisma.product.create({ data: body.data });
  });

  app.patch("/admin/products/:id", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    const body = productSchema.partial().safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid product fields." });
    return prisma.product.update({ where: { id }, data: body.data });
  });
}

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  dp: z.number().int().positive(),
  mrp: z.number().int().positive(),
  stock: z.number().int().min(0),
  active: z.boolean().optional(),
  imageUrl: z.string().optional(),
});

function csvCell(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}
