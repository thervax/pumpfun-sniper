import { Connection, Keypair } from "@solana/web3.js";
import { bus } from "../utils/events";
import { TokenData } from "../utils/types";
import { positionManager as posManager } from "./posManager";
import { buyPumpFunToken } from "../utils/solanaUtils";

export class Buyer {
  constructor(private connection: Connection, private wallet: Keypair) {
    bus.on("token:passedFilters", this.onPassedToken.bind(this));
  }

  private async onPassedToken(tokenData: TokenData) {
    if (!posManager.canOpen()) {
      // console.log(
      //   `[WARN] Max positions reached (${posManager.count()}), skipping ${tokenData.name} (${tokenData.mint})`
      // );
      return;
    }
    if (posManager.isProcessing()) {
      // console.log(`[WARN] Already processing token, skipping ${tokenData.name} (${tokenData.mint})`);
      return;
    }

    posManager.setProcessing(true);

    try {
      const position = await buyPumpFunToken(tokenData, 0.1, 5, this.connection, this.wallet);
      posManager.setProcessing(false);
      if (!position) {
        return;
      }

      posManager.add(position);
      bus.emit("token:buySuccess", position);
    } catch (err) {
      console.log(`onPassedToken error: ${err}`);
    }
  }
}
