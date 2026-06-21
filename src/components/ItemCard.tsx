"use client";

import { useState, useTransition } from "react";
import { setParticipation, setItemStatus, deleteItem } from "@/lib/actions/items";
import { initials } from "@/lib/utils";

export type ParticipantView = {
  userId: string;
  name: string;
  parts: number;
};

export type MemberView = {
  userId: string;
  name: string;
};

export type ItemView = {
  id: string;
  label: string;
  status: string;
  addedByUserId: string;
  addedByName: string;
  participants: ParticipantView[];
};

export function ItemCard({
  item,
  currentUserId,
  members,
}: {
  item: ItemView;
  currentUserId: string;
  members: MemberView[];
}) {
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);

  const totalParts = item.participants.reduce((n, p) => n + p.parts, 0);
  const isBought = item.status === "bought";

  // Parts par utilisateur (0 si absent de l'article).
  const partsByUser = new Map(item.participants.map((p) => [p.userId, p.parts]));

  function call(fn: (fd: FormData) => Promise<void>, fields: Record<string, string>) {
    const fd = new FormData();
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    startTransition(() => fn(fd));
  }

  function setPartsFor(userId: string, next: number) {
    call(setParticipation, {
      itemId: item.id,
      userId,
      parts: String(Math.max(0, next)),
    });
  }

  return (
    <li
      className={`rounded-xl border p-3 shadow-sm transition ${
        isBought ? "border-neutral-200 bg-neutral-50" : "border-neutral-200 bg-white"
      } ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              aria-label={isBought ? "Marquer à acheter" : "Marquer acheté"}
              onClick={() =>
                call(setItemStatus, {
                  itemId: item.id,
                  status: isBought ? "pending" : "bought",
                })
              }
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                isBought
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-neutral-300 text-transparent hover:border-green-500"
              }`}
            >
              ✓
            </button>
            <span
              className={`truncate font-medium ${
                isBought ? "text-neutral-400 line-through" : "text-neutral-900"
              }`}
            >
              {item.label}
            </span>
          </div>
          <p className="mt-0.5 pl-8 text-xs text-neutral-400">ajouté par {item.addedByName}</p>
        </div>

        {item.addedByUserId === currentUserId && (
          <button
            aria-label="Supprimer"
            onClick={() => call(deleteItem, { itemId: item.id })}
            className="shrink-0 text-neutral-300 hover:text-red-500"
          >
            ✕
          </button>
        )}
      </div>

      {/* Participants & parts (façon Tricount) */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-8">
        {item.participants.map((p) => (
          <span
            key={p.userId}
            title={`${p.name} · ${p.parts} part${p.parts > 1 ? "s" : ""}`}
            className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-800"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-200 text-[9px] font-bold">
              {initials(p.name)}
            </span>
            {p.parts}
            {totalParts > 0 && <span className="text-green-500">/{totalParts}</span>}
          </span>
        ))}
        {item.participants.length === 0 && (
          <span className="text-xs text-neutral-400">personne pour l&apos;instant</span>
        )}
        <button
          onClick={() => setEditing((v) => !v)}
          className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-50"
        >
          {editing ? "Fermer" : "Qui participe ?"}
        </button>
      </div>

      {/* Éditeur de participants : tous les membres du groupe, façon Tricount */}
      {editing && (
        <div className="mt-3 ml-8 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
          <ul className="flex flex-col divide-y divide-neutral-200">
            {members.map((m) => {
              const parts = partsByUser.get(m.userId) ?? 0;
              const isMe = m.userId === currentUserId;
              return (
                <li key={m.userId} className="flex items-center justify-between gap-2 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-700">
                      {initials(m.name)}
                    </span>
                    <span className="truncate text-sm text-neutral-800">
                      {m.name}
                      {isMe && <span className="text-neutral-400"> (toi)</span>}
                    </span>
                  </span>

                  {parts > 0 ? (
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400">
                        {totalParts > 0 && `${parts}/${totalParts}`}
                      </span>
                      <span className="flex items-center rounded-lg border border-neutral-300 bg-white">
                        <button
                          aria-label={`Retirer une part à ${m.name}`}
                          onClick={() => setPartsFor(m.userId, parts - 1)}
                          className="px-2.5 py-1 text-neutral-600 hover:bg-neutral-100"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{parts}</span>
                        <button
                          aria-label={`Ajouter une part à ${m.name}`}
                          onClick={() => setPartsFor(m.userId, parts + 1)}
                          className="px-2.5 py-1 text-neutral-600 hover:bg-neutral-100"
                        >
                          +
                        </button>
                      </span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setPartsFor(m.userId, 1)}
                      className="rounded-lg border border-green-600 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
                    >
                      + Ajouter
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}
