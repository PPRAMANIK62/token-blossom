/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  type ConfirmedSignatureInfo,
  type Connection,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
  type PublicKey,
} from "@solana/web3.js";

export interface Transaction {
  signature: string;
  timestamp: number;
  type: "mint" | "transfer" | "create";
  amount?: number;
  mintAddress: string;
  destination?: string;
  source?: string;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to check if an instruction is ParsedInstruction (type guard)
const isParsedInstruction = (
  instruction: ParsedInstruction | PartiallyDecodedInstruction,
): instruction is ParsedInstruction => {
  return "parsed" in instruction;
};

export const getRecentTransactions = async (
  connection: Connection,
  walletAddress: PublicKey,
  limit = 10,
) => {
  try {
    // Get signatures for address with rate limiting and retries
    const signatures = await fetchSignaturesWithRetry(
      connection,
      walletAddress,
      limit,
    );

    if (!signatures || signatures.length === 0) {
      console.log("No signatures found for wallet");
      return [];
    }

    console.log(
      `Found ${signatures.length} signatures, processing transactions...`,
    );

    const transactions: Transaction[] = [];

    // Process signatures with a delay between requests to avoid rate limits
    // Process signatures with a delay between requests to avoid rate limits
    for (const signatureInfo of signatures) {
      try {
        // Add delay between requests to avoid rate limits
        await delay(300);

        console.log(`Processing transaction: ${signatureInfo.signature}`);
        const transaction = await processTransaction(connection, signatureInfo);

        if (transaction) {
          transactions.push(transaction);
        }
      } catch (error) {
        console.error(
          `Error processing transaction ${signatureInfo.signature}:`,
          error,
        );
      }
    }

    console.log(`Successfully processed ${transactions.length} transactions`);
    return transactions;
  } catch (error) {
    console.error("Error fetching recent transactions:");
    throw error;
  }
};

// Helper function to fetch signatures with retry logic
const fetchSignaturesWithRetry = async (
  connection: Connection,
  walletAddress: PublicKey,
  limit: number,
) => {
  let retries = 0;
  const maxRetries = 5;
  let retryDelay = 1500; // Start with 1.5 second delay

  while (retries <= maxRetries) {
    try {
      console.log(
        `Attempting to fetch signatures (attempt ${retries + 1}/${maxRetries + 1})`,
      );

      // Fetch signatures
      const signatures = await connection.getSignaturesForAddress(
        walletAddress,
        { limit },
      );

      console.log(`Successfully fetched ${signatures.length} signatures`);
      return signatures;
    } catch (error) {
      console.error(
        `Error fetching signatures (attempt ${retries + 1}/${maxRetries + 1}):`,
        error,
      );

      if (retries === maxRetries) {
        console.error("Max retries reached, giving up");
        throw new Error(
          "Failed to fetch transaction signatures after multiple attempts",
        );
      }

      // Check if it's a rate limit error
      const isRateLimit =
        error instanceof Error &&
        (error.message?.includes("429") ??
          false ??
          error.name === "TimeoutError" ??
          false ??
          error.message?.includes("too many requests") ??
          false);

      if (!isRateLimit) {
        throw error; // Rethrow if not a rate limit error
      }

      console.log(`Rate limit hit. Retrying after ${retryDelay}ms delay...`);
      await delay(retryDelay);

      // Exponential backoff with jitter
      retryDelay = retryDelay * 1.5 + Math.random() * 500;
      retries++;
    }
  }

  // This should never be reached due to the throw in the loop
  return [];
};

// Helper function to process a single transaction
const processTransaction = async (
  connection: Connection,
  signatureInfo: ConfirmedSignatureInfo,
) => {
  try {
    // Get parsed transaction details
    const txDetails = await connection.getParsedTransaction(
      signatureInfo.signature,
      { maxSupportedTransactionVersion: 0 },
    );

    if (!txDetails?.meta || txDetails.meta.err) {
      return null;
    }

    const instructions = txDetails.transaction.message.instructions;
    const programIds = instructions.map((ix) => ix.programId?.toString());

    let txType: "mint" | "transfer" | "create" = "transfer";
    let mintAddress = "Unknown";

    if (programIds.includes(TOKEN_PROGRAM_ID.toString())) {
      // Check for mint instruction
      const mintInstruction = instructions.find(
        (ix) => isParsedInstruction(ix) && ix.parsed?.type === "mintTo",
      );

      if (mintInstruction && isParsedInstruction(mintInstruction)) {
        txType = "mint";
        mintAddress = mintInstruction.parsed.info?.mint ?? "Unknown";
      } else {
        // Check for transfer instruction
        const transferInstruction = instructions.find(
          (ix) => isParsedInstruction(ix) && ix.parsed?.type === "transfer",
        );

        if (transferInstruction && isParsedInstruction(transferInstruction)) {
          txType = "transfer";
          mintAddress = transferInstruction.parsed.info?.mint ?? "Unknown";
        } else {
          // Check for create token instruction
          const createInstruction = instructions.find(
            (ix) =>
              isParsedInstruction(ix) && ix.parsed?.type === "initializeMint",
          );

          if (createInstruction && isParsedInstruction(createInstruction)) {
            txType = "create";
            mintAddress = createInstruction.parsed.info?.mint ?? "Unknown";
          }
        }
      }
    }

    return {
      signature: signatureInfo.signature,
      timestamp: signatureInfo.blockTime ?? Math.floor(Date.now() / 1000),
      type: txType,
      mintAddress: mintAddress,
    };
  } catch (error) {
    console.error(
      `Error processing transaction ${signatureInfo.signature}:`,
      error,
    );
    return null;
  }
};
