import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { type Connection, type PublicKey } from "@solana/web3.js";

export interface Transaction {
  signature: string;
  timestamp: number;
  type: "mint" | "transfer" | "create";
  amount?: number;
  mintAddress: string;
  destination?: string;
  source?: string;
}

export const getRecentTransactions = async (
  connection: Connection,
  walletAddress: PublicKey,
  limit = 10,
) => {
  try {
    const signatures = await connection.getSignaturesForAddress(walletAddress, {
      limit,
    });

    if (!signatures.length) return [];

    const transactions: Transaction[] = [];
    for (const signatureInfo of signatures) {
      try {
        const txnDetails = await connection.getParsedTransaction(
          signatureInfo.signature,
        );

        if (!txnDetails?.meta || txnDetails.meta.err) continue;

        const instructions = txnDetails.transaction.message.instructions;
        const programIds = instructions.map((ix) => ix.programId.toBase58());

        if (programIds.includes(TOKEN_PROGRAM_ID.toBase58())) {
          transactions.push({
            signature: signatureInfo.signature,
            timestamp: signatureInfo.blockTime ?? Date.now() / 1000,
            type: "transfer",
            mintAddress: "Unknown",
          });
        }
      } catch (error) {
        console.error(
          `Error processing transaction ${signatureInfo.signature}:`,
          error,
        );
      }
    }

    return transactions;
  } catch (error) {
    console.error("Error fetching recent transactions:", error);
    return [];
  }
};
