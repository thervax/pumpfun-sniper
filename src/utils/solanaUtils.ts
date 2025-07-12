import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getAccount,
  createBurnInstruction,
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { transactionSenderAndConfirmationWaiter } from "./txSender";
import { TokenData, TokenHistory, TokenPosition } from "./types";
import {
  FEE_RECIPIENT,
  GLOBAL,
  PUMP_FUN_ACCOUNT,
  PUMP_FUN_PROGRAM,
  SOL,
  SYSTEM_PROGRAM,
  TOKEN_PROGRAM,
} from "./constants";
import { sleep } from "./utils";
import axios from "axios";
import { authManager } from "../helpers/authManager";
import bs58 from "bs58";

const razorFeeAccounts = [
  "FjmZZrFvhnqqb9ThCuMVnENaM3JGVuGWNyCAxRJcFpg9",
  "6No2i3aawzHsjtThw81iq1EXPJN6rh8eSJCLaYZfKDTG",
  "A9cWowVAiHe9pJfKAj3TJiN9VpbzMUq6E4kEvf5mUT22",
  "Gywj98ophM7GmkDdaWs4isqZnDdFCW7B46TXmKfvyqSm",
  "68Pwb4jS7eZATjDfhmTXgRJjCiZmw1L7Huy4HNpnxJ3o",
  "4ABhJh5rZPjv63RBJBuyWzBK3g9gWMUQdTZP2kiW31V9",
  "B2M4NG5eyZp5SBQrSdtemzk5TqVuaWGQnowGaCBt8GyM",
  "5jA59cXMKQqZAVdtopv8q3yyw9SYfiE3vUCbt7p8MfVf",
  "5YktoWygr1Bp9wiS1xtMtUki1PeYuuzuCF98tqwYxf61",
  "295Avbam4qGShBYK7E9H5Ldew4B3WyJGmgmXfiWdeeyV",
  "EDi4rSy2LZgKJX74mbLTFk4mxoTgT6F7HxxzG2HBAFyK",
  "BnGKHAC386n4Qmv9xtpBVbRaUTKixjBe3oagkPFKtoy6",
  "Dd7K2Fp7AtoN8xCghKDRmyqr5U169t48Tw5fEd3wT9mq",
  "AP6qExwrbRgBAVaehg4b5xHENX815sMabtBzUzVB4v8S",
];

const slotFeeAccounts = [
  "6fQaVhYZA4w3MBSXjJ81Vf6W1EDYeUPXpgVQ6UQyU1Av",
  "4HiwLEP2Bzqj3hM2ENxJuzhcPCdsafwiet3oGkMkuQY4",
  "7toBU3inhmrARGngC7z6SjyP85HgGMmCTEwGNRAcYnEK",
  "8mR3wB1nh4D6J9RUCugxUpc6ya8w38LPxZ3ZjcBhgzws",
  "6SiVU5WEwqfFapRuYCndomztEwDjvS5xgtEof3PLEGm9",
  "TpdxgNJBWZRL8UXF5mrEsyWxDWx9HQexA9P1eTWQ42p",
  "D8f3WkQu6dCF33cZxuAsrKHrGsqGP2yvAHf8mX6RXnwf",
];

const jitoFeeAccounts = [
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

export async function closeTokenAccount(mint: string, connection: Connection, wallet: Keypair) {
  try {
    const mintPublicKey = new PublicKey(mint);

    const ata = await getAssociatedTokenAddress(mintPublicKey, wallet.publicKey);
    const accountInfo = await getAccount(connection, ata);

    const instructions: TransactionInstruction[] = [];

    if (accountInfo.amount > BigInt(0)) {
      instructions.push(
        createBurnInstruction(ata, mintPublicKey, wallet.publicKey, accountInfo.amount, [], TOKEN_PROGRAM_ID)
      );
    }

    instructions.push(createCloseAccountInstruction(ata, wallet.publicKey, wallet.publicKey, [], TOKEN_PROGRAM_ID));

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const tx = new VersionedTransaction(messageV0);
    tx.sign([wallet]);

    const { value: simulatedTransactionResponse } = await connection.simulateTransaction(tx, {
      replaceRecentBlockhash: true,
      commitment: "processed",
    });
    const { err, logs } = simulatedTransactionResponse;
    if (err) {
      console.log(`[ERROR] Simulation failed for token account closure for mint ${mint}: ${err.toString()} `);
      return null;
    }

    const serializedTx = Buffer.from(tx.serialize());

    const signature = await transactionSenderAndConfirmationWaiter({
      connection,
      serializedTransaction: serializedTx,
      blockhashWithExpiryBlockHeight: {
        blockhash,
        lastValidBlockHeight,
      },
    });

    return signature;
  } catch (err) {
    console.log(`[ERROR] Failed to close token account for mint ${mint}: ${err}`);
    return null;
  }
}

export async function checkTxSuccess(
  connection: Connection,
  signature: string,
  maxRetries: number = 10,
  delayMs: number = 3000
): Promise<boolean> {
  try {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const parsedTx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (parsedTx && parsedTx.meta && parsedTx.meta.err === null) {
        return true; // Transaction succeeded
      }

      if (parsedTx && parsedTx.meta && parsedTx.meta.err !== null) {
        return false; // Error occurred
      }

      await sleep(delayMs);
    }

    // Couldn't find transaction
    return false;
  } catch (err) {
    console.log(`[ERROR] Failed to check transaction: ${signature}`);
    return false;
  }
}

