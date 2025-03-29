import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Copy, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const WalletConnect = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { publicKey } = wallet;
  const disconnect = wallet.disconnect.bind(wallet);

  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const getBalance = async () => {
      if (!publicKey || !isMounted) return;

      try {
        setIsLoading(true);
        const balance = await connection.getBalance(publicKey);
        if (isMounted) setBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error("Error fetching balance:", error);
        if (isMounted) {
          toast("Error fetching balance", {
            description: "Could not fetch your balance. Please try again.",
            className: "destructive-toast",
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (publicKey) {
      void getBalance();
    } else {
      setBalance(null);
      setIsLoading(false);
    }

    // Account change listener setup
    let accountChangeListener: number | undefined;

    const setupListener = async () => {
      if (!publicKey || !connection) return;

      try {
        // Remove any existing listener first to prevent duplicates
        if (accountChangeListener !== undefined) {
          await connection.removeAccountChangeListener(accountChangeListener);
        }

        // Setup new listener
        accountChangeListener = connection.onAccountChange(
          publicKey,
          () => {
            if (isMounted) void getBalance();
          },
          "confirmed",
        );

        console.log(
          "Account change listener set up successfully:",
          accountChangeListener,
        );
      } catch (error) {
        console.error("Error in account change listener setup:", error);
      }
    };

    // Setup the listener after a small delay to ensure connection is ready
    const timeoutId = setTimeout(() => {
      if (publicKey && connection) {
        void setupListener();
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);

      // Clean up listener on unmount
      if (accountChangeListener !== undefined) {
        try {
          connection
            .removeAccountChangeListener(accountChangeListener)
            .catch((error) =>
              console.error(
                "Error removing account listener on cleanup:",
                error,
              ),
            );
        } catch (error) {
          console.error("Exception during listener cleanup:", error);
        }
      }
    };
  }, [publicKey, connection]);

  const copyAddress = async () => {
    if (publicKey) {
      await navigator.clipboard.writeText(publicKey.toString());
      toast("Address copied", {
        description: "Wallet address copied to clipboard",
      });
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = () => {
    void disconnect();
    toast("Wallet disconnected", {
      description: "Your wallet has been disconnected",
    });
  };

  return (
    <Card className="bg-card w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-gradient text-2xl font-bold">
          Wallet
        </CardTitle>
        <CardDescription>
          Connect your Solana wallet to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!publicKey ? (
          <div className="flex flex-col items-center justify-center py-6">
            <p className="text-muted-foreground mb-4 text-center">
              Connect your wallet to create and mint tokens
            </p>
            <WalletMultiButton className="bg-solana-gradient text-white hover:opacity-90" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-secondary/30 flex items-center justify-between rounded-md border p-3">
              <p className="font-mono">{formatAddress(publicKey.toString())}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyAddress}
                className="h-8 w-8"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-secondary/30 flex items-center justify-between rounded-md border p-3">
              <p>SOL Balance:</p>
              <div className="flex items-center">
                {isLoading ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <span
                    className={cn(
                      "text-primary font-bold",
                      !balance && "text-muted-foreground",
                    )}
                  >
                    {balance !== null ? balance.toFixed(4) : "0"} SOL
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
      {publicKey && (
        <CardFooter className="flex justify-between">
          <p className="text-muted-foreground text-sm">
            Connected: {wallet.wallet?.adapter.name}
          </p>
          <Button
            variant="outline"
            onClick={handleDisconnect}
            className="text-sm"
          >
            Disconnect
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default WalletConnect;
