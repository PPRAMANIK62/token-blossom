"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transferTokens } from "@/lib/tokens/transfer";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Loader, Send } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

const SendToken = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [mintAddress, setMintAddress] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSendToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !signTransaction) {
      toast("Wallet not connected", {
        description: "Please connect your wallet first",
        className: "destructive-toast",
      });
      return;
    }

    if (!mintAddress || !recipientAddress || !amount) {
      toast("Missing information", {
        description: "Please fill in all fields",
        className: "destructive-toast",
      });
      return;
    }

    try {
      setIsSending(true);
      setSuccess(false);
      console.log("Starting token transfer process...");
      console.log("Mint address:", mintAddress);
      console.log("Recipient address:", recipientAddress);
      console.log("Amount:", amount);

      const destinationTokenAccount = await transferTokens(
        connection,
        publicKey,
        signTransaction,
        mintAddress,
        recipientAddress,
        parseFloat(amount),
      );

      console.log(
        "Token transfer successful! Destination token account:",
        destinationTokenAccount,
      );

      setSuccess(true);
      toast("Tokens sent successfully", {
        description: `${amount} tokens sent to ${recipientAddress.slice(0, 4)}...${recipientAddress.slice(-4)}`,
      });

      // Reset form after successful transfer
      setAmount("");
    } catch (error) {
      console.error("Token transfer error:", error);
      let errorMessage =
        "There was an error sending your tokens. Please try again.";

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast("Error sending tokens", {
        description: errorMessage,
        className: "destructive-toast",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="bg-card w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-gradient text-2xl font-bold">
          Send Tokens
        </CardTitle>
        <CardDescription>Transfer tokens to another wallet</CardDescription>
      </CardHeader>
      <CardContent>
        {!publicKey ? (
          <Alert>
            <AlertDescription>
              Connect your wallet to send tokens
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSendToken} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mintAddress">Token Mint Address</Label>
              <Input
                id="mintAddress"
                placeholder="Enter token mint address"
                value={mintAddress}
                onChange={(e) => setMintAddress(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientAddress">Recipient Wallet Address</Label>
              <Input
                id="recipientAddress"
                placeholder="Enter recipient's wallet address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Amount to send"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="bg-solana-gradient w-full text-white hover:opacity-90"
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Sending Tokens...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Tokens
                </>
              )}
            </Button>

            {success && (
              <Alert>
                <AlertDescription className="text-green-500">
                  Tokens sent successfully!
                </AlertDescription>
              </Alert>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default SendToken;
