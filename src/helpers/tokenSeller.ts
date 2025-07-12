import { bus } from "../utils/events";
import { Connection, Keypair } from "@solana/web3.js";
import { TokenPosition, TokenHistory } from "../utils/types";
import { sellPumpFunToken } from "../utils/solanaUtils";
import { appendHistory, sleep } from "../utils/utils";
import { positionManager as posManager } from "./posManager";
import { closeTokenAccount } from "../utils/solanaUtils";

export class Seller {
  constructor(private connection: Connection, private wallet: Keypair) {
    bus.on("token:startSell", this.onStartSell.bind(this));
  }

  private async onStartSell(pos: TokenPosition) {
    try {
      let tokenHistory: TokenHistory | null = null;
      for (let i = 1; i < 4; i++) {
        console.log(`🎯 [SELL] Attempt ${i} of selling ${pos.name} (${pos.mint})`);
        const result = await sellPumpFunToken(pos, 100, 50, this.connection, this.wallet);

        if (result) {
          tokenHistory = result;
          break;
        }
        sleep(2 * 1000);
      }

      if (!tokenHistory) {
        console.log(`❌ [ERROR] FAILED TO SELL ${pos.name} (${pos.mint})`);
        return;
      }

      const closeSignature = await closeTokenAccount(tokenHistory.mint, this.connection, this.wallet);
      if (closeSignature) {
        console.log(`✅ [MONITOR] Closed token account for mint ${tokenHistory.mint}: ${closeSignature}`);
      }

      posManager.remove(tokenHistory.mint);
      await appendHistory(tokenHistory);
      bus.emit("token:sellSuccess", tokenHistory);
    } catch (err) {
      console.log(`onStartSell error: ${err}`);
    }
  }
}
