"use client";

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
import { createToken } from "@/lib/tokens/create";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Loader, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CreateToken = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [decimals, setDecimals] = useState("9");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateToken = async () => {
    if (!publicKey || !signTransaction) {
      toast("Wallet not connected", {
        description: "Please connect your wallet to create tokens.",
        className: "destructive-toast",
      });
      return;
    }

    if (!tokenName || !tokenSymbol || !decimals) {
      toast("Missing information", {
        description: "Please fill in all fields to create your token.",
        className: "destructive-toast",
      });
      return;
    }

    try {
      setIsCreating(true);

      // Create the token
      const mintAddress = await createToken(
        connection,
        publicKey,
        signTransaction,
        parseInt(decimals),
      );

      setTokenAddress(mintAddress);
      toast("Token created!", {
        description: `Your token ${tokenSymbol} has been created successfully.`,
      });
    } catch (error) {
      console.error("Error creating token:", error);
      toast("Token creation failed", {
        description:
          error instanceof Error
            ? error.message
            : "There was an error creating your token. Please try again.",
        className: "destructive-toast",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setTokenName("");
    setTokenSymbol("");
    setDecimals("9");
    setTokenAddress("");
  };

  return (
    <Card className="bg-card w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-gradient text-2xl font-bold">
          Create Token
        </CardTitle>
        <CardDescription>
          Create your own SPL token on Solana devnet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tokenName">Token Name</Label>
          <Input
            id="tokenName"
            placeholder="e.g. My Token"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            disabled={!publicKey || isCreating}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tokenSymbol">Token Symbol</Label>
          <Input
            id="tokenSymbol"
            placeholder="e.g. MTK"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value)}
            disabled={!publicKey || isCreating}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="decimals">Decimals</Label>
          <Input
            id="decimals"
            type="number"
            placeholder="9"
            value={decimals}
            onChange={(e) => setDecimals(e.target.value)}
            disabled={!publicKey || isCreating}
          />
          <p className="text-muted-foreground text-xs">
            Most tokens use 9 decimals. More decimals allow for smaller
            fractions.
          </p>
        </div>

        {tokenAddress && (
          <div className="bg-secondary/30 rounded-md border p-3">
            <p className="text-sm font-medium">Token Address:</p>
            <p className="font-mono text-xs break-all">{tokenAddress}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        {tokenAddress ? (
          <Button
            variant="outline"
            onClick={resetForm}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Create Another
          </Button>
        ) : (
          <Button
            onClick={handleCreateToken}
            disabled={
              !publicKey ||
              isCreating ||
              !tokenName ||
              !tokenSymbol ||
              !decimals
            }
            className="bg-solana-gradient w-full text-white hover:opacity-90"
          >
            {isCreating ? (
              <>
                <Loader className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Token"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default CreateToken;
