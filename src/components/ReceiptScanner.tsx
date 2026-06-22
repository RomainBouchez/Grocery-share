"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scanReceipt, confirmReceipt, type ScanDraft, type ScanError } from "@/lib/actions/receipt";
import { formatEuro, initials } from "@/lib/utils";
import { SubmitButton } from "./SubmitButton";

type Member = { userId: string; name: string };

type ExtraState = { rawLabel: string; price: number; keep: boolean; participantIds: Set<string> };

export function ReceiptScanner({
  groupId,
  members,
  currentUserId,
}: {
  groupId: string;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ScanDraft | ScanError | undefined, FormData>(
    scanReceipt,
    undefined,
  );

  // État éditable du brouillon (rempli quand l'OCR a répondu).
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [keepMatched, setKeepMatched] = useState<Record<string, boolean>>({});
  const [extras, setExtras] = useState<ExtraState[]>([]);
  const [confirming, startConfirm] = useTransition();

  const draft = state && state.ok ? state : null;

  useEffect(() => {
    if (draft) {
      setKeepMatched(Object.fromEntries(draft.matched.map((m) => [m.itemId, true])));
      setExtras(
        draft.extras.map((e) => ({
          rawLabel: e.rawLabel,
          price: e.price,
          keep: true,
          participantIds: new Set<string>([currentUserId]),
        })),
      );
    }
  }, [draft, currentUserId]);

  // -------- Phase 1 : upload de la photo --------
  if (!draft) {
    return (
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="groupId" value={groupId} />
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-neutral-700">Photo du ticket de caisse</span>
          <input
            name="photo"
            type="file"
            accept="image/*"
            capture="environment"
            required
            className="rounded-lg border border-neutral-300 bg-white p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-green-600 file:px-3 file:py-1.5 file:text-white"
          />
        </label>

        {state && !state.ok && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}

        <SubmitButton
          className="bg-green-600 px-4 py-2.5 text-white hover:bg-green-700"
          pendingLabel="Analyse du ticket par Claude…"
        >
          Analyser le ticket
        </SubmitButton>
        <p className="text-center text-xs text-neutral-500">
          La photo est lue par Claude pour en extraire les articles et les prix.
        </p>
      </form>
    );
  }

  // -------- Phase 2 : revue & validation --------
  function toggleExtraParticipant(idx: number, userId: string) {
    setExtras((prev) =>
      prev.map((e, i) => {
        if (i !== idx) return e;
        const next = new Set(e.participantIds);
        if (next.has(userId)) next.delete(userId);
        else next.add(userId);
        return { ...e, participantIds: next };
      }),
    );
  }

  const keptMatched = draft.matched.filter((m) => keepMatched[m.itemId]);
  const keptExtras = extras.filter((e) => e.keep);
  const total =
    keptMatched.reduce((s, m) => s + m.price, 0) + keptExtras.reduce((s, e) => s + e.price, 0);

  function confirm() {
    const payload = {
      groupId,
      photoFile: draft!.photoFile,
      paidByUserId: paidBy,
      matched: keptMatched.map((m) => ({ itemId: m.itemId, rawLabel: m.rawLabel, price: m.price })),
      extras: keptExtras.map((e) => ({
        rawLabel: e.rawLabel,
        price: e.price,
        participantIds: Array.from(e.participantIds),
      })),
    };
    const fd = new FormData();
    fd.append("payload", JSON.stringify(payload));
    startConfirm(() => confirmReceipt(fd));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
        <span>Ticket analysé ✓</span>
        <span className="font-semibold">Total {formatEuro(draft.total)}</span>
      </div>

      {/* Qui a payé */}
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-neutral-700">Qui a payé ?</span>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
              {m.userId === currentUserId ? " (toi)" : ""}
            </option>
          ))}
        </select>
      </label>

      {/* Articles matchés */}
      {draft.matched.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-neutral-800">
            Articles de la liste retrouvés
          </h2>
          <ul className="flex flex-col gap-2">
            {draft.matched.map((m) => (
              <li
                key={m.itemId}
                className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white p-3"
              >
                <label className="flex min-w-0 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={keepMatched[m.itemId] ?? true}
                    onChange={(e) =>
                      setKeepMatched((prev) => ({ ...prev, [m.itemId]: e.target.checked }))
                    }
                    className="h-4 w-4 accent-green-600"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-900">
                      ✅ {m.itemLabel}
                      {m.quantity && m.quantity > 1 && (
                        <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
                          x{m.quantity}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-neutral-400">{m.rawLabel}</span>
                  </span>
                </label>
                <span className="shrink-0 text-sm font-semibold">{formatEuro(m.price)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Extras non planifiés */}
      {extras.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-neutral-800">
            🆕 Non planifiés — qui participe ?
          </h2>
          <ul className="flex flex-col gap-2">
            {extras.map((e, idx) => (
              <li key={idx} className="rounded-lg border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={e.keep}
                      onChange={(ev) =>
                        setExtras((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, keep: ev.target.checked } : x)),
                        )
                      }
                      className="h-4 w-4 accent-green-600"
                    />
                    <span className="truncate text-sm font-medium text-neutral-900">
                      {e.rawLabel}
                      {e.quantity && e.quantity > 1 && (
                        <span className="ml-1.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs font-semibold text-neutral-600">
                          x{e.quantity}
                        </span>
                      )}
                    </span>
                  </label>
                  <span className="shrink-0 text-sm font-semibold">{formatEuro(e.price)}</span>
                </div>
                {e.keep && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                    {members.map((m) => {
                      const on = e.participantIds.has(m.userId);
                      return (
                        <button
                          key={m.userId}
                          type="button"
                          onClick={() => toggleExtraParticipant(idx, m.userId)}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                            on
                              ? "bg-green-600 text-white"
                              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                          }`}
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/30 text-[9px] font-bold">
                            {initials(m.name)}
                          </span>
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="sticky bottom-0 -mx-5 border-t border-neutral-200 bg-white/95 px-5 py-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-neutral-500">Total retenu</span>
          <span className="font-bold">{formatEuro(total)}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/groups/${groupId}`)}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Annuler
          </button>
          <button
            onClick={confirm}
            disabled={confirming}
            className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {confirming ? "Validation…" : "Valider le ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