export async function checkStatus(
  connection: Connection,
  signature: string,
  statuses: string[],
  maxRetries = 20,
  delayMs = 1000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const resp = await connection.getSignatureStatuses([signature], { searchTransactionHistory: true });
    const status = resp.value[0];
    if (status?.confirmationStatus && statuses.includes(status?.confirmationStatus)) {
      return status.err === null;
    }
    await sleep(delayMs);
  }
  return false;
}

async function getActualAmount(connection: Connection, signature: string, tokenAddress: string, walletAddress: string) {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
    const preBalances = tx?.meta?.preTokenBalances || [];
    const postBalances = tx?.meta?.postTokenBalances || [];

    if (tokenAddress === "So11111111111111111111111111111111111111112") {
      const preBalance = tx?.meta?.preBalances?.[0] || 0; // Pre-transaction SOL balance
      const postBalance = tx?.meta?.postBalances?.[0] || 0; // Post-transaction SOL balance

      const changeInBalance = postBalance - preBalance;
      return changeInBalance / 10 ** 9;
    }

    let preAmount = 0;
    for (let i = 0; i < preBalances.length; i++) {
      const preBalance = preBalances[i];
      if (preBalance.mint === tokenAddress && preBalance.owner === walletAddress) {
        preAmount = preBalance.uiTokenAmount.uiAmount || 0;
        break;
      }
    }

    let postAmount = 0;
    for (let i = 0; i < postBalances.length; i++) {
      const postBalance = postBalances[i];
      if (postBalance.mint === tokenAddress && postBalance.owner === walletAddress) {
        postAmount = postBalance.uiTokenAmount.uiAmount || 0;
        break;
      }
    }

    return postAmount - preAmount;
  } catch (error) {
    console.error("[ERROR] Failed to get buy amount: ", error);
    return 0;
  }
}

enum SendMode {
  off,
  blockRazor,
  axiomLeech,
  jito,
}
async function sendTransaction(mode: SendMode, txBase64: string) {
  if (mode === SendMode.blockRazor) {
    console.log(txBase64);
    const authToken = process.env.BLOCK_RAZOR_AUTHTOKEN;
    const response = await axios.post(
      "http://frankfurt.solana.blockrazor.xyz:443/sendTransaction",
      {
        transaction: txBase64,
        mode: "fast",
      },
      { headers: { apikey: authToken } }
    );
  } else if (mode === SendMode.axiomLeech) {
    const { authToken, refreshToken } = authManager.getTokens();
    const response = await axios.post(
      "https://tx-pro.axiom.trade/batched-send-tx-v2",
      {
        mevProtection: false,
        enhancedMevProtection: false,
        wallets: [
          {
            transactions: [
              {
                base64Tx: txBase64,
                provider: "0xslot",
              },
            ],
          },
        ],
      },
      {
        headers: {
          Cookie: `auth-refresh-token=${refreshToken}; auth-access-token=${authToken}`,
        },
      }
    );
  } else if (mode === SendMode.jito) {
    const response = await axios.post("https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/transactions", {
      id: 1,
      jsonrpc: "2.0",
      method: "sendTransaction",
      params: [
        txBase64,
        {
          encoding: "base64",
        },
      ],
    });
  }
}

async function getTxFeeInstruction(mode: SendMode, wallet: Keypair, feeAmount: number) {
  if (mode === SendMode.blockRazor) {
    return SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(razorFeeAccounts[Math.floor(Math.random() * razorFeeAccounts.length)]),
      lamports: feeAmount * LAMPORTS_PER_SOL,
    });
  } else if (mode === SendMode.axiomLeech) {
    return SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(slotFeeAccounts[Math.floor(Math.random() * slotFeeAccounts.length)]),
      lamports: feeAmount * LAMPORTS_PER_SOL,
    });
  } else if (mode === SendMode.jito) {
    return SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(jitoFeeAccounts[Math.floor(Math.random() * jitoFeeAccounts.length)]),
      lamports: feeAmount * LAMPORTS_PER_SOL,
    });
  } else {
    return null;
  }
}

