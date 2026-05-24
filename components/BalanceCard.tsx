"use client";

import { motion } from "framer-motion";
import { ExternalLink, RefreshCw, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/utils";

export function BalanceCard({
  address,
  balance,
  symbol,
  loading,
  onRefresh,
  onFaucet,
  faucetLoading
}: {
  address: string | null;
  balance: string;
  symbol: string;
  loading: boolean;
  onRefresh: () => void;
  onFaucet: () => void;
  faucetLoading: boolean;
}) {
  const empty = !address || Number(balance) === 0;

  return (
    <Card className="relative w-full overflow-hidden p-4 sm:p-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(47,140,255,0.22),transparent_30%),radial-gradient(circle_at_85%_30%,rgba(139,92,246,0.18),transparent_32%)]" />
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">X Layer balance</p>
          <motion.h2
            className="mt-3 break-words text-[2.55rem] font-black leading-[1.05] tracking-normal text-white sm:text-6xl"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {loading ? "Syncing..." : `${Number(balance || 0).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${symbol}`}
          </motion.h2>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <Badge className={address ? "border-gain/25 bg-gain/10 text-gain" : "border-white/15 bg-white/10 text-white/70"}>
              <ShieldCheck size={14} aria-hidden="true" />
              {address ? "Non-custodial wallet" : "No wallet active"}
            </Badge>
            <span className="text-muted">{address ? shortAddress(address) : "Create or connect a wallet to begin."}</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:items-end">
          <Button className="min-h-14 w-full sm:w-auto" variant="secondary" onClick={onRefresh} disabled={!address || loading}>
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            Refresh Balance
          </Button>
          {empty ? (
            <>
              <Button className="w-full sm:w-auto" onClick={onFaucet} disabled={!address || faucetLoading}>
                {faucetLoading ? <RefreshCw size={16} className="animate-spin" aria-hidden="true" /> : <ExternalLink size={16} aria-hidden="true" />}
                Claim Faucet
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {empty && address ? (
        <div className="mt-5 rounded-2xl border border-arcblue/25 bg-arcblue/10 p-4 text-sm font-semibold text-white/82">
          Your wallet is empty. Add OKB to begin.
        </div>
      ) : null}
    </Card>
  );
}
