import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  type Connection,
} from "@solana/web3.js";

import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  getMint,
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
      mintKeypair.publicKey.toString(),
    );
    return mintKeypair.publicKey.toString();
  } catch (error) {
    console.error("Error creating token:", error);
    throw error;
  }
};

export const mintToken = async (
  connection: Connection,
  payer: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>,
  mintAddress: string,
  amount: number,
  destination?: PublicKey,
) => {
  try {
    const mintPubkey = new PublicKey(mintAddress);

    // Get mint info to determine decimals
    const mintInfo = await getMint(connection, mintPubkey);

    // Calculate the amount with decimals
    const adjustedAmount = amount * Math.pow(10, mintInfo.decimals);

    // Get the associated token account for the recipient (payer or specified destination)
    const tokenReceiver = destination ?? payer;
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintPubkey,
      payer,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    // Create transaction
    const transaction = new Transaction();

    // Check if token account exists
    let tokenAccountExists = false;
    try {
      await getAccount(connection, associatedTokenAddress);
      tokenAccountExists = true;
    } catch (error) {
      // Token account doesn't exist, we'll create it
      console.log("Token account doesn't exist, creating one...", error);
    }

    // If the token account doesn't exist, add instruction to create it
    if (!tokenAccountExists) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          payer,
          associatedTokenAddress,
          tokenReceiver,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        ),
      );
    }

    // Add mint-to instruction
    transaction.add(
      createMintToInstruction(
        mintPubkey,
        associatedTokenAddress,
        payer, // Mint authority must be the payer who created the token
        BigInt(adjustedAmount),
        [],
        TOKEN_PROGRAM_ID,
      ),
    );

    // Have the user sign and send the transaction
    console.log("Sending mint transaction...");
    await signTransaction(transaction);
    console.log("Mint transaction confirmed!");

    return associatedTokenAddress.toString();
  } catch (error) {
    console.error("Error minting token:", error);
    throw error;
  }
};
