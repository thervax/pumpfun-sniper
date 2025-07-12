import { TokenData } from "./types";

export async function buyFilter(token: TokenData): Promise<boolean> {
  if (token.initialSolBuy < 0.05 || token.initialSolBuy > 0.75) {
    // console.log(`❌ ${token.name} (${token.mint}) failed initial buy check`);
    return false;
  }

  // console.log(`✅ ${token.name} (${token.mint}) passed buy check`);
  return true;
}
