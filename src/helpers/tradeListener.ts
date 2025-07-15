import WebSocket from "ws";
import { bus } from "../utils/events";

export interface TradeMessage {
  mint: string;
  solAmount: number;
  txType: "buy" | "sell";
}

export class TradeListener {
  private ws: WebSocket;

  constructor(private wsUrl = "wss://pumpportal.fun/api/data") {}

  start() {
    this.ws = new WebSocket(this.wsUrl);

    this.ws.on("open", () => {
      console.log("✅ WS connection opened");
    });

    this.ws.on("message", (data: WebSocket.Data) => this.handleMessage(data));
    this.ws.on("error", (err: Error) => console.error("WS error:", err.message));
  }

  subscribe(mint: string) {
    this.ws.send(JSON.stringify({ method: "subscribeTokenTrade", keys: [mint] }));
  }

  unsubscribe(mint: string) {
    this.ws.send(JSON.stringify({ method: "unsubscribeTokenTrade", keys: [mint] }));
  }

  private handleMessage(raw: WebSocket.Data) {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      console.error("WS parse error:", e);
      return;
    }

    if (msg.message) {
      return;
    }

    const trade: TradeMessage = {
      mint: msg.mint,
      solAmount: msg.solAmount,
      txType: msg.txType,
    };
    bus.emit("token:update", trade);
  }
}
