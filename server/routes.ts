import bcrypt from "bcrypt";
import { z } from "zod";
import { FastifyInstance } from "fastify";
import { prisma } from "./db";
import { requireAuth, requireRole, signToken } from "./auth";
import { utcDateKey } from "./dates";
import { computeMatching } from "./matching";
import { activateMember, fetchSubtree, getOrCreateVolume, nextMemberCode, placeUnderSponsor } from "./tree";
import { creditWallet } from "./wallet";
import { generatePassword, isValidPan, normalizePan } from "./credentials";
import { consumePinForJoining, issuePin, publicPin } from "./pins";

const registerSchema = z.object({
  name: z.string().min(2),
  phone: z.string().regex(/^[0-9]{10}$/, "Enter a 10-digit phone number."),
  panNumber: z.string().min(10),
  pinCode: z.string().optional(),
});

const loginSchema = z.object({
  memberCode: z.string().min(3),
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
    sponsorId: string | null;
    parentId: string | null;
    position: string | null;
    activatedAt: Date | null;
    createdAt: Date;
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
    panNumber: opts.includePan ? member.panNumber : undefined,
    sponsorId: member.sponsorId,
    parentId: member.parentId,
    position: member.position,
    activatedAt: member.activatedAt,
    createdAt: member.createdAt,
  };
}

async function plan() {
  return prisma.planConfig.findUniqueOrThrow({ where: { id: "default" } });
}

