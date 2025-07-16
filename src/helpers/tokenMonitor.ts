import { bus } from "../utils/events";
import { Connection, PublicKey } from "@solana/web3.js";
import { TokenPosition } from "../utils/types";
import { TradeListener, TradeMessage } from "./tradeListener";

export class Monitor {
  private positions = new Map<string, TokenPosition>();
  private tradeListener: TradeListener;
  private intervalHandle: NodeJS.Timeout;

  constructor(private pollIntervalMs: number, private sellThreshold: number) {
    this.tradeListener = new TradeListener();
    this.tradeListener.start();

    bus.on("token:buySuccess", this.onBuySuccess.bind(this));
    bus.on("token:update", this.onTradeUpdate.bind(this));
    this.intervalHandle = setInterval(this.poll.bind(this), this.pollIntervalMs);
  }

  private onBuySuccess(pos: TokenPosition) {
    this.positions.set(pos.mint, pos);
    this.tradeListener.subscribe(pos.mint);
  }

  private onTradeUpdate(update: TradeMessage) {
    const pos = this.positions.get(update.mint);
    if (!pos) return;

    if (update.txType === "buy") {
      pos.accumulatedSol += update.solAmount;
      console.log(`📈 ${pos.name}: +${update.solAmount.toLocaleString()} => ${pos.accumulatedSol} SOL`);

      if (pos.accumulatedSol >= this.sellThreshold) {
        console.log(`💰 Selling ${pos.name} (${pos.mint}) for accumulated sol: (${pos.accumulatedSol}) SOL`);
        bus.emit("token:startSell", pos);
        this.tradeListener.unsubscribe(update.mint);
        this.positions.delete(update.mint);
      }
    }
    if (update.txType === "sell") {
      pos.accumulatedSol -= update.solAmount;
      console.log(`📈 ${pos.name}: -${update.solAmount.toLocaleString()} => ${pos.accumulatedSol} SOL`);
      if (pos.accumulatedSol <= -0.2) {
        console.log(`💰 Selling ${pos.name} (${pos.mint}) for lost sol: (${pos.accumulatedSol}) SOL`);
        bus.emit("token:startSell", pos);
        this.tradeListener.unsubscribe(update.mint);
        this.positions.delete(update.mint);
      }
    }
  }

  private async poll() {
    const now = Date.now();
    const tasks = Array.from(this.positions.values()).map(async (pos) => {
      const elapsed = now - pos.buyTime;

      if (elapsed >= 10 * 1000) {
        console.log(`⌚ [SELL] Selling ${pos.name} (${pos.mint}) for elapsed time`);
        bus.emit("token:startSell", pos);
        this.positions.delete(pos.mint);
        return;
      }
    });

    await Promise.allSettled(tasks);
  }
}
