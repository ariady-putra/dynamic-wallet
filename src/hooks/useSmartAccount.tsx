import { useEffect, useMemo, useState } from "react";
import { http, useConnection, useWalletClient, type Transport } from "wagmi";
import type { Chain, Client, EntryPointVersion, JsonRpcAccount, LocalAccount, RpcSchema } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import { createSmartAccountClient } from "permissionless";
import { toNexusSmartAccount, type ToNexusSmartAccountReturnType } from "permissionless/accounts";
import { erc7579Actions } from "permissionless/actions/erc7579";
import type { PimlicoClient } from "permissionless/clients/pimlico";

export default function useSmartAccount({
  publicClient,
  pimlicoClient,
  onError,
}: {
  publicClient: Client<
    Transport,
    Chain | undefined,
    JsonRpcAccount | LocalAccount | undefined
  >;
  pimlicoClient: PimlicoClient<
    EntryPointVersion,
    Transport,
    Chain | undefined,
    SmartAccount | undefined,
    Client | undefined,
    RpcSchema | undefined
  >;
  onError?: (reason: any) => any;
}) {
  const { address, isConnected, chain } = useConnection();
  const { data: owner } = useWalletClient();
  const [account, setAccount] = useState<ToNexusSmartAccountReturnType>();

  useEffect(
    () => {
      if (!isConnected) {
        setAccount(() => undefined);
        return;
      }

      if (account) return;
      if (!owner) return;

      toNexusSmartAccount({
        client: publicClient,
        owners: [owner],
        version: "1.0.0",
      }).then(
        (account) =>
          setAccount(() => isConnected ? account : undefined)
      ).catch(onError);
    },
    [owner, account, isConnected],
  );

  const smartAccountClient = useMemo(
    () => {
      return account
        ? createSmartAccountClient({
          account,
          chain,
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
    [account, chain, pimlicoClient],
  );

  return {
    eoa: address, // owner address
    owner, account,
    client: smartAccountClient,
  };
}