const txFee = 0.0001;
const computeUnit = 600000;
const sendMode = SendMode.blockRazor;
const specialFee = 0.0003;
export async function buyPumpFunToken(
  tokenData: TokenData,
  buyAmount: number,
  slippage: number,
  connection: Connection,
  wallet: Keypair
): Promise<TokenPosition | null> {
  console.log(`🎯 [BUY] Buying ${buyAmount} SOL of ${tokenData.name} (${tokenData.mint})`);
  const tokenMint = new PublicKey(tokenData.mint);

  try {
    const buyerAta = await getAssociatedTokenAddress(tokenMint, wallet.publicKey);

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: Math.floor(((txFee * 10 ** 9) / computeUnit) * 10 ** 6),
      }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnit }),
    ];

    const buyerTokenAccountInfo = await connection.getAccountInfo(buyerAta);
    if (!buyerTokenAccountInfo) {
      ixs.push(createAssociatedTokenAccountInstruction(wallet.publicKey, buyerAta, wallet.publicKey, tokenMint));
    }

    const newVSolReserves = tokenData.solInBC + buyAmount;
    const invariant = tokenData.tokensInBC * tokenData.solInBC;
    const newVTokenReserves = invariant / newVSolReserves;
    const tokensToBuy = Math.floor(tokenData.tokensInBC - newVTokenReserves) * 10 ** tokenData.decimals;
    const buyPrice = tokenData.solInBC / tokenData.tokensInBC;

    const bonding = new PublicKey(tokenData.bondingCurve);
    const assocBondingAddr = new PublicKey(tokenData.assocBondingCurveAddr);

    const [creatorVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("creator-vault"), new PublicKey(tokenData.creator).toBuffer()],
      PUMP_FUN_PROGRAM
    );

    const keys = [
      { pubkey: GLOBAL, isSigner: false, isWritable: false },
      { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: bonding, isSigner: false, isWritable: true },
      { pubkey: assocBondingAddr, isSigner: false, isWritable: true },
      { pubkey: buyerAta, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: creatorVaultPda, isSigner: false, isWritable: true },
      { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
    ];

    const calculateSlippageUp = (solAmount: number, slippage: number): number => {
      const lamports = solAmount * LAMPORTS_PER_SOL;
      return Math.round(lamports * (1 + slippage / 100));
    };

    const instructionBuf = Buffer.from("66063d1201daebea", "hex");
    const tokenAmountBuf = Buffer.alloc(8);
    tokenAmountBuf.writeBigUInt64LE(BigInt(tokensToBuy), 0);
    const slippageBuf = Buffer.alloc(8);
    slippageBuf.writeBigUInt64LE(BigInt(calculateSlippageUp(buyAmount, slippage)), 0);
    const data = Buffer.concat([instructionBuf, tokenAmountBuf, slippageBuf]);

    const swapInstruction = new TransactionInstruction({
      keys: keys,
      programId: PUMP_FUN_PROGRAM,
      data: data,
    });
    ixs.push(swapInstruction);

    const feeIx = await getTxFeeInstruction(sendMode, wallet, specialFee);
    if (feeIx) ixs.push(feeIx);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: ixs,
    }).compileToV0Message();
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallet]);

    const serializedTx = Buffer.from(transaction.serialize());

    const base64 = serializedTx.toString("base64");
    const signature = bs58.encode(transaction.signatures[0]);

    await sendTransaction(sendMode, base64);

    const buyTime = new Date().getTime();

    console.log(`📩 [BUY] Sent transaction to buy ${buyAmount} ${tokenData.name} (${tokenData.mint})`);

    const success = await checkStatus(connection, signature, ["finalized"]);
    if (!success) {
      console.log(`❌ [ERROR] Purchase of ${tokenData.name} (${tokenData.mint}) had error: ${signature}`);
      return null;
    }

    console.log(`✅ [BUY] Bought ${tokensToBuy} ${tokenData.name} (${tokenData.mint}): ${signature}`);

    return {
      mint: tokenData.mint,
      buySignature: signature,
      name: tokenData.name,
      symbol: tokenData.symbol,
      bondingCurve: tokenData.bondingCurve,
      assocBondingCurveAddr: tokenData.assocBondingCurveAddr,
      creator: tokenData.creator,
      currentPrice: buyPrice,
      buyPrice,
      amount: tokensToBuy,
      buySolAmount: buyAmount,
      buyTime,
      gain: 0,
      decimals: tokenData.decimals,
      processing: false,
    };
  } catch (err) {
    console.log(`❌ [ERROR] Buy failed for ${tokenData.name} (${tokenData.mint}): ${err}`);
    return null;
  }
}