export async function registerRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true }));

  app.get("/plan", async () => plan());

  app.get("/products", async () => {
    return prisma.product.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  });

  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Invalid input." });
    }
    const { name, phone, pinCode } = parsed.data;
    const panNumber = normalizePan(parsed.data.panNumber);
    if (!isValidPan(panNumber)) {
      return reply.code(400).send({ error: "Enter a valid PAN (e.g. ABCDE1234F)." });
    }
    const existing = await prisma.member.findUnique({ where: { phone } });
    if (existing) {
      return reply.code(409).send({ error: "This phone number is already registered." });
    }
    const sponsor = await prisma.member.findFirst({
      where: { role: "MEMBER", status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    if (!sponsor) {
      return reply.code(400).send({ error: "Registration is not open yet. Contact support." });
    }
    const placement = await placeUnderSponsor(sponsor.id);
    const plainPassword = generatePassword();
    const member = await prisma.member.create({
      data: {
        name: name.trim(),
        phone,
        panNumber,
        kycStatus: "PENDING",
        password: await bcrypt.hash(plainPassword, 10),
        issuedPassword: plainPassword,
        memberCode: await nextMemberCode(),
        sponsorId: sponsor.id,
        parentId: placement.parentId,
        position: placement.position,
        role: "MEMBER",
        status: "PENDING_PAYMENT",
        rank: "Distributor",
        wallet: { create: { balance: 0 } },
      },
    });
    if (pinCode?.trim()) {
      try {
        await consumePinForJoining({ code: pinCode }, member.id);
      } catch (err) {
        await prisma.wallet.delete({ where: { memberId: member.id } });
        await prisma.member.delete({ where: { id: member.id } });
        return reply.code(400).send({
          error: err instanceof Error ? err.message : "That PIN could not be used.",
        });
      }
    }
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
      credentials: { memberCode: fresh.memberCode, password: plainPassword },
    };
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Enter Member ID and password." });
    }
    const member = await prisma.member.findUnique({
      where: { memberCode: parsed.data.memberCode.trim().toUpperCase() },
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
        ...(body.data.photoUrl !== undefined ? { photoUrl: body.data.photoUrl || null } : {}),
      },
    });
    return { member: publicMember(updated, { includePan: true }) };
  });

  app.get("/member/tree", async (request, reply) => {
    const member = await requireAuth(request, reply);
    if (!member) return;
    const tree = await fetchSubtree(member.id, 3);
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
      if (member.status === "ACTIVE") {
        return reply.code(400).send({ error: "Joining fee is already approved." });
      }
      if (body.data.amount !== cfg.joiningAmount) {
        return reply.code(400).send({
          error: `Joining payment must be ₹${cfg.joiningAmount}.`,
        });
      }
    }
    if (body.data.purpose === "PIN") {
      if (member.status !== "ACTIVE") {
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
    if (member.status !== "ACTIVE") {
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
      const pin = await consumePinForJoining(body.data, member.id);
      const fresh = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
      return { ok: true, pin: publicPin(pin), member: publicMember(fresh, { includePan: true }) };
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : "Could not use PIN." });
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
    if (!(await requireRole(request, reply, "ADMIN"))) return;
    return prisma.paymentSubmission.findMany({
      where: { status: "PENDING" },
      include: {
        member: { select: { name: true, memberCode: true, phone: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  });

  app.get("/admin/payments", async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return;
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
    if (!(await requireRole(request, reply, "ADMIN"))) return;
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
    const admin = await requireRole(request, reply, "ADMIN");
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
    const admin = await requireRole(request, reply, "ADMIN");
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
    if (!(await requireRole(request, reply, "ADMIN"))) return;
    return prisma.kycSubmission.findMany({
      where: { status: "PENDING" },
      include: {
        member: { select: { name: true, memberCode: true, phone: true, kycStatus: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  });

  app.patch("/admin/kyc/:id/approve", async (request, reply) => {
    const admin = await requireRole(request, reply, "ADMIN");
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
    const admin = await requireRole(request, reply, "ADMIN");
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
    if (!(await requireRole(request, reply, "ADMIN"))) return;
    const pending = await prisma.paymentSubmission.findMany({
      where: { purpose: "PIN", status: "PENDING" },
      include: {
        member: { select: { name: true, memberCode: true, phone: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    const recent = await prisma.pin.findMany({
      include: { owner: { select: { name: true, memberCode: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return { pending, recent };
  });

  app.post("/admin/run-matching", async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return;
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
      where: { status: "ACTIVE", role: "MEMBER" },
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
    if (!(await requireRole(request, reply, "ADMIN"))) return;
    return prisma.matchingRun.findMany({ orderBy: { date: "desc" }, take: 30 });
  });

  app.get("/admin/members", async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return;
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
    if (!(await requireRole(request, reply, "ADMIN"))) return;
    const { id } = request.params as { id: string };
    const body = z.object({ status: z.enum(["ACTIVE", "BLOCKED"]) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Status must be ACTIVE or BLOCKED." });
    const member = await prisma.member.findUnique({ where: { id } });
    if (!member || member.role !== "MEMBER") {
      return reply.code(404).send({ error: "Member not found." });
    }
    if (member.status === "PENDING_PAYMENT" && body.data.status === "ACTIVE") {
      return reply.code(400).send({
        error: "Activate members by approving their joining payment, not from this screen.",
      });
    }
    return prisma.member.update({
      where: { id },
      data: { status: body.data.status },
    });
  });

  app.patch("/admin/members/:id/rank", async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return;
    const { id } = request.params as { id: string };
    const body = z.object({ rank: z.string().min(1) }).safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Enter a rank label." });
    return prisma.member.update({
      where: { id },
      data: { rank: body.data.rank },
    });
  });

  app.get("/admin/payouts/export", async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return;
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
    if (!(await requireRole(request, reply, "ADMIN"))) return;
    return plan();
  });

  app.patch("/admin/config", async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return;
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

  app.get("/admin/products", async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return;
    return prisma.product.findMany({ orderBy: { name: "asc" } });
  });

  app.post("/admin/products", async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return;
    const body = productSchema.safeParse(request.body);
    if (!body.success) return reply.code(400).send({ error: "Fill product name, DP, MRP, and stock." });
    return prisma.product.create({ data: body.data });
  });

  app.patch("/admin/products/:id", async (request, reply) => {
    if (!(await requireRole(request, reply, "ADMIN"))) return;
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
