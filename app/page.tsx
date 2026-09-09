"use client";

import { useEffect, useRef, useState } from "react";
import { createReaderBootMonitor, type ReaderBootState } from "./reader-boot";
import { validRouteHash, acceptedRouteMessage } from "../atlas/assets/app/route-contract.js";
import { RELEASE_VERSION } from "../atlas/assets/app/release-version.js";

export default function Home() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [bootState, setBootState] = useState<ReaderBootState>("loading");
  const [attempt, setAttempt] = useState(0);
  const monitor = useRef<ReturnType<typeof createReaderBootMonitor> | null>(null);
  useEffect(() => {
    const boot = createReaderBootMonitor(setBootState);
    monitor.current = boot;
    let frameReady = false;
    let themeObserver: MutationObserver | undefined;
    const syncFrameTheme = () => {
      themeObserver?.disconnect();
      const inner = frame.current?.contentDocument;
      if (!inner?.documentElement) return;
      const sync = () => {
        const color = inner.defaultView?.getComputedStyle(inner.documentElement).getPropertyValue('--sgz-paper').trim();
        if (color) document.documentElement.style.setProperty('--sgz-paper', color);
      };
      themeObserver = new MutationObserver(sync);
      themeObserver.observe(inner.documentElement, { attributes: true, attributeFilter: ['data-sgz-theme'] });
      sync();
    };
    const sendRoute = () => frame.current?.contentWindow?.postMessage({
      type: "guanshitai:host-route", hash: validRouteHash(location.hash) ? location.hash : "#offices",
    }, location.origin);
    const receiveRoute = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== location.origin) return;
      if (event.data?.type === "guanshitai:ready") { boot.ready(); if (!frameReady) { frameReady = true; sendRoute(); } return; }
      if (!acceptedRouteMessage(event, frame.current?.contentWindow, location.origin)) return;
      if (location.hash !== event.data.hash) {
        history[event.data.mode === "push" ? "pushState" : "replaceState"](null, "", event.data.hash);
      }
      if (typeof event.data.title === "string") document.title = event.data.title.slice(0, 160);
    };
    window.addEventListener("message", receiveRoute);
    window.addEventListener("popstate", sendRoute);
    window.addEventListener("hashchange", sendRoute);
    const element = frame.current;
    element?.addEventListener("load", sendRoute);
    element?.addEventListener("load", syncFrameTheme);
    syncFrameTheme();
    sendRoute();
    return () => {
      boot.dispose();
      window.removeEventListener("message", receiveRoute);
      window.removeEventListener("popstate", sendRoute);
      window.removeEventListener("hashchange", sendRoute);
      element?.removeEventListener("load", sendRoute);
      element?.removeEventListener("load", syncFrameTheme);
      themeObserver?.disconnect();
      document.documentElement.style.removeProperty('--sgz-paper');
    };
  }, [attempt]);
  const retry = () => {
    monitor.current?.dispose();
    setBootState("loading");
    setAttempt(value => value + 1);
  };
  return (
    <main className="legacy-shell" aria-busy={bootState === "loading"}>
      {bootState !== "ready" && (
        <section className="reader-boot" aria-label="打开观史台">
          <div className="reader-boot-panel">
            <p role="status">{bootState === "error" ? "案卷暂未打开" : "正在打开观史台"}</p>
            {bootState === "error" && <><p>请检查连接后重新打开，当前阅读位置会保留。</p><button type="button" onClick={retry}>重新打开</button></>}
          </div>
        </section>
      )}
      <iframe
        key={attempt}
        className="legacy-frame"
        ref={frame}
        src={`/legacy/index.html?v=${RELEASE_VERSION.slice(1)}`}
        title="观史台 · 历史资料库"
        onError={() => monitor.current?.fail()}
      />
    </main>
  );
}
