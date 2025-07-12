// import { TokenInfo, TokenPosition, TokenHistory } from "./types";
import { EventEmitter } from "events";

// export interface Events {
//   "token:new": { mint: string };
//   "token:passedFilters": TokenInfo;
//   "token:buySuccess": TokenPosition;
//   "token:startSell": TokenPosition;
//   "token:sellSuccess": TokenHistory;
// }

export const bus = new EventEmitter();
