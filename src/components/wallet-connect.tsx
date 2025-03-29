import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const WalletConnect = () => {
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
    </Card>
  );
};

export default WalletConnect;
