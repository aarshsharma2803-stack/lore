import { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

export function getConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

// Build a Memo Program transaction with story metadata stored on-chain
// Returns serialized transaction bytes (base64) for client-side Phantom signing
export async function buildMintTransaction(
  storyData: {
    title: string;
    genre: string;
    contentHash: string;
    createdAt: string;
  },
  payerPublicKey: string
): Promise<{ serializedTransaction: string }> {
  const connection = getConnection();
  const payer = new PublicKey(payerPublicKey);

  const transaction = new Transaction();

  // Memo Program — stores arbitrary data on-chain
  const memoProgram = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

  const metadata = JSON.stringify({
    type: "Lore Story NFT",
    title: storyData.title,
    genre: storyData.genre,
    contentHash: storyData.contentHash,
    createdAt: storyData.createdAt,
    platform: "Lore - Glitch 2026",
  });

  transaction.add({
    keys: [{ pubkey: payer, isSigner: true, isWritable: true }],
    programId: memoProgram,
    data: Buffer.from(metadata),
  });

  // Get recent blockhash for transaction validity
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  // Serialize without signatures — client will sign with Phantom
  const serialized = transaction.serialize({ requireAllSignatures: false });

  return {
    serializedTransaction: Buffer.from(serialized).toString("base64"),
  };
}

export function getExplorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

// Create a simple hash of story content for on-chain reference
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
