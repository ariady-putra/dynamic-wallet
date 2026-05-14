import { useEffect, useState } from "react";
import { useConnection } from "wagmi";
import type { WaitForTransactionReceiptReturnType } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import { DynamicWidget, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";

import { encodeExecuteSingle, type Action } from "./erc7579/utils";
import { waitForNextBlock } from "./utils";

import { useSmartAccount } from "./hooks/useSmartAccount";
import { CounterExecutorModule, publicClient } from "./config";

import reactLogo from "./assets/react.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";

import "./App.css";

export default function App() {
  const {
    sdkHasLoaded,
    // userWithMissingInfo,
  } = useDynamicContext();
  const isUserLoggedIn = useIsLoggedIn();
  const { address, isConnected, chain } = useConnection();
  const { account: smartAccount, client: smartAccountClient } = useSmartAccount({
    executors: [{
      module: CounterExecutorModule.address,
      data: address ?? "0x", // owner address
    }],
    onError: console.error,
  });

  const [isLoading, setIsLoading] = useState(false);

  const [result, setResult] = useState("");
  const setResultError = (error: unknown) =>
    setResult(() => `${error}`);
  useEffect(
    () => {
      if (!isConnected) setResult(() => "");
    },
    [isConnected],
  );

  //#region Module
  const incrementCount: Action = {
    target: CounterExecutorModule.address,
    value: 0n,
    data: {
      abi: CounterExecutorModule.abi,
      functionName: "incrementCount",
    },
  };

  const execIncrementCount = async () =>
    smartAccountClient
      ? publicClient.waitForTransactionReceipt({
        hash: await smartAccountClient.sendTransaction({
          callData: encodeExecuteSingle(incrementCount),
        }),
      })
      : undefined;

  const getCount = (account: SmartAccount) =>
    publicClient.readContract({
      address: CounterExecutorModule.address,
      abi: CounterExecutorModule.abi,
      functionName: "getCount",
      account,
    });
  //#endregion

  useEffect(
    () => {
      if (result) return;
      if (!smartAccount) return;

      getCount(smartAccount)
        .then(
          (count) =>
            setResult(() => `Count: ${count}`)
        )
        .catch(setResultError);
    },
    [smartAccount, result],
  );

  function act<Receipt extends WaitForTransactionReceiptReturnType | undefined>({
    perform,
    onSuccess,
    onError,
  }: {
    perform: () => Promise<Receipt>;
    onSuccess?: (receipt: Receipt) => unknown;
    onError?: (reason: unknown) => unknown;
  }) {
    if (isLoading) return;

    setIsLoading(() => true);
    setResult(() => "Signing message...");

    perform()
      .then(onSuccess)
      .catch(onError)
      .finally(
        () =>
          setIsLoading(() => false)
      );
  }

  return <>
    <section id="center" className="relative">
      {isConnected &&
        <div className="absolute top-3.25 right-3.25 z-50">
          <DynamicWidget />
        </div>
      }

      <div className="hero">
        <img src={heroImg} className="base" width="170" height="179" alt="" />
        <img src={reactLogo} className="framework" alt="React logo" />
        <img src={viteLogo} className="vite" alt="Vite logo" />
      </div>

      <div>
        <h1 className="text-3xl font-bold underline">
          Hello {address?.slice(0, 6)}...{address?.slice(-4)}
        </h1>
        {!sdkHasLoaded && <p>loading...</p>}
        {sdkHasLoaded && !isUserLoggedIn && <p>Please log in to continue.</p>}
        {sdkHasLoaded && isUserLoggedIn && !isConnected && <p>connecting...</p>}
        {sdkHasLoaded && isUserLoggedIn && isConnected && <p>You are logged in!</p>}
      </div>

      <div className="relative h-10.25">
        <div className="absolute loading loading-infinity my-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-50" />

        {/* Connect Button */}
        {sdkHasLoaded && !isUserLoggedIn &&
          <DynamicWidget />
        }

        {/* Increment Count */}
        {smartAccountClient &&
          <button
            className={`btn ${!isLoading ? "btn-primary" : "pointer-events-none"}`}
            onClick={
              () => act({
                perform: execIncrementCount,
                onSuccess: (receipt) => {
                  if (!receipt) {
                    setResultError("System not ready, please try again in a moment.");
                    return;
                  }

                  if (receipt.status !== "success") {
                    setResultError({ incrementCountStatus: receipt.status });
                    return;
                  }

                  const txHash = `Increment count: https://sepolia-optimism.etherscan.io/tx/${receipt.transactionHash}`;
                  setResult(() => txHash);

                  if (smartAccount) waitForNextBlock(receipt.blockNumber)
                    .then(
                      () =>
                        getCount(smartAccount)
                    )
                    .then(
                      (count) =>
                        setResult(() => `Count: ${count} - ${txHash}`)
                    )
                    .catch(setResultError);
                },
                onError: setResultError,
              })
            }
          >
            {isLoading && <span className="loading" />}
            {!isLoading ? "Increment Count" : "Incrementing Count"}
          </button>
        }

      </div>
    </section >

    <div className="ticks font-mono text-sm p-3.25">
      {result || <>&nbsp;</>}
    </div>

    <section id="next-steps">
      <div id="docs">
        <svg className="icon" role="presentation" aria-hidden="true">
          <use href="/icons.svg#documentation-icon"></use>
        </svg>
        <h2>Documentation</h2>
        <p>Your questions, answered</p>
        <ul>
          <li>
            <a href="https://vite.dev/" target="_blank">
              <img className="logo" src={viteLogo} alt="" />
              Explore Vite
            </a>
          </li>
          <li>
            <a href="https://react.dev/" target="_blank">
              <img className="button-icon" src={reactLogo} alt="" />
              Learn more
            </a>
          </li>
        </ul>
      </div>
      <div id="social">
        <svg className="icon" role="presentation" aria-hidden="true">
          <use href="/icons.svg#social-icon"></use>
        </svg>
        <h2>Connect with us</h2>
        <p>Join the Vite community</p>
        <ul>
          <li>
            <a href="https://github.com/vitejs/vite" target="_blank">
              <svg
                className="button-icon"
                role="presentation"
                aria-hidden="true"
              >
                <use href="/icons.svg#github-icon"></use>
              </svg>
              GitHub
            </a>
          </li>
          <li>
            <a href="https://chat.vite.dev/" target="_blank">
              <svg
                className="button-icon"
                role="presentation"
                aria-hidden="true"
              >
                <use href="/icons.svg#discord-icon"></use>
              </svg>
              Discord
            </a>
          </li>
          <li>
            <a href="https://x.com/vite_js" target="_blank">
              <svg
                className="button-icon"
                role="presentation"
                aria-hidden="true"
              >
                <use href="/icons.svg#x-icon"></use>
              </svg>
              X.com
            </a>
          </li>
          <li>
            <a href="https://bsky.app/profile/vite.dev" target="_blank">
              <svg
                className="button-icon"
                role="presentation"
                aria-hidden="true"
              >
                <use href="/icons.svg#bluesky-icon"></use>
              </svg>
              Bluesky
            </a>
          </li>
        </ul>
      </div>
    </section>
    <section id="spacer" />

    <div className="ticks font-mono text-sm p-3.25">
      {chain?.name ?? <>&nbsp;</>}
    </div>
  </>;
}
