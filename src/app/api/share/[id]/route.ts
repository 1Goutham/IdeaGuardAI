import { NextResponse } from "next/server";
import { deleteShare, updateShare } from "@/lib/server/shares";
import { parseReport } from "@/lib/server/shareRequest";

export const runtime = "nodejs";

const status = { ok: 200, forbidden: 403, missing: 404 } as const;
const messages = { forbidden: "This browser can't change that shared report.", missing: "That shared report no longer exists." };

function reply(result: "ok" | "forbidden" | "missing") {
  if (result === "ok") return NextResponse.json({ ok: true, data: {} });
  return NextResponse.json({ ok: false, error: { code: "invalid_request", message: messages[result], retryable: false } }, { status: status[result] });
}

/** Republish the report under the same link. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await parseReport(req);
  if (body instanceof NextResponse) return body;
  if (!body.token) return reply("forbidden");
  return reply(await updateShare(id, body.token, body.report));
}

/** Stop sharing. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = (await req.json().catch(() => null))?.token;
  if (typeof token !== "string") return reply("forbidden");
  return reply(await deleteShare(id, token));
}
