"use client";

import { useState } from "react";
import { CheckCircle2, Copy, Send, X } from "lucide-react";
import { useSendTransaction } from "wagmi";
import { parseUnits } from "viem";
import { sendEmbeddedNativePayment, isAddressLike } from "@/lib/chain";
import { unlockEmbeddedWallet } from "@/lib/embedded-wallet";
import { useAppStore } from "@/lib/app-store";
import { ARC_CHAIN_ID, arcTestnet, ARC_EXPLORER_URL } from "@/lib/arc";
import { errorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PaymentModal({
  open,
  onClose,
  mode,
  balance,
  address,
  networkLabel,
  onArc,
  onRequireSwitch,
  onRefresh
}: {
  open: boolean;
  onClose: () => void;
  mode: string;
  balance: string;
  address: string | null;
  networkLabel: string;
  onArc: boolean;
  onRequireSwitch: () => void;
  onRefresh: () => void;
}) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [passcode, setPasscode] = useState("");
  const [status, setStatus] = useState("");
  const [hash, setHash] = useState<`0x${string}` | "">("");
  const [busy, setBusy] = useState(false);
  const [approvalConfirmed, setApprovalConfirmed] = useState(false);
  const [merchantToken, setMerchantToken] = useState<string>(arcTestnet.nativeCurrency.symbol);
  const [requestLink, setRequestLink] = useState("");
  const [copied, setCopied] = useState(false);
  const { walletMode, preferences, addActivity, updateActivity } = useAppStore();
  const { sendTransactionAsync } = useSendTransaction();
  const insufficient = Number(amount || 0) > Number(balance || 0);
  const valid = isAddressLike(recipient) && Number(amount) > 0 && !insufficient;
  const approvalLimit = Number(preferences.security.approvalLimit || 0);
  const needsApproval = preferences.security.requireApproval && Number(amount || 0) >= approvalLimit;
  const isReceive = mode === "Receive";
  const isMerchant = mode === "Pay Merchant";
  const requestUrl = address
    ? `${typeof window === "undefined" ? "https://arc.one" : window.location.origin}/pay/request?to=${address}`
    : "";
  const qrData = address || "";

  if (!open) {
    return null;
  }

  async function confirmPayment() {
    if (!valid) {
      setStatus("Enter a valid wallet address and amount within your available balance.");
      return;
    }
    if (!onArc) {
      setStatus("Wrong network detected. Switch to X Layer mainnet before signing.");
      return;
    }

    setBusy(true);
    setStatus("Preparing wallet signature...");
    try {
      const to = recipient as `0x${string}`;
      const value = parseUnits(amount, arcTestnet.nativeCurrency.decimals);
      const result =
        walletMode === "embedded"
          ? await sendEmbeddedNativePayment({ privateKey: (await unlockEmbeddedWallet(passcode)).privateKey, to, amount })
          : { hash: await sendTransactionAsync({ to, value, chainId: ARC_CHAIN_ID }), explorerUrl: "" };
      setHash(result.hash);
      setStatus("Transaction submitted. Waiting for X Layer indexing.");
      const created = addActivity({
        type: "payment",
        title: "Payment submitted",
        detail: `${amount} ${arcTestnet.nativeCurrency.symbol} to ${recipient}`,
        hash: result.hash,
        status: "pending"
      });
      window.setTimeout(() => {
        updateActivity(created.id, { status: "confirmed", title: "Payment confirmed" });
      }, 2200);
      onRefresh();
    } catch (error) {
      setStatus(errorMessage(error, "Payment failed before submission."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-3 backdrop-blur-sm sm:place-items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <Card className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overflow-x-hidden p-5" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-arcblue">{mode}</p>
            <h2 className="mt-1 text-2xl font-black">{isReceive ? "Receive Funds" : isMerchant ? "Pay Merchant" : "Send Payment"}</h2>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close payment modal">
            <X size={18} aria-hidden="true" />
          </Button>
        </div>
        {isReceive ? (
          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-line bg-white/[0.06] p-4">
              <p className="text-xs font-bold uppercase text-muted">Wallet Address</p>
              <p className="mt-2 break-all text-sm font-semibold text-white">{address ?? "No wallet connected"}</p>
              <Button
                className="mt-3 w-full"
                size="sm"
                variant="secondary"
                onClick={async () => {
                  if (!address) {
                    return;
                  }
                  await navigator.clipboard.writeText(address);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                }}
              >
                <Copy size={16} aria-hidden="true" />
                {copied ? "Address Copied" : "Copy Address"}
              </Button>
            </div>
            <div className="rounded-2xl border border-line bg-white/[0.06] p-4 text-sm">
              <p className="text-xs font-bold uppercase text-muted">Receive QR</p>
              <div className="mt-3 grid place-items-center rounded-xl border border-dashed border-line bg-black/20 p-6">
                {qrData ? (
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`}
                    alt="Wallet address QR code"
                    className="h-36 w-36 rounded-lg border border-line bg-white p-2"
                  />
                ) : (
                  <div className="h-36 w-36 rounded-lg border border-line bg-black/20" />
                )}
              </div>
              <p className="mt-3 text-xs text-muted">Share this receive screen or copy address to receive funds.</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/[0.06] p-4 text-sm text-muted">
              <p className="font-bold text-white">Optional request link</p>
              <p className="mt-2 break-all">{address ? requestUrl : "Connect wallet to generate request link."}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-line bg-white/[0.06] p-4 text-sm text-muted">
                <p>Network: {networkLabel}</p>
                <p>Estimated fee: wallet estimate at signing</p>
                <p>Token: {arcTestnet.nativeCurrency.symbol}</p>
              </div>
              {isMerchant ? (
                <label className="grid gap-2 text-sm font-bold text-muted">
                  Merchant invoice or payment link
                  <input className="rounded-2xl border border-line bg-black/20 px-4 py-3 text-white outline-none" value={requestLink} onChange={(event) => setRequestLink(event.target.value)} placeholder="https://... or INV-..." />
                </label>
              ) : null}
              <label className="grid gap-2 text-sm font-bold text-muted">
                Recipient wallet address
                <input className="rounded-2xl border border-line bg-black/20 px-4 py-3 text-base font-bold text-white outline-none" value={recipient} onChange={(event) => setRecipient(event.target.value)} placeholder="0x..." />
              </label>
              <label className="grid gap-2 text-sm font-bold text-muted">
                Amount
                <div className="flex min-w-0 rounded-2xl border border-line bg-black/20">
                <input className="min-w-0 flex-1 bg-transparent px-4 py-3 text-2xl font-black text-white outline-none" value={amount} onChange={(event) => { setAmount(event.target.value); setApprovalConfirmed(false); }} placeholder="0.00" />
                  {isMerchant ? (
                    <select className="max-w-24 bg-transparent px-3 text-sm font-black text-white outline-none sm:max-w-none sm:px-4" value={merchantToken} onChange={(event) => setMerchantToken(event.target.value)}>
                      {["USDC", "ETH", "WBTC", "EURC"].map((token) => (
                        <option key={token} value={token} className="bg-surface">{token}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex shrink-0 items-center px-3 text-sm font-black text-white sm:px-4">{arcTestnet.nativeCurrency.symbol}</span>
                  )}
                </div>
              </label>
              {walletMode === "embedded" ? (
                <label className="grid gap-2 text-sm font-bold text-muted">
                  Wallet passcode
                  <input className="rounded-2xl border border-line bg-black/20 px-4 py-3 text-white outline-none" type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} />
                </label>
              ) : null}
              {needsApproval ? (
                <label className="flex items-start gap-3 rounded-2xl border border-arcblue/25 bg-arcblue/10 p-4 text-sm font-bold text-white">
                  <input className="mt-1 h-4 w-4 accent-arcblue" type="checkbox" checked={approvalConfirmed} onChange={(event) => setApprovalConfirmed(event.target.checked)} />
                  <span>
                    Require approval is on for payments at or above {approvalLimit} {arcTestnet.nativeCurrency.symbol}. Confirm you reviewed recipient, amount, and network.
                  </span>
                </label>
              ) : null}
              <div className="rounded-2xl border border-line bg-white/[0.06] p-4 text-sm text-muted">
                Balance check: {Number(balance).toLocaleString("en-US", { maximumFractionDigits: 6 })} {arcTestnet.nativeCurrency.symbol}
                {insufficient ? <p className="mt-2 font-bold text-loss">Insufficient balance.</p> : null}
              </div>
            </div>
            {status ? <div className="mt-4 rounded-2xl border border-line bg-white/[0.06] p-3 text-sm font-bold text-white/82">{status}</div> : null}
            {hash ? (
              <a className="mt-3 flex items-center gap-2 text-sm font-bold text-arcblue" href={`${ARC_EXPLORER_URL}/tx/${hash}`} target="_blank" rel="noreferrer">
                <CheckCircle2 size={16} aria-hidden="true" />
                View transaction
              </a>
            ) : null}
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button
                variant="secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(`arc-one://pay?to=${recipient}&amount=${amount}`).catch((error: unknown) => {
                    setStatus(errorMessage(error, "Unable to copy payment link."));
                  });
                }}
              >
                <Copy size={18} aria-hidden="true" />
                Copy Payment Link
              </Button>
              <Button onClick={() => void confirmPayment()} disabled={!valid || busy || !onArc || (walletMode === "embedded" && passcode.length < 6) || (needsApproval && !approvalConfirmed)}>
                <Send size={18} aria-hidden="true" />
                {busy ? "Submitting..." : "Confirm & Sign"}
              </Button>
            </div>
            {!onArc ? (
              <Button className="mt-2 w-full" variant="danger" onClick={onRequireSwitch}>
                Switch to X Layer
              </Button>
            ) : null}
          </>
        )}
        {isReceive ? (
          <div className="mt-5">
            <Button className="w-full" variant="secondary" onClick={onClose}>Done</Button>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
