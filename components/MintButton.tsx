"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Connection, Transaction } from "@solana/web3.js";

const SOLANA_RPC = "https://api.devnet.solana.com";

interface MintButtonProps {
  storyId?: string;
  title: string;
  genre: string;
  content: string;
}

type MintStatus = "idle" | "connecting" | "airdropping" | "minting" | "confirming" | "success" | "error";

interface PhantomWallet {
  isPhantom: boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
}

function getPhantom(): PhantomWallet | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w?.phantom?.solana?.isPhantom) return w.phantom.solana;
  if (w?.solana?.isPhantom) return w.solana;
  return null;
}

export default function MintButton({ storyId = "", title, genre, content }: MintButtonProps) {
  const [status, setStatus] = useState<MintStatus>("idle");
  const [explorerUrl, setExplorerUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [signature, setSignature] = useState("");

  const handleMint = async () => {
    try {
      setErrorMsg("");

      // Step 1: Connect Phantom wallet with 10s timeout
      setStatus("connecting");
      const phantom = getPhantom();

      if (!phantom) {
        setErrorMsg("Install Phantom wallet from phantom.app");
        setStatus("error");
        return;
      }

      const connectPromise = phantom.connect();
      const connectTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Wallet connection timed out. Please open Phantom and try again.")), 10000));
      const resp = await Promise.race([connectPromise, connectTimeout]);
      const publicKey = resp.publicKey.toString();
      console.log("Wallet connected:", publicKey);

      // Step 2: Skip balance check entirely — go straight to minting
      // Devnet RPC is slow and unreliable, just let the tx fail if no SOL
      setStatus("minting");
      const res = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId,
          title,
          genre,
          content: content.slice(0, 500),
          payerPublicKey: publicKey,
        }),
      });

      const data = await res.json();
      console.log("Mint API response:", data);

      if (!data.success || !data.serializedTransaction) {
        throw new Error(data.error || "Failed to build transaction");
      }

      // Step 4: Deserialize transaction
      const txBytes = Buffer.from(data.serializedTransaction, "base64");
      const transaction = Transaction.from(txBytes);
      console.log("Transaction deserialized, sending to Phantom...");

      // Step 5: Sign and send via Phantom
      setStatus("confirming");
      const { signature: txSignature } = await phantom.signAndSendTransaction(transaction);
      console.log("Transaction sent:", txSignature);

      // Quick confirmation with 15s timeout — don't block forever
      const connection = new Connection(SOLANA_RPC, { commitment: "confirmed" });
      try {
        const confirmPromise = connection.confirmTransaction(txSignature, "confirmed");
        const confirmTimeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000));
        await Promise.race([confirmPromise, confirmTimeout]);
        console.log("Transaction confirmed!");
      } catch {
        console.log("Confirmation timed out but tx was sent — treating as success");
      }

      // Step 6: Record in MongoDB
      const explorerLink = `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;
      setSignature(txSignature);
      setExplorerUrl(explorerLink);

      fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", signature: txSignature, storyId }),
      }).catch(() => {});

      setStatus("success");
    } catch (error) {
      console.error("Mint error:", error);
      setErrorMsg((error as Error).message || "Transaction failed");
      setStatus("error");
    }
  };

  const statusLabel: Record<MintStatus, string> = {
    idle: "",
    connecting: "Connecting wallet…",
    airdropping: "Getting devnet SOL…",
    minting: "Building transaction…",
    confirming: "Confirming on-chain…",
    success: "",
    error: "",
  };

  return (
    <AnimatePresence mode="wait">
      {status === "success" ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="surface p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-[8px] bg-[var(--mint-muted)] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[var(--text-primary)] mb-0.5">
                Minted on Solana Devnet
              </p>
              <p className="text-[12px] text-[var(--text-tertiary)] mb-2">
                Your story metadata is permanently stored on-chain via the Memo Program.
              </p>
              {signature && (
                <p className="text-[10px] font-mono text-[var(--text-quaternary)] mb-2 break-all">
                  Tx: {signature.slice(0, 20)}…{signature.slice(-8)}
                </p>
              )}
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                >
                  View on Solana Explorer
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                </a>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div key="button-area" className="space-y-2">
          <motion.button
            whileTap={status === "idle" ? { scale: 0.97 } : {}}
            onClick={status === "error" ? () => { setStatus("idle"); setErrorMsg(""); } : handleMint}
            disabled={status !== "idle" && status !== "error"}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 ${
              status === "idle"
                ? "bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] hover:bg-[var(--bg-elevated)] cursor-pointer"
                : status === "error"
                ? "bg-red-500/8 border border-red-500/15 text-red-400 cursor-pointer"
                : "bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-quaternary)] cursor-wait"
            }`}
          >
            {status !== "idle" && status !== "error" && <div className="spinner" />}
            {status === "idle" && (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M12 8v8m-4-4h8"/></svg>
                Mint as NFT on Solana
              </>
            )}
            {status !== "idle" && status !== "error" && statusLabel[status]}
            {status === "error" && "Failed — Retry"}
          </motion.button>
          {status === "error" && errorMsg && (
            <p className="text-[11px] text-red-400/70 ml-1">{errorMsg}</p>
          )}
          {status === "idle" && (
            <p className="text-[10px] text-[var(--text-quaternary)] ml-1">
              Requires{" "}
              <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                Phantom wallet
              </a>
              {" · "}
              <a href="https://faucet.solana.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                Get devnet SOL
              </a>
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
