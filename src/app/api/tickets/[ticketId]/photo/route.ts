import { readFile } from "fs/promises";
import os from "os";
import path from "path";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { assertMembership } from "@/lib/actions/groups";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(os.tmpdir(), "grocyshare-uploads");

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif",
};

/** Sert la photo d'un ticket rapide — réservé aux membres du groupe du ticket. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string }> },
) {
  const { ticketId } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { groupId: true, photoUrl: true },
  });
  if (!ticket || !ticket.photoUrl) return new Response(null, { status: 404 });

  try {
    await assertMembership(user.id, ticket.groupId);
  } catch {
    return new Response(null, { status: 403 });
  }

  const ext = (ticket.photoUrl.split(".").pop() ?? "").toLowerCase();
  const filepath = path.join(UPLOAD_DIR, "tickets", ticket.photoUrl);

  try {
    const buffer = await readFile(filepath);
    return new Response(buffer, {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
