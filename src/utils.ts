import type { BlockNumber } from "viem";
import { publicClient } from "./config";

/**
 * Waits for the next block (i.e., the block number greater than `currentBlock`)
 * @param currentBlock 
 * @returns The next block number
 */
export const waitForNextBlock = (currentBlock: BlockNumber) =>
  new Promise<BlockNumber>(
    (resolve) => {
      console.log("Waiting for next block...");
      const unwatch = publicClient.watchBlockNumber({
        onBlockNumber(blockNumber) {
          if (blockNumber > currentBlock) {
            unwatch();
            resolve(blockNumber);
          }
        },
      });
    }
  );
