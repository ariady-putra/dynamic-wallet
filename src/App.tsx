import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection } from "wagmi";
import type { Hex } from "viem";
import type { SmartAccount } from "viem/account-abstraction";
import type { InstallModuleParameters, IsModuleInstalledParameters } from "permissionless/actions/erc7579";
import { DynamicWidget, useDynamicContext, useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { pimlicoClient, publicClient } from "./config";
import { encodeExecuteSingle, type Action } from "./erc7579/utils";
import useSmartAccount from "./hooks/useSmartAccount";
import CounterExecutorModuleJSON from "../CounterExecutorModule.json" with {type: "json"};

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
    publicClient,
    pimlicoClient,
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
  const [isModuleInstalled, setIsModuleInstalled] = useState<boolean>();

  const counterExecutorModule: InstallModuleParameters<SmartAccount> | undefined = useMemo(
    () =>
      address
        ? {
          type: "executor",
          address: "0x402A5947e74A234728fce825740D375Da4C80064",
          context: address,
        }
        : undefined,
    [address],
  );

  const CounterExecutor = useMemo(
    () => {
      return {
        ...CounterExecutorModuleJSON,
        module: counterExecutorModule
      };
    },
    [counterExecutorModule],
  );

  const incrementCount: Action | undefined = useMemo(
    () => {
      return CounterExecutor.module
        ? {
          target: CounterExecutor.module.address,
          value: 0n,
          data: {
            abi: CounterExecutor.abi,
            functionName: "incrementCount",
          },
        }
        : undefined;
    },
    [CounterExecutor.module],
  );

  const checkModuleInstalled = ({
    module,
    onModuleInstalled,
    onModuleNotInstalled,
    onError,
  }: {
    module: IsModuleInstalledParameters<SmartAccount>;
    onModuleInstalled?: () => any;
    onModuleNotInstalled?: () => any;
    onError?: (reason: any) => any;
  }) =>
    smartAccountClient!
      .isModuleInstalled(module)
      .then(
        (isModuleInstalled) => {
          setIsModuleInstalled(() => isModuleInstalled);
          if (isModuleInstalled) onModuleInstalled?.();
          else onModuleNotInstalled?.();
        }
      )
      .catch(onError);

  useEffect(
    () => {
      if (!smartAccountClient) return;
      if (!counterExecutorModule) return;

      checkModuleInstalled({
        module: counterExecutorModule,
        onModuleNotInstalled: () =>
          setResult(() => "Please install module to continue."),
        onError: console.error,
      });
    },
    [counterExecutorModule, smartAccountClient],
  );

  async function installCounterExecutorModule() {
    const opHash = await smartAccountClient!.installModule(CounterExecutor.module!);
    const receipt = await pimlicoClient.waitForUserOperationReceipt({
      hash: opHash,
    });

    const { transactionHash } = (
      await pimlicoClient.request({
        method: "eth_getUserOperationByHash",
        params: [receipt.userOpHash],
      })
    )!;

    const { status } = await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
    });

    if (status === "success") {
      await checkModuleInstalled({
        module: CounterExecutor.module!,
        onError: console.error,
      });
      return transactionHash;
    }

    throw { installCounterExecutorModuleStatus: status };
  };

  const getCount = useCallback(
    (account: SmartAccount) =>
      CounterExecutor.module
        ? publicClient.readContract({
          address: CounterExecutor.module.address,
          abi: CounterExecutor.abi,
          functionName: "getCount",
          account,
        })
        : undefined,
    [CounterExecutor.module],
  );

  async function onIncrementCount() {
    const hash = await smartAccountClient!.sendTransaction({
      callData: encodeExecuteSingle(incrementCount!),
    });

    const { status } = await publicClient.waitForTransactionReceipt({ hash });

    if (status == "success") return hash;
    throw { incrementCountStatus: status };
  }
  //#endregion

  useEffect(
    () => {
      if (result) return;
      if (!smartAccount) return;
      if (!CounterExecutor.module) return;

      getCount(smartAccount)?.then(
        (count) =>
          setResult(() => `Count: ${count}`)
      ).catch(setResultError);
    },
    [CounterExecutor.module, smartAccount, result],
  );

  const act = useCallback(
    <TxHash extends Hex>({
      perform,
      onSuccess,
      onError,
    }: {
      perform: () => Promise<TxHash>;
      onSuccess?: (txHash: TxHash) => any;
      onError?: (reason: any) => any;
    }) => {
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
    },
    [isLoading],
  );

  return <>
    <section id="center" className="relative">
      {isConnected && <div className="absolute top-3.25 right-3.25 z-50">
        <DynamicWidget variant="dropdown" />
      </div>}

      <div className="hero">
        <img src={heroImg} className="base" width="170" height="179" alt="" />
        <img src={reactLogo} className="framework" alt="React logo" />
        <img src={viteLogo} className="vite" alt="Vite logo" />
      </div>

      <div>
        <h1 className="text-3xl font-bold underline">
          Hello {address?.slice(0, 6)}...{address?.slice(-4)}
        </h1>
        <p>
          {!sdkHasLoaded
            ? "loading..."
            // : userWithMissingInfo
            //   ? "Please complete the onboarding process."
            : isUserLoggedIn
              ? "You are logged in!"
              : "Please log in to continue."}
        </p>
      </div>

      <div className="relative h-10.25">
        <div className="absolute loading loading-infinity my-auto top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-50" />

        {/* Connect Button */}
        {sdkHasLoaded && !isConnected &&
          <DynamicWidget variant="modal" />
        }

        {/* Install Module */}
        {smartAccountClient && counterExecutorModule && isModuleInstalled === false &&
          <button
            className={`btn ${isLoading ? "pointer-events-none" : "btn-primary"}`}
            onClick={() => act({
              perform: installCounterExecutorModule,
              onSuccess: (txHash) =>
                setResult(() => `Install module: https://sepolia-optimism.etherscan.io/tx/${txHash}`),
              onError: setResultError,
            })}
          >
            {isLoading && <span className="loading" />}
            {!isLoading ? "Install Module" : "Installing Module"}
          </button>
        }

        {/* Increment Count */}
        {smartAccountClient && counterExecutorModule && isModuleInstalled &&
          <button
            className={`btn ${isLoading ? "pointer-events-none" : "btn-primary"}`}
            onClick={() => act({
              perform: onIncrementCount,
              onSuccess: (txHash) => {
                setResult(() => `Increment count: https://sepolia-optimism.etherscan.io/tx/${txHash}`);

                if (!smartAccount) return;
                setTimeout(
                  () => {
                    getCount(smartAccount)?.then(
                      (count) =>
                        setResult(() => `Count: ${count}`)
                    ).catch(setResultError);
                  },
                  12_000,
                );
              },
              onError: setResultError,
            })}
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
