import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from './App.tsx';

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { config } from "./config.ts";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={new QueryClient()}>
        <DynamicContextProvider settings={{
          environmentId: import.meta.env.VITE_DYNAMIC_ENV_ID,
          walletConnectors: [EthereumWalletConnectors],
        }}>
          <DynamicWagmiConnector>
            <App />
          </DynamicWagmiConnector>
        </DynamicContextProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
