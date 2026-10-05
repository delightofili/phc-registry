import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/age";
import { createPatientSchema } from "@/lib/validation";

function withAge<T extends { dateOfBirth: Date }>(patient: T) {
  return { ...patient, age: calculateAge(patient.dateOfBirth) };
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { confirmDuplicate, immunizations, ...data } = parsed.data;

  try {
    if (!confirmDuplicate) {
      const duplicate = await prisma.patient.findFirst({
        where: {
          fullName: { equals: data.fullName, mode: "insensitive" },
          dateOfBirth: data.dateOfBirth,
          village: { equals: data.village, mode: "insensitive" },
        },
        select: { id: true, cardNumber: true, fullName: true },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            error:
              "A patient with the same name, date of birth and village already exists",
            code: "POSSIBLE_DUPLICATE",
            existing: duplicate,
          },
          { status: 409 },
        );
      }
    }

    const patient = await prisma.$transaction(async (tx) => {
      const phc = await tx.phc.update({
        where: { id: data.phcId },
        data: { patientCounter: { increment: 1 } },
        select: { code: true, patientCounter: true },
      });
      const cardNumber = `${phc.code}-${String(phc.patientCounter).padStart(5, "0")}`;

      return tx.patient.create({
        data: {
          ...data,
          cardNumber,
          immunizations: immunizations?.length
            ? { create: immunizations }
            : undefined,
        },
        include: {
          phc: { select: { name: true } },
          immunizations: true,
        },
      });
    });

    return NextResponse.json(withAge(patient), { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002" && String(e.meta?.target).includes("nhisNumber")) {
        return NextResponse.json(
          {
            error: "This NHIS number is already registered",
            code: "NHIS_TAKEN",
          },
          { status: 409 },
        );
      }
      if (e.code === "P2025") {
        return NextResponse.json({ error: "PHC not found" }, { status: 404 });
      }
    }
    console.error("POST /api/patients failed:", e);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit")) || 20),
  );

  const phoneLike = q.replace(/[\s-]/g, "");

  const where: Prisma.PatientWhereInput = q
    ? {
        OR: [
          { fullName: { contains: q, mode: "insensitive" } },
          { phone: { contains: phoneLike } },
          { nhisNumber: { contains: q, mode: "insensitive" } },
          { cardNumber: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  try {
    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        orderBy: { registeredAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          cardNumber: true,
          fullName: true,
          dateOfBirth: true,
          gender: true,
          phone: true,
          village: true,
          isPregnant: true,
          registeredAt: true,
        },
      }),
      prisma.patient.count({ where }),
    ]);

    return NextResponse.json({
      data: patients.map(withAge),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("GET /api/patients failed:", e);
    return NextResponse.json(
      { error: "Could not load patients" },
      { status: 500 },
    );
  }
}
