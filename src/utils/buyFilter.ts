import { TokenData } from "./types";

export async function buyFilter(token: TokenData): Promise<boolean> {
  if (token.initialSolBuy < 0.25 || token.initialSolBuy > 1.1) {
    // console.log(`❌ ${token.name} (${token.mint}) failed initial buy check`);
    return false;
  }

  // console.log(`✅ ${token.name} (${token.mint}) passed buy check`);
  return true;
}
