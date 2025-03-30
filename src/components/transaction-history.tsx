"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Transaction as TokenTransaction } from "@/lib/tokens/transaction";
import { getRecentTransactions } from "@/lib/tokens/transaction";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Loader, RefreshCw, Table } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const TransactionHistory = () => {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTransactions = async () => {
    if (!publicKey) return;

    try {
      setIsLoading(true);
      const txnHistory = await getRecentTransactions(connection, publicKey);
      setTransactions(txnHistory);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast("Error fetching transactions", {
        description:
          "Could not fetch your transaction history. Please try again.",
        className: "destructive-toast",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (publicKey) {
      void fetchTransactions();
    } else {
      setTransactions([]);
    }
  }, [publicKey, connection]);

  const formatAddress = (address: string) => {
    if (!address || address === "Unknown") return "Unknown";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "mint":
        return "Mint";
      case "transfer":
        return "Transfer";
      case "create":
        return "Create Token";
      default:
        return "Transaction";
    }
  };

  return (
    <Card className="bg-card w-full shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-gradient text-2xl font-bold">
            Transaction History
          </CardTitle>
          <CardDescription>Your recent token transactions</CardDescription>
        </div>
        {publicKey && (
          <Button
            variant="outline"
            size="icon"
            onClick={fetchTransactions}
            disabled={isLoading}
            className="ml-auto h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : !publicKey ? (
          <p className="text-muted-foreground py-6 text-center">
            Connect your wallet to view transaction history
          </p>
        ) : transactions.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center">
            No transactions found
          </p>
        ) : (
          <Table>
            <TableCaption>Your recent transactions</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Token</TableHead>
                <TableHead className="text-right">Signature</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {getTypeLabel(tx.type)}
                  </TableCell>
                  <TableCell>{formatTimestamp(tx.timestamp)}</TableCell>
                  <TableCell>{formatAddress(tx.mintAddress)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    <a
                      href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {tx.signature.slice(0, 8)}...
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;
