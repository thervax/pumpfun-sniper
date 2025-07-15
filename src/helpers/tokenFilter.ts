import { bus } from "../utils/events";
import { buyFilter } from "../utils/buyFilter";
import { TokenData } from "../utils/types";

export class Filter {
  private testingEnabled = true;
  private testDone = false;

  constructor() {
    bus.on("token:new", this.onNewToken.bind(this));
  }

  private async onNewToken(tokenData: TokenData) {
    try {
      if (this.testingEnabled) {
        if (this.testDone) {
          return;
        }

        if (await buyFilter(tokenData)) {
          this.testDone = true;
          bus.emit("token:passedFilters", tokenData);
        }
      } else {
        if (await buyFilter(tokenData)) {
          bus.emit("token:passedFilters", tokenData);
        }
      }
    } catch (err) {
      console.log(`onNewToken error: ${err}`);
    }
  }
}