export async function sellPumpFunToken(
  position: TokenPosition,
  percentage: number,
  slippage: number,
  connection: Connection,
  wallet: Keypair
): Promise<TokenHistory | null> {
  console.log(`🎯 [SELL] Selling ${percentage}% of ${position.name} (${position.mint})`);
  const tokenMint = new PublicKey(position.mint);

  try {
    const sellerAta = await getAssociatedTokenAddress(tokenMint, wallet.publicKey);

    const ixs: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: Math.floor(((txFee * 10 ** 9) / computeUnit) * 10 ** 6),
      }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnit }),
    ];

    const sellerTokenAccountInfo = await connection.getAccountInfo(sellerAta);
    if (!sellerTokenAccountInfo) {
      ixs.push(createAssociatedTokenAccountInstruction(wallet.publicKey, sellerAta, wallet.publicKey, tokenMint));
    }

    const bonding = new PublicKey(position.bondingCurve);
    const assocBondingAddr = new PublicKey(position.assocBondingCurveAddr);

    const [creatorVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("creator-vault"), new PublicKey(position.creator).toBuffer()],
      PUMP_FUN_PROGRAM
    );

    const keys = [
      { pubkey: GLOBAL, isSigner: false, isWritable: false },
      { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: bonding, isSigner: false, isWritable: true },
      { pubkey: assocBondingAddr, isSigner: false, isWritable: true },
      { pubkey: sellerAta, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: creatorVaultPda, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_ACCOUNT, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
    ];

    const calculateSlippageUp = (solAmount: number, slippage: number): number => {
      const lamports = solAmount * LAMPORTS_PER_SOL;
      return Math.round(lamports * (1 + slippage / 100));
    };

    const instructionBuf = Buffer.from("33e685a4017f83ad", "hex");
    const tokenAmountBuf = Buffer.alloc(8);
    tokenAmountBuf.writeBigUInt64LE(BigInt(position.amount), 0);
    const slippageBuf = Buffer.alloc(8);
    slippageBuf.writeBigUInt64LE(BigInt(position.buySolAmount * 0.5 * LAMPORTS_PER_SOL), 0);
    const data = Buffer.concat([instructionBuf, tokenAmountBuf, slippageBuf]);

    const swapInstruction = new TransactionInstruction({
      keys: keys,
      programId: PUMP_FUN_PROGRAM,
      data: data,
    });
    ixs.push(swapInstruction);

    const feeIx = await getTxFeeInstruction(sendMode, wallet, specialFee);
    if (feeIx) ixs.push(feeIx);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: blockhash,
      instructions: ixs,
    }).compileToV0Message();
    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallet]);

    const serializedTx = Buffer.from(transaction.serialize());

    const base64 = serializedTx.toString("base64");
    const signature = bs58.encode(transaction.signatures[0]);

    await sendTransaction(sendMode, base64);

    const sellTime = new Date().getTime();

    console.log(
      `📩 [SELL] Sent transaction to sell ${percentage}% (${
        (position.amount * (percentage / 100)) / 10 ** position.decimals
      }) of ${position.name} (${position.mint})`
    );

    const success = await checkStatus(connection, signature, ["finalized"]);
    if (!success) {
      console.log(`❌ [ERROR] Selling of ${position.name} (${position.mint}) had error: ${signature}`);
      return null;
    }

    const actualSolAmount = await getActualAmount(connection, signature, SOL, wallet.publicKey.toString());

    console.log(
      `✅ [SELL] Sold ${percentage}% (${(position.amount * (percentage / 100)) / 10 ** position.decimals}) of ${
        position.name
      } (${position.mint}) for ${actualSolAmount} SOL: ${signature}`
    );

    return {
      mint: position.mint,
      buySignature: position.buySignature,
      sellSignature: signature,
      name: position.name,
      symbol: position.symbol,
      buyPrice: position.buyPrice,
      buySolAmount: position.buySolAmount,
      buyTime: position.buyTime,
      amount: position.amount,
      sellPrice: 0,
      sellSolAmount: actualSolAmount,
      sellTime,
      gain: (actualSolAmount / position.buySolAmount - 1) * 100,
      decimals: position.decimals,
    };
  } catch (err) {
    console.log(`[ERROR] Sell failed for ${position.name} (${position.mint}): ${err}`);
    return null;
  }
}
