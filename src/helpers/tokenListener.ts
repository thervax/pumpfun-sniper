import WebSocket from "ws";
import { bus } from "../utils/events";
import { TokenData } from "../utils/types";
import { PublicKey } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

export class Listener {
  private ws: WebSocket;

  start() {
    this.ws = new WebSocket("wss://pumpportal.fun/api/data");

    this.ws.on("open", () => {
      this.ws.send(JSON.stringify({ method: "subscribeNewToken" }));
      console.log("✅ Portal subscription sent");
    });

    this.ws.on("message", async (data: WebSocket.Data) => {
      try {
        const parsed = JSON.parse(data.toString());

        if (parsed.message) {
          console.log("✅ Portal subscription confirmed");
          return;
        }

        const [assoc_bonding_addr] = PublicKey.findProgramAddressSync(
          [
            new PublicKey(parsed.bondingCurveKey).toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            new PublicKey(parsed.mint).toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const tokenInfo: TokenData = {
          mint: parsed.mint,
          name: parsed.name,
          symbol: parsed.symbol,
          creator: parsed.traderPublicKey,
          initialSolBuy: parsed.solAmount,
          tokensInBC: parsed.vTokensInBondingCurve,
          solInBC: parsed.vSolInBondingCurve,
          bondingCurve: parsed.bondingCurveKey,
          bondingCurveAta: assoc_bonding_addr.toString(),
          uri: parsed.uri,
          decimals: 6,
          detectionTime: Date.now(),
        };
        bus.emit("token:new", tokenInfo);
      } catch (err) {
        console.error("💥 Error processing Portal message:", err);
      }
    });

    this.ws.on("error", (err: Error) => {
      console.error("Portal WebSocket error:", err.message);
    });
  }
}
