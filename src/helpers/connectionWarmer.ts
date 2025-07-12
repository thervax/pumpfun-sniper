import { Connection } from "@solana/web3.js";

export class ConnectionWarmer {
  private connection: Connection;

  constructor(connection: Connection, warmupIntervalMs: number) {
    this.connection = connection;
    this.warmConnection();
    const warmupTimer = setInterval(async () => {
      try {
        await this.warmConnection();
      } catch (err) {
        console.log(`[ERROR] ConnectionWarmer error: ${err}`);
      }
    }, warmupIntervalMs);
  }

  private async warmConnection() {
    await this.connection.getLatestBlockhash();
  }
}
