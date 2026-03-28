"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Connection, Transaction } from "@solana/web3.js";

const SOLANA_RPC = "https://api.devnet.solana.com";

interface SceneNFTSelectorProps {
  scenes: { imageUrl: string; sceneNumber: number; text: string }[];
  storyId: string;
  genre: string;
  storyTitle: string;
}

type MintPhase = "idle" | "connecting" | "minting" | "confirming" | "success" | "error";

interface SceneState {
  selected: boolean;
  phase: MintPhase;
  signature?: string;
  error?: string;
}

function getPhantom() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w?.phantom?.solana?.isPhantom) return w.phantom.solana;
  if (w?.solana?.isPhantom) return w.solana;
  return null;
}

export default function SceneNFTSelector({ scenes, storyId, genre, storyTitle }: SceneNFTSelectorProps) {
  const [sceneStates, setSceneStates] = useState<SceneState[]>(
    scenes.map(() => ({ selected: false, phase: "idle" }))
  );
  const [isMintingAll, setIsMintingAll] = useState(false);

  const selectedCount = sceneStates.filter(s => s.selected).length;
  const allMinted = sceneStates.every(s => s.phase === "success");

  const toggleSelect = (i: number) => {
    if (sceneStates[i].phase === "success") return;
    setSceneStates(prev => {
      const next = [...prev];
      next[i] = { ...next[i], selected: !next[i].selected };
      return next;
    });
  };

  const selectAll = () => {
    setSceneStates(prev => prev.map(s =>
      s.phase === "success" ? s : { ...s, selected: true }
    ));
  };

  const mintSelected = async () => {
    const phantom = getPhantom();
    if (!phantom) {
      alert("Install Phantom wallet from phantom.app");
      return;
    }

    setIsMintingAll(true);

    // Connect wallet once
    let publicKey: string;
    try {
      setSceneStates(prev => prev.map(s =>
        s.selected ? { ...s, phase: "connecting" as MintPhase } : s
      ));
      const resp = await phantom.connect();
      publicKey = resp.publicKey.toString();
    } catch (e) {
      setSceneStates(prev => prev.map(s =>
        s.selected ? { ...s, phase: "error", error: "Wallet connection failed" } : s
      ));
      setIsMintingAll(false);
      return;
    }

    // Mint each selected scene sequentially to avoid wallet overwhelm
    for (let i = 0; i < scenes.length; i++) {
      if (!sceneStates[i].selected || sceneStates[i].phase === "success") continue;

      setSceneStates(prev => {
        const next = [...prev];
        next[i] = { ...next[i], phase: "minting" };
        return next;
      });

      try {
        const res = await fetch("/api/mint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storyId,
            title: `${storyTitle} — Scene ${i + 1}`,
            genre,
            content: scenes[i].text.slice(0, 500),
            payerPublicKey: publicKey,
            sceneIndex: i,
            imageUrl: scenes[i].imageUrl,
          }),
        });

        const data = await res.json();
        if (!data.success || !data.serializedTransaction) {
          throw new Error(data.error || "Failed to build transaction");
        }

        setSceneStates(prev => {
          const next = [...prev];
          next[i] = { ...next[i], phase: "confirming" };
          return next;
        });

        const txBytes = Buffer.from(data.serializedTransaction, "base64");
        const transaction = Transaction.from(txBytes);
        const { signature } = await phantom.signAndSendTransaction(transaction);

        // Quick confirm (15s timeout)
        const connection = new Connection(SOLANA_RPC, { commitment: "confirmed" });
        try {
          await Promise.race([
            connection.confirmTransaction(signature, "confirmed"),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
          ]);
        } catch { /* timeout ok */ }

        setSceneStates(prev => {
          const next = [...prev];
          next[i] = { ...next[i], phase: "success", signature };
          return next;
        });

      } catch (e) {
        setSceneStates(prev => {
          const next = [...prev];
          next[i] = { ...next[i], phase: "error", error: (e as Error).message };
          return next;
        });
      }
    }

    setIsMintingAll(false);
  };

  if (scenes.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="surface p-5 mb-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Mint Scene NFTs</h3>
          <p className="text-[11px] text-[var(--text-quaternary)] mt-0.5">
            Select scenes to mint as individual NFTs on Solana devnet
          </p>
        </div>
        {selectedCount < scenes.length && !allMinted && (
          <button
            onClick={selectAll}
            className="text-[11px] text-[var(--accent)] hover:underline"
          >
            Select all
          </button>
        )}
      </div>

      {/* Scene grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {scenes.map((scene, i) => {
          const state = sceneStates[i];
          const isMinted = state.phase === "success";
          const isPending = state.phase === "minting" || state.phase === "confirming" || state.phase === "connecting";

          return (
            <motion.div
              key={i}
              whileTap={!isMinted && !isPending ? { scale: 0.97 } : {}}
              onClick={() => !isPending && toggleSelect(i)}
              className={`relative rounded-[10px] overflow-hidden border-2 transition-all duration-200 cursor-pointer ${
                isMinted
                  ? "border-[var(--mint)] opacity-80"
                  : state.phase === "error"
                  ? "border-red-500/40"
                  : state.selected
                  ? "border-[var(--accent)]"
                  : "border-[var(--border-default)] hover:border-[var(--border-hover)]"
              }`}
            >
              <div className="aspect-video bg-[var(--bg-elevated)]">
                {scene.imageUrl ? (
                  <img
                    src={scene.imageUrl}
                    alt={`Scene ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="spinner" />
                  </div>
                )}
              </div>

              {/* Overlay for state */}
              <AnimatePresence>
                {(state.selected || isMinted || isPending || state.phase === "error") && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      background: isMinted
                        ? "rgba(52,211,153,0.25)"
                        : state.phase === "error"
                        ? "rgba(239,68,68,0.2)"
                        : isPending
                        ? "rgba(0,0,0,0.6)"
                        : "rgba(var(--accent-rgb),0.15)",
                    }}
                  >
                    {isMinted && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                    {isPending && <div className="spinner" />}
                    {state.phase === "error" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                    )}
                    {state.selected && !isMinted && !isPending && state.phase !== "error" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scene label */}
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5" style={{ background: "rgba(0,0,0,0.75)" }}>
                <p className="text-[9px] font-mono text-white/70">SCENE {i + 1}</p>
                {isMinted && state.signature && (
                  <a
                    href={`https://explorer.solana.com/tx/${state.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-[8px] text-[var(--mint)] hover:underline block truncate"
                  >
                    {state.signature.slice(0, 12)}…
                  </a>
                )}
                {state.phase === "error" && (
                  <p className="text-[8px] text-red-400 truncate">{state.error}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mint button */}
      {!allMinted && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={mintSelected}
          disabled={selectedCount === 0 || isMintingAll}
          className={`w-full py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
            selectedCount === 0
              ? "bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-quaternary)] cursor-not-allowed"
              : isMintingAll
              ? "bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-quaternary)] cursor-wait"
              : "bg-[var(--accent)] text-white hover:opacity-90 cursor-pointer"
          }`}
        >
          {isMintingAll && <div className="spinner" />}
          {isMintingAll
            ? "Minting on Solana…"
            : selectedCount === 0
            ? "Select scenes to mint"
            : `Mint ${selectedCount} scene NFT${selectedCount > 1 ? "s" : ""} on Solana`
          }
        </motion.button>
      )}

      {allMinted && (
        <div className="flex items-center gap-2 justify-center py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span className="text-[13px] font-semibold text-[var(--mint)]">All scenes minted on Solana!</span>
        </div>
      )}

      <p className="text-[10px] text-[var(--text-quaternary)] mt-2 text-center">
        Requires{" "}
        <a href="https://phantom.app" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
          Phantom wallet
        </a>
        {" · "}
        <a href="https://faucet.solana.com/" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
          Get devnet SOL
        </a>
      </p>
    </motion.div>
  );
}
