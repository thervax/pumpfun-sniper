import "dotenv/config";

import { Connection, Keypair } from "@solana/web3.js";
import { Filter } from "./helpers/tokenFilter";
import { Buyer } from "./helpers/tokenBuyer";
import bs58 from "bs58";
import "./helpers/authManager";
import { Monitor } from "./helpers/tokenMonitor";
import { Seller } from "./helpers/tokenSeller";
import { connectionManager } from "./helpers/connectionManager.ts";
import { gRPCListener } from "./helpers/grpcListener.ts";

async function main() {
  const connection = new Connection(process.env.RPC_URL!);
  const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

  const listener = new gRPCListener(process.env.GRPC_URL!, process.env.GRPC_API_KEY!);
  listener.start();
  const filter = new Filter();
  const buyer = new Buyer(connection, wallet);
  const monitor = new Monitor(1000, 1.5);
  const seller = new Seller(connection, wallet);
}

main();
