import { bus } from "../utils/events";
import { Connection, PublicKey } from "@solana/web3.js";
import { TokenPosition } from "../utils/types";

export class Monitor {
  private positions = new Map<string, TokenPosition>();
  private intervalHandle: NodeJS.Timeout;

  constructor(private connection: Connection, private pollIntervalMs: number = 1000) {
    bus.on("token:buySuccess", this.onBuySuccess.bind(this));
    this.intervalHandle = setInterval(this.poll.bind(this), this.pollIntervalMs);
  }

  private onBuySuccess(pos: TokenPosition) {
    const key = pos.mint;
    this.positions.set(key, pos);
  }

  private async poll() {
    const now = Date.now();
    const tasks = Array.from(this.positions.values()).map(async (pos) => {
      const elapsed = now - pos.buyTime;

      if (elapsed >= 15 * 1000) {
        console.log(`⌚ [SELL] Selling ${pos.name} (${pos.mint}) for elapsed time`);
        bus.emit("token:startSell", pos);
        this.positions.delete(pos.mint);
        return;
      }

      // const price = await getTokenPrice(pos.mint);
      // if (!price) {
      //   return;
      // }
      // const gain = ((price - pos.buyPrice) / pos.buyPrice) * 100;
      // pos.gain = gain;
      // pos.currentPrice = price;

      // if (gain > 20) {
      //   console.log(`[SELL] Selling ${pos.name} (${pos.mint}) for price gain`);
      //   bus.emit("token:startSell", pos);
      //   this.positions.delete(pos.mint);
      //   return;
      // }
    });

    await Promise.allSettled(tasks);
  }
}
