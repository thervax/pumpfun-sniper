import "dotenv/config";

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Listener } from "./helpers/tokenListener";
import { Filter } from "./helpers/tokenFilter";
import { Buyer } from "./helpers/tokenBuyer";
import bs58 from "bs58";
import "./helpers/authManager";
import { Monitor } from "./helpers/tokenMonitor";
import { Seller } from "./helpers/tokenSeller";
import { ConnectionWarmer } from "./helpers/connectionWarmer";
import { sleep } from "./utils/utils";
import { authManager } from "./helpers/authManager";

async function main() {
  const connection = new Connection(process.env.RPC_URL!);
  const wallet = Keypair.fromSecretKey(bs58.decode(process.env.PRIVATE_KEY!));

  const listener = new Listener();
  listener.start();
  const filter = new Filter();
  const buyer = new Buyer(connection, wallet);
  const monitor = new Monitor(connection);
  const seller = new Seller(connection, wallet);
  const connectionWarmer = new ConnectionWarmer(connection, 3 * 1000);
}

main();
