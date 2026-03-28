import { buildMintTransaction, hashContent, getExplorerUrl } from "@/lib/solana";
import { updateStory } from "@/lib/mongodb";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { storyId, title, genre, content, payerPublicKey, action, signature } = await req.json();

    // Phase 2: Record confirmed transaction signature in MongoDB
    if (action === "confirm" && signature) {
      const explorerUrl = getExplorerUrl(signature);
      if (storyId && storyId !== "undefined" && storyId !== "") {
        try {
          await updateStory(storyId, {
            nftMint: signature,
            nftExplorerUrl: explorerUrl,
          });
        } catch {
          // Story might not be saved yet
        }
      }
      return Response.json({ success: true, explorerUrl });
    }

    // Phase 1: Build and return serialized transaction for client signing
    if (!title || !content || !payerPublicKey) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const contentHash = hashContent(content);

    const { serializedTransaction } = await buildMintTransaction(
      {
        title,
        genre: genre || "unknown",
        contentHash,
        createdAt: new Date().toISOString(),
      },
      payerPublicKey
    );

    return Response.json({
      success: true,
      serializedTransaction,
      contentHash,
      metadata: {
        type: "Lore Story NFT",
        title,
        genre,
        contentHash,
        platform: "Lore - Glitch 2026",
        payer: payerPublicKey,
      },
    });
  } catch (error) {
    console.error("Mint error:", error);
    return Response.json({ error: "Minting failed" }, { status: 500 });
  }
}
