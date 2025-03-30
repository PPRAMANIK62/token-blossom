import {
  Keypair,
  SystemProgram,
  Transaction,
  type Connection,
  type PublicKey,
} from "@solana/web3.js";

import {
  createInitializeMintInstruction,
  getMinimumBalanceForRentExemptMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const createToken = async (
  connection: Connection,
  payer: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  decimals: number,
  freezeAuthority?: PublicKey,
) => {
  try {
    // Generate a new keypair for the mint
    const mintKeypair = Keypair.generate();
    const mintAuthority = payer;

    // Calculate the lamports required for rent exemption
    const lamports = await getMinimumBalanceForRentExemptMint(connection);

    // Fetch recent blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    // Create a transaction and set the recent blockhash and payer
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: payer,
    });

    // Add instruction to create account for the mint
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mintKeypair.publicKey,
        space: 82, // space required for a mint
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
    );

    // Add instruction to initialize the mint
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        decimals,
        mintAuthority,
        freezeAuthority ?? mintAuthority,
        TOKEN_PROGRAM_ID,
      ),
    );

    // Partially sign the transaction with the mint keypair
    transaction.partialSign(mintKeypair);

    // Have the user sign the transaction
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

    console.log(
      "Token created with address:",
      mintKeypair.publicKey.toBase58(),
    );
    return mintKeypair.publicKey.toBase58();
  } catch (error) {
    console.error("Error creating token:", error);
    throw error;
  }
};
