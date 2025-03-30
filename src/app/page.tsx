"use client";

import CreateToken from "@/components/create-token";
import MintToken from "@/components/mint-token";
import SendToken from "@/components/send-token";
import TokenBalances from "@/components/token-balances";
import TransactionHistory from "@/components/transaction-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WalletConnect from "@/components/wallet-connect";
import WalletContextProvider from "@/providers/wallet-context-provider";

export default function HomePage() {
  return (
    <WalletContextProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-10 text-center">
            <h1 className="text-gradient mb-4 text-4xl font-bold sm:text-6xl">
              Token Blossom
            </h1>
            <p className="text-muted-foreground mx-auto max-w-xl text-lg">
              Create, mint, and manage your SPL tokens on the Solana blockchain
            </p>
          </header>

          <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2" suppressHydrationWarning>
            <div className="space-y-6">
              <WalletConnect />
              <TokenBalances />
              <TransactionHistory />
            </div>
            <div className="space-y-6">
              <Tabs defaultValue="create">
                <TabsList className="mb-4 grid grid-cols-3">
                  <TabsTrigger value="create">Create</TabsTrigger>
                  <TabsTrigger value="mint">Mint</TabsTrigger>
                  <TabsTrigger value="send">Send</TabsTrigger>
                </TabsList>
                <TabsContent value="create">
                  <CreateToken />
                </TabsContent>
                <TabsContent value="mint">
                  <MintToken />
                </TabsContent>
                <TabsContent value="send">
                  <SendToken />
                </TabsContent>
              </Tabs>
            </div>
          </main>

          <footer className="text-muted-foreground mt-12 text-center text-sm">
            <p>Built on Solana Devnet. Connect your wallet to get started.</p>
          </footer>
        </div>
      </div>
    </WalletContextProvider>
  );
}
