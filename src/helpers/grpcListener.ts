import Client, {
  CommitmentLevel,
  SubscribeRequestAccountsDataSlice,
  SubscribeRequestFilterAccounts,
  SubscribeRequestFilterBlocks,
  SubscribeRequestFilterBlocksMeta,
  SubscribeRequestFilterEntry,
  SubscribeRequestFilterSlots,
  SubscribeRequestFilterTransactions,
} from "@triton-one/yellowstone-grpc";
import { bus } from "../utils/events";
import { decodeTransaction } from "../utils/geyserUtils";

interface SubscribeRequest {
  accounts: { [key: string]: SubscribeRequestFilterAccounts };
  slots: { [key: string]: SubscribeRequestFilterSlots };
  transactions: { [key: string]: SubscribeRequestFilterTransactions };
  transactionsStatus: { [key: string]: SubscribeRequestFilterTransactions };
  blocks: { [key: string]: SubscribeRequestFilterBlocks };
  blocksMeta: { [key: string]: SubscribeRequestFilterBlocksMeta };
  entry: { [key: string]: SubscribeRequestFilterEntry };
  commitment?: CommitmentLevel | undefined;
  accountsDataSlice: SubscribeRequestAccountsDataSlice[];
  ping?: any | undefined;
}

const args = {
  accounts: {},
  slots: {},
  transactions: {
    pumpfun: {
      vote: false,
      failed: false,
      signature: undefined,
      accountInclude: ["6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"],
      accountExclude: [],
      accountRequired: [],
    },
  },
  transactionsStatus: {},
  entry: {},
  blocks: {},
  blocksMeta: {},
  accountsDataSlice: [],
  ping: undefined,
  commitment: CommitmentLevel.PROCESSED, //for receiving confirmed txn updates
};

export class gRPCListener {
  private client: Client;
  private isRunning = false;

  constructor(grpcUrl: string, apiKey: string, commitment: CommitmentLevel = CommitmentLevel.PROCESSED) {
    this.client = new Client(grpcUrl, apiKey, undefined);
  }

  public async start(): Promise<void> {
    this.isRunning = true;

    while (this.isRunning) {
      try {
        await this.handleStream();
      } catch (err) {
        console.error("❌ Stream error, reconnecting in 1s…", err);
        await this.delay(1_000);
      }
    }
  }

  public stop(): void {
    console.log("🛑 Stopping gRPCListener…");
    this.isRunning = false;
  }

  private async handleStream(): Promise<void> {
    const stream = await this.client.subscribe();

    const streamClosed = new Promise<void>((resolve, reject) => {
      stream.on("error", (err) => {
        console.error("🔴 Stream error:", err);
        stream.end();
        reject(err);
      });
      stream.on("end", () => resolve());
      stream.on("close", () => resolve());
    });

    stream.on("data", async (data) => {
      try {
        const tokenData = await decodeTransaction(data);
        if (tokenData) {
          bus.emit("token:new", tokenData);
        }
      } catch (err) {
        console.error("⚠️ Failed to decode transaction:", err);
      }
    });

    await new Promise<void>((resolve, reject) => {
      stream.write(args, (err?: Error) => (err ? reject(err) : resolve()));
    });
    console.log("📨 Subscription request sent");

    await streamClosed;
    console.log("🔒 gRPC stream closed");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
