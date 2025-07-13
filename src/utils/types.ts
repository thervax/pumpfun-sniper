import { Connection, Keypair } from "@solana/web3.js";

export interface SniperConfig {
  connection: Connection;
  wallet: Keypair;
  buyAmount: number;
  sellIntervalMs: number;
  buyFilters: {
    useCreatorBlacklist: boolean; // Blacklist token creators that have had negative gain
    useNameBlacklist: boolean; // Blacklist token names/symbols that have had negative gain
    minCreatorBuy: number;
    maxCreatorBuy: number;
    slippage: number;
  };
  sellFilters: {
    gain: number;
    loss: number;
    sellTime: number; // Sell time in ms
    slippage: number;
  };
}

export interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  creator: string;
  initialSolBuy: number;
  tokensInBC: number; // Amount of tokens in bonding curve
  solInBC: number; // Amount of SOL in bonding curve
  bondingCurve: string;
  assocBondingCurveAddr: string;
  uri: string;
  decimals: number;
  detectionTime: number;
}

export interface TokenPosition {
  mint: string;
  buySignature: string;
  name: string;
  symbol: string;
  creator: string;
  bondingCurve: string;
  assocBondingCurveAddr: string;
  currentPrice: number;
  buyPrice: number;
  amount: number;
  buySolAmount: number;
  buyTime: number;
  gain: number;
  decimals: number;
  buyLatency: number;
  processing: boolean;
}

export interface TokenHistory {
  mint: string;
  buySignature: string;
  sellSignature: string;
  name: string;
  symbol: string;
  buyPrice: number;
  buySolAmount: number;
  buyTime: number;
  amount: number;
  sellPrice: number;
  sellSolAmount: number;
  sellTime: number;
  gain: number;
  decimals: number;
  buyLatency: number;
}
