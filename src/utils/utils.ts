import { promises as fs } from "fs";
import { join } from "path";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function appendHistory(entry: any, filename = "token-history.json") {
  const filePath = join(process.cwd(), filename);

  let arr: any[];
  try {
    const content = await fs.readFile(filePath, "utf8");
    arr = JSON.parse(content);
    if (!Array.isArray(arr)) throw new Error("History file is not an array");
  } catch (err) {
    arr = [];
  }

  arr.push(entry);
  const data = JSON.stringify(arr, null, 2);
  await fs.writeFile(filePath, data, "utf8");
}
