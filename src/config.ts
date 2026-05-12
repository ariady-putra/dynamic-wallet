import { createConfig } from "wagmi";
import { createPublicClient, http, walletActions, type Address } from "viem";
import { optimismSepolia } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { createPimlicoClient } from "permissionless/clients/pimlico";

export const entryPoint: { address: Address; version: "0.7"; } = {
  address: entryPoint07Address,
  version: "0.7",
}; // global entrypoint

export const pimlicoClient = createPimlicoClient({
  transport: http(import.meta.env.VITE_PIMLICO_RPC_URL),
  entryPoint,
});

export const publicClient = createPublicClient({
  chain: optimismSepolia,
  transport: http(import.meta.env.VITE_ALCHEMY_RPC_URL),
}).extend(walletActions);

export const config = createConfig({
  chains: [optimismSepolia],
  transports: {
    [optimismSepolia.id]: http(import.meta.env.VITE_ALCHEMY_RPC_URL),
  },
  multiInjectedProviderDiscovery: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
};
