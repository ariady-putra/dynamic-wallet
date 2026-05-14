import { useEffect, useMemo, useState } from "react";
import { http, useConnection, useWalletClient } from "wagmi";
import { createSmartAccountClient } from "permissionless";
import { getMEEVersion, MEEVersion, toNexusAccount, type GenericModuleConfig, type NexusAccount, type PrevalidationHookModuleConfig, type ToDefaultModuleParameters, type Validator } from "@biconomy/abstractjs";
import { erc7579Actions } from "permissionless/actions/erc7579";
import { pimlicoClient } from "../config";
import type { Hex } from "viem";

export function useSmartAccount({
  validators,
  executors,
  prevalidationHooks,
  hook,
  fallbacks,
  initData,
  defaultModuleParameters,
  onError,
}: {
  /** Optional validator modules configuration */
  validators?: Array<Validator>;
  /** Optional executor modules configuration */
  executors?: Array<GenericModuleConfig>;
  /** Optional prevalidation hook modules configuration */
  prevalidationHooks?: Array<PrevalidationHookModuleConfig>;
  /** Optional hook module configuration */
  hook?: GenericModuleConfig;
  /** Optional fallback modules configuration */
  fallbacks?: Array<GenericModuleConfig>;
  /** Optional init data */
  initData?: Hex;
  /** Optional default module parameters */
  defaultModuleParameters?: Partial<ToDefaultModuleParameters>;
  /** Optional error handler */
  onError?: (reason: unknown) => unknown;
}) {
  const { address, isConnected, chain } = useConnection();
  const { data: owner } = useWalletClient();
  const [account, setAccount] = useState<NexusAccount>();

  useEffect(
    () => {
      if (!isConnected) {
        setAccount(() => undefined);
        return;
      }

      if (account) return;
      if (!owner) return;
      if (!chain) return;

      toNexusAccount({
        signer: owner,
        chainConfiguration: {
          chain,
          transport: http(import.meta.env.VITE_ALCHEMY_RPC_URL),
          version: getMEEVersion(MEEVersion.V3_0_0),
        },
        validators,
        executors,
        prevalidationHooks,
        hook,
        fallbacks,
        initData,
        defaultModuleParameters,
      }).then(
        (account) =>
          setAccount(() => isConnected ? account : undefined)
      ).catch(onError);
    },
    [owner, account, chain, isConnected],
  );

  const smartAccountClient = useMemo(
    () => {
      return account && chain
        ? createSmartAccountClient({
          account, chain,
          bundlerTransport: http(import.meta.env.VITE_PIMLICO_RPC_URL),
          paymaster: pimlicoClient,
          userOperation: {
            estimateFeesPerGas: async () =>
              (await pimlicoClient.getUserOperationGasPrice()).fast
          },
        }).extend(
          erc7579Actions()
        )
        : undefined;
    },
    [account, chain],
  );

  return {
    eoa: address, // owner address
    owner, account,
    client: smartAccountClient,
  };
}
