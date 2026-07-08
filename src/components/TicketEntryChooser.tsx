"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ReceiptScanner } from "@/components/ReceiptScanner";
import { AddTicketForm } from "@/components/AddTicketForm";
import { Camera, Pen2 } from "@/lib/icons";
import { card, INK_STRONG, INK_MUTED, INK_FAINT, FONT } from "@/lib/ui";

type Member = { userId: string; name: string };

export function TicketEntryChooser({
  groupId, members, currentUserId, isPremium,
}: {
  groupId: string; members: Member[]; currentUserId: string; isPremium: boolean;
}) {
  const tr = useTranslations("tickets.new.chooser");
  const trPremium = useTranslations("premium");
  const [mode, setMode] = useState<"choice" | "scan" | "manual">("choice");

  if (mode !== "choice") {
    return (
      <div style={{ fontFamily: FONT, display: "flex", flexDirection: "column", gap: 18 }}>
        <button type="button" onClick={() => setMode("choice")} style={{
          alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer",
          padding: 0, fontSize: 13, fontWeight: 700, color: INK_MUTED, fontFamily: "inherit",
        }}>
          {tr("back")}
        </button>
        {mode === "scan"
          ? <ReceiptScanner groupId={groupId} members={members} currentUserId={currentUserId} />
          : <AddTicketForm groupId={groupId} members={members} currentUserId={currentUserId} />}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT, display: "flex", flexDirection: "column", gap: 14 }}>
      {isPremium ? (
        <button type="button" onClick={() => setMode("scan")} style={{
          ...card, textAlign: "left", cursor: "pointer", border: "none", width: "100%",
          padding: 20, display: "flex", alignItems: "center", gap: 14, fontFamily: "inherit", boxSizing: "border-box",
        }}>
          <Camera weight="Bold" size={26} color={INK_STRONG} />
          <span>
            <span style={{ display: "block", fontSize: 16, fontWeight: 800, color: INK_STRONG }}>{tr("scanOption")}</span>
            <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: INK_FAINT, marginTop: 2 }}>{tr("scanOptionHint")}</span>
          </span>
        </button>
      ) : (
        <div title={trPremium("premiumOnlyHint")} style={{
          ...card, cursor: "not-allowed", width: "100%", padding: 20,
          display: "flex", alignItems: "center", gap: 14, opacity: 0.6, boxSizing: "border-box",
        }}>
          <Camera weight="Bold" size={26} color={INK_FAINT} />
          <span style={{ flex: 1 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: INK_FAINT }}>{tr("scanOption")}</span>
              <span style={{ padding: "3px 9px", borderRadius: 999, background: "#FDF0D6", color: "#D9921C", fontSize: 10, fontWeight: 900, letterSpacing: "0.05em" }}>
                {trPremium("premiumBadge")}
              </span>
            </span>
            <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: INK_FAINT, marginTop: 2 }}>{tr("scanOptionHint")}</span>
          </span>
        </div>
      )}

      <button type="button" onClick={() => setMode("manual")} style={{
        ...card, textAlign: "left", cursor: "pointer", border: "none", width: "100%",
        padding: 20, display: "flex", alignItems: "center", gap: 14, fontFamily: "inherit", boxSizing: "border-box",
      }}>
        <Pen2 weight="Bold" size={26} color={INK_STRONG} />
        <span>
          <span style={{ display: "block", fontSize: 16, fontWeight: 800, color: INK_STRONG }}>{tr("manualOption")}</span>
          <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: INK_FAINT, marginTop: 2 }}>{tr("manualOptionHint")}</span>
        </span>
      </button>
    </div>
  );
}
