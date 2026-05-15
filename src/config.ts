import { createConfig } from "wagmi";
import { createPublicClient, http, walletActions, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { entryPoint07Address } from "viem/account-abstraction";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import CounterExecutorModuleJSON from "../CounterExecutorModule.json" with {type: "json"};

export const CounterExecutorModule = {
  ...CounterExecutorModuleJSON,
  address: "0x6f77567101a95077E14e5E6eAB27214B6a9B556F" as Address,
};

export const entryPoint: { address: Address; version: "0.7"; } = {
  address: entryPoint07Address,
  version: "0.7",
}; // global entrypoint

export const pimlicoClient = createPimlicoClient({
  transport: http(import.meta.env.VITE_PIMLICO_RPC_URL),
  entryPoint,
});

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(import.meta.env.VITE_ALCHEMY_RPC_URL),
}).extend(walletActions);

export const config = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(import.meta.env.VITE_ALCHEMY_RPC_URL),
  },
  multiInjectedProviderDiscovery: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
};
