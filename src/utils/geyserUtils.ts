import bs58 from "bs58";
import { promises as fs } from "fs";
import { TokenData } from "./types";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const createIxDiscriminator = [24, 30, 200, 40, 5, 28, 7, 119];

function decodeTransact(data: string) {
  const output = bs58.encode(Buffer.from(data, "base64"));
  return output;
}

export function tOutPut(data) {
  try {
    if (!data.transaction) return null;
    const dataTx = data.transaction.transaction;
    const signature = decodeTransact(dataTx.signature);
    const message = dataTx.transaction?.message;
    const header = message.header;
    const accountKeys = message.accountKeys.map((t) => {
      return decodeTransact(t);
    });
    const recentBlockhash = decodeTransact(message.recentBlockhash);
    const instructions = message.instructions;
    const meta = dataTx?.meta;
    return {
      signature,
      message: {
        header,
        accountKeys,
        recentBlockhash,
        instructions,
      },
      meta,
    };
  } catch (err) {
    console.log(err);
    console.log(data);
  }
}

interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  creator: string;
}
export function decodeTokenMetadata(ixData: Uint8Array): TokenMetadata | null {
  if (!(ixData instanceof Uint8Array)) {
    ixData = new Uint8Array(ixData);
  }
  try {
    let offset = 8; // Skip discriminator

    const readString = (): string => {
      const length =
        ixData[offset] | (ixData[offset + 1] << 8) | (ixData[offset + 2] << 16) | (ixData[offset + 3] << 24);
      offset += 4;
      const value = new TextDecoder().decode(ixData.slice(offset, offset + length));
      offset += length;
      return value;
    };

    const readPubkey = (): string => {
      const key = ixData.slice(offset, offset + 32);
      offset += 32;
      return new PublicKey(key).toString();
    };

    const name = readString();
    const symbol = readString();
    const uri = readString();
    const creator = readPubkey();

    return { name, symbol, uri, creator };
  } catch (err) {
    console.error("Failed to decode metadata:", err);
    return null;
  }
}

export async function decodeTransaction(txData): Promise<TokenData | null> {
  try {
    const detectionTime = Date.now();

    const parsed = tOutPut(txData);
    if (!parsed) return null;

    if (!parsed.meta.logMessages.includes("Program log: Instruction: Create")) {
      return null;
    }

    const mint = parsed.meta.postTokenBalances[0].mint;
    const accounts: string[] = parsed.message.accountKeys;
    const createIx = parsed.message.instructions.find((ix) => {
      if (!ix.data) return false; // Instuction doesn't have data (only accounts)
      return discriminatorCheck(ix.data, createIxDiscriminator);
    });
    const createIxAccounts = createIx.accounts;

    if (!createIxAccounts) return null;

    function getAccountByIndex(index: number) {
      if (index >= accounts.length) return null;
      const accountIndex = createIxAccounts[index - 1];
      return accounts[accountIndex];
    }

    function discriminatorCheck(array: number[], discriminator: number[]): boolean {
      if (discriminator.length > array.length) return false;

      for (let i = 0; i < discriminator.length; i++) {
        if (array[i] !== discriminator[i]) return false;
      }

      return true;
    }

    const metadata = decodeTokenMetadata(createIx.data);
    if (!metadata) {
      console.log(`Failed to get metadata for: ${mint}`);
      return null;
    }

    const bondingCurve = getAccountByIndex(3);
    const bondingCurveAta = getAccountByIndex(4);
    if (!bondingCurve || !bondingCurveAta) {
      console.log(`Failed to get BC data for: ${mint}`);
      return null;
    }

    const preSolBalances = parsed.meta.preBalances;
    const postSolBalances = parsed.meta.postBalances;
    const postTokenBalances = parsed.meta.postTokenBalances;

    const initialSolBuy = (() => {
      const bondingCurveIndex = accounts.findIndex((account) => account === bondingCurve);
      const bondingCurvePostSolBalance = postSolBalances[bondingCurveIndex] / LAMPORTS_PER_SOL;
      return bondingCurvePostSolBalance;
    })();

    const solInBC = 30 + initialSolBuy;

    const initialTokenBuy = (() => {
      const ownerPostTokenBalance = postTokenBalances.find((postTokenBalance) => {
        return postTokenBalance.mint === mint && postTokenBalance.owner === metadata.creator;
      });
      return ownerPostTokenBalance.uiTokenAmount.uiAmount;
    })();
    const tokensInBC = 1_073_000_000 - initialTokenBuy;

    const tokenInfo: TokenData = {
      mint,
      name: metadata.name,
      symbol: metadata.symbol,
      creator: metadata.creator,
      initialSolBuy,
      tokensInBC,
      solInBC,
      bondingCurve,
      bondingCurveAta,
      uri: metadata.uri,
      decimals: 6,
      detectionTime,
    };
    return tokenInfo;
  } catch (err) {
    console.log(`Failed to decode transaction: ${err}`);
    return null;
  }
}

async function test() {
  const txData = JSON.parse(await fs.readFile("output.json", "utf8"))[0];
  console.log(await decodeTransaction(txData));
}

if (require.main === module) test();
