"use client";

import { useEffect, useRef } from "react";
import { validRouteHash, acceptedRouteMessage } from "../atlas/assets/app/route-contract.js";

export default function Home() {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const sendRoute = () => frame.current?.contentWindow?.postMessage({
      type: "guanshitai:host-route", hash: validRouteHash(location.hash) ? location.hash : "#offices",
    }, location.origin);
    const receiveRoute = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== location.origin) return;
      if (event.data?.type === "guanshitai:ready") { sendRoute(); return; }
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
    sendRoute();
    return () => {
      window.removeEventListener("message", receiveRoute);
      window.removeEventListener("popstate", sendRoute);
      window.removeEventListener("hashchange", sendRoute);
      element?.removeEventListener("load", sendRoute);
    };
  }, []);
  return (
    <main className="legacy-shell">
      <iframe
        className="legacy-frame"
        ref={frame}
        src="/legacy/index.html?v=73"
        title="观史台 · 历史资料库"
      />
    </main>
  );
}
