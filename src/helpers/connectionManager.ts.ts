import { Connection } from "@solana/web3.js";
import axios from "axios";
import { request } from "undici";

export class ConnectionManager {
  private connection: Connection;
  private latestBlockhash: string;
  private zeroSlotUrl: string;

  constructor(connection: Connection, blockhashIntervalMs: number, zeroSlotUrl: string, zeroSlotInterval: number) {
    this.connection = connection;
    this.warmConnection();
    this.warmZeroSlotConnection();
    const warmupTimer = setInterval(async () => {
      try {
        await this.warmConnection();
      } catch (err) {
        console.log(`[ERROR] ConnectionWarmer error: ${err}`);
      }
    }, blockhashIntervalMs);

    const zeroSlotTimer = setInterval(async () => {
      try {
        await this.warmZeroSlotConnection();
      } catch (err) {
        console.log(`[ERROR] ZeroSlotConnectionWarmer error: ${err}`);
      }
    }, zeroSlotInterval);
  }

  public getBlockhash() {
    return this.latestBlockhash;
  }

  private async warmConnection() {
    this.latestBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
  }

  private async warmZeroSlotConnection() {
    try {
      await request(this.zeroSlotUrl);
    } catch {}
  }
}

export const connectionManager = new ConnectionManager(
  new Connection(process.env.RPC_URL!),
  5000,
  process.env.ZEROSLOT_PRC_URL!,
  15 * 1000
);
