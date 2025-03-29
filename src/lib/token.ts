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
      mintKeypair.publicKey.toBase58(),
    );
    return mintKeypair.publicKey.toBase58();
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

    // Get mint info to determine decimals and mint authority
    const mintInfo = await getMint(connection, mintPubkey);

    // Verify that the payer is the mint authority
    if (!mintInfo.mintAuthority?.equals(payer)) {
      throw new Error(
        "You are not the mint authority for this token. Only the mint authority can mint new tokens.",
      );
    }

    // Calculate the amount with decimals
    const adjustedAmount = amount * Math.pow(10, mintInfo.decimals);

    // Get the associated token account for the recipient (payer or specified destination)
    const tokenReceiver = destination ?? payer;
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintPubkey,
      tokenReceiver,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    );

    // Fetch recent blockhash
    const { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash();

    // Create transaction
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: payer,
    });

    // Check if token account exists
    let tokenAccountExists = true;
    try {
      await getAccount(connection, associatedTokenAddress);
    } catch (error) {
      // Token account doesn't exist, we'll create it
      console.log("Token account doesn't exist, creating one...", error);
      tokenAccountExists = false;
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
    console.log("Mint transaction confirmed!");

    return associatedTokenAddress.toBase58();
  } catch (error) {
    console.error("Error minting token:", error);
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("TokenInvalidAccountOwner")) {
        throw new Error(
          "TokenInvalidAccountOwnerError: You don't have permission to mint this token. Make sure you are using the correct wallet that created this token.",
        );
      } else if (error.message.includes("TokenInvalidMint")) {
        throw new Error(
          "Invalid token mint address. Please check the address and try again.",
        );
      } else if (error.message.includes("TokenAccountNotFound")) {
        throw new Error(
          "Token account not found. There might be an issue with the associated token account.",
        );
      }
    }
    throw error;
  }
};
