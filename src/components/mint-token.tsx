"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mintToken } from "@/lib/tokens/mint";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Loader } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const MintToken = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [mintAddress, setMintAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [isMinting, setIsMinting] = useState(false);
  const [lastMintedTo, setLastMintedTo] = useState("");

  const handleMintToken = async () => {
    if (!publicKey || !signTransaction) {
      toast("Wallet not connected", {
        description: "Please connect your wallet to mint tokens.",
        className: "destructive-toast",
      });
      return;
    }

    if (!mintAddress || !amount) {
      toast("Missing information", {
        description: "Please enter a token address and amount to mint.",
        className: "destructive-toast",
      });
      return;
    }

    // Validate mint address
    let mintPublicKey;
    try {
      mintPublicKey = new PublicKey(mintAddress);
    } catch (error) {
      console.error(error);
      toast("Invalid mint address", {
        description: "The token address you entered is not valid.",
        className: "destructive-toast",
      });
      return;
    }

    let destination;
    if (destinationAddress) {
      try {
        destination = new PublicKey(destinationAddress);
      } catch (error) {
        console.error(error);
        toast("Invalid address", {
          description: "The destination address is not a valid Solana address.",
          className: "destructive-toast",
        });
        return;
      }
    }

    try {
      setIsMinting(true);
      console.log("Starting token mint process...");
      console.log("Mint address:", mintAddress);
      console.log("User wallet:", publicKey.toString());

      // Mint token
      const tokenAccount = await mintToken(
        connection,
        publicKey,
        signTransaction,
        mintAddress,
        parseFloat(amount),
        destination,
      );

      setLastMintedTo(tokenAccount);
      toast("Tokens minted!", {
        description: `Successfully minted ${amount} tokens to ${destination ? "the specified address" : "your wallet"}.`,
      });
    } catch (error) {
      console.error("Error minting token:", error);

      // Provide specific error message based on the error type
      let errorMessage =
        "There was an error minting your tokens. Please try again.";

      if (error instanceof Error) {
        if (error.message.includes("mint authority")) {
          errorMessage =
            "You are not the mint authority for this token. Only the creator of the token can mint additional tokens.";
        } else {
          errorMessage = error.message;
        }
      }

      toast("Minting failed", {
        description: errorMessage,
        className: "destructive-toast",
      });
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <Card className="bg-card w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-gradient text-2xl font-bold">
          Mint Tokens
        </CardTitle>
        <CardDescription>
          Mint tokens to your wallet or another address
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mintAddress">Token Address</Label>
          <Input
            id="mintAddress"
            placeholder="Enter token mint address"
            value={mintAddress}
            onChange={(e) => setMintAddress(e.target.value)}
            disabled={!publicKey || isMinting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter amount to mint"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!publicKey || isMinting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destinationAddress">
            Destination Address (Optional)
          </Label>
          <Input
            id="destinationAddress"
            placeholder="Leave empty to mint to your wallet"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            disabled={!publicKey || isMinting}
          />
          <p className="text-muted-foreground text-xs">
            If left empty, tokens will be minted to your connected wallet.
          </p>
        </div>

        <Alert className="bg-secondary/30 border-secondary">
          <AlertTitle>Important</AlertTitle>
          <AlertDescription>
            You can only mint tokens for which you are the mint authority
            (tokens you created).
          </AlertDescription>
        </Alert>

        {lastMintedTo && (
          <div className="bg-secondary/30 rounded-md border p-3">
            <p className="text-sm font-medium">Last minted to:</p>
            <p className="font-mono text-xs break-all">{lastMintedTo}</p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleMintToken}
          disabled={!publicKey || isMinting || !mintAddress || !amount}
          className="bg-solana-gradient w-full text-white hover:opacity-90"
        >
          {isMinting ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Minting...
            </>
          ) : (
            "Mint Tokens"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MintToken;
