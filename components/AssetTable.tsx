"use client";

import { CircleDollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";

export function AssetTable({ balance, symbol }: { balance: string; symbol: string }) {
  const hasBalance = Number(balance) > 0;

  return (
    <Card className="p-4">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 px-1">
        <h2 className="text-lg font-black">Portfolio</h2>
        <span className="text-sm font-bold text-muted">X Layer</span>
      </div>
      {hasBalance ? (
        <div className="rounded-2xl p-3 transition hover:bg-white/[0.06]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-black">
              <CircleDollarSign size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-black text-white">{symbol}</p>
              <p className="text-sm text-muted">Native X Layer asset</p>
            </div>
            <div className="min-w-0 text-right">
              <p className="break-words font-black text-white">{Number(balance).toLocaleString("en-US", { maximumFractionDigits: 6 })}</p>
              <p className="text-sm font-bold text-muted">Balance</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-black/20 p-6 text-center">
          <p className="font-black text-white">No assets yet.</p>
          <p className="mt-2 text-sm leading-6 text-muted">Create or connect a wallet, then add OKB to populate your portfolio.</p>
        </div>
      )}
    </Card>
  );
}
