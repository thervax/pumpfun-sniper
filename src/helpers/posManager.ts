import { TokenPosition } from "../utils/types";

export class PositionManager {
  private positions = new Map<string, TokenPosition>();
  private processing = false;

  constructor(private readonly maxPositions: number) {}

  public canOpen(): boolean {
    return this.positions.size < this.maxPositions;
  }

  public isProcessing() {
    return this.processing;
  }

  public setProcessing(state: boolean) {
    this.processing = state;
  }

  public add(position: TokenPosition): void {
    const key = position.mint;
    this.positions.set(key, position);
  }

  public remove(mint: string): boolean {
    return this.positions.delete(mint);
  }

  public count(): number {
    return this.positions.size;
  }
}

export const positionManager = new PositionManager(Number(process.env.MAX_POSITIONS) || 2);
