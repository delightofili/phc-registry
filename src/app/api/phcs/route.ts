import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const phcs = await prisma.phc.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, lga: true, state: true },
  });
  return NextResponse.json(phcs);
}
