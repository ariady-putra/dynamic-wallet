import type { BlockNumber, WatchBlockNumberReturnType } from "viem";
import { publicClient } from "./config";

/**
 * Waits for the next block (i.e., the block number greater than `currentBlock`)
 * @param currentBlock 
 * @returns The next block number
 */
export const waitForNextBlock = ({
  currentBlock,
  onStartWaiting,
  onNextBlock,
}: {
  currentBlock: BlockNumber;
  onStartWaiting?: (unwatch: WatchBlockNumberReturnType) => unknown;
  onNextBlock?: (blockNumber: BlockNumber) => unknown;
}) =>
  new Promise<BlockNumber>(
    (resolve, reject) => {
      const unwatch = publicClient.watchBlockNumber({
        onBlockNumber(blockNumber) {
          if (blockNumber > currentBlock) {
            onNextBlock?.(blockNumber);
            unwatch();
            resolve(blockNumber);
          }
        },
        onError(error) {
          unwatch();
          reject(error);
        },
      });
      onStartWaiting?.(unwatch);
    }
  );
