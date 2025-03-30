import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { PublicKey, Transaction, type Connection } from "@solana/web3.js";

export const transferTokens = async (
  connection: Connection,
  payer: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  mintAddress: string,
  destinationWallet: string,
  amount: number,
) => {
  try {
    const mintPubkey = new PublicKey(mintAddress);
    let destinationPubkey: PublicKey;

    try {
      destinationPubkey = new PublicKey(destinationWallet);
    } catch (error) {
      throw new Error(
        "Invalid destination wallet address. Please check the address and try again.",
      );
    }

    const mintInfo = await getMint(connection, mintPubkey);

    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    const adjustedAmount = amount * Math.pow(10, mintInfo.decimals);
    if (adjustedAmount <= 0) {
      throw new Error("Amount must be greater than zero");
    }

    const sourceTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      payer,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    try {
      const sourceAccount = await getAccount(connection, sourceTokenAccount);
      if (Number(sourceAccount.amount) < adjustedAmount) {
        throw new Error(
          `Insufficient balance. You have ${Number(sourceAccount.amount) / Math.pow(10, mintInfo.decimals)} tokens, but trying to send ${amount} tokens.`,
        );
      }
    } catch (error) {
      console.error("Error checking source account:", error);
      throw new Error(
        "Could not find tokens in your wallet. Make sure you own this token.",
      );
    }

    const destinationTokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      destinationPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: payer,
    });

    let destinationAccountExists = true;
    try {
      await getAccount(connection, destinationTokenAccount);
    } catch (error) {
      destinationAccountExists = false;
    }

    if (!destinationAccountExists) {
      console.log("Destination token account does not exist, creating one...");
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer,
          destinationTokenAccount,
          destinationPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    transaction.add(
      createTransferInstruction(
        sourceTokenAccount,
        destinationTokenAccount,
        payer,
        BigInt(Math.floor(adjustedAmount)),
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    // Have the user sign and send the transaction
    console.log("Sending mint transaction...");
    const signedTransaction = await signTransaction(transaction);

    // Send the signed transaction to the network
    const signature = await connection.sendRawTransaction(
      signedTransaction.serialize(),
    );

    // Confirm transaction
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    return destinationTokenAccount.toString();
  } catch (error) {
    console.error("Error transferring tokens:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred during token transfer");
  }
};
