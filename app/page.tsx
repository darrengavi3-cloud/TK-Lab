"use client";

import { useEffect, useRef, useState } from "react";
import { createReaderBootMonitor, type ReaderBootState } from "./reader-boot";
import { validRouteHash, acceptedRouteMessage } from "../atlas/assets/app/route-contract.js";
import { RELEASE_VERSION } from "../atlas/assets/app/release-version.js";
import { ExploreHome } from "./explore-home";
import {rememberReading,parseReadingHistory,readingHistorySnapshot} from "../atlas/assets/app/reading-history.js";

export default function Home() {
  const [reading, setReading] = useState(false);
  useEffect(() => {
    const sync = () => {
      const active = validRouteHash(location.hash);
      setReading(active);
      if (!active) document.title = "探索 · 观史台";
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);
  return reading ? <Reader /> : <ExploreHome />;
}

function Reader() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [bootState, setBootState] = useState<ReaderBootState>("loading");
  const [attempt, setAttempt] = useState(0);
  const monitor = useRef<ReturnType<typeof createReaderBootMonitor> | null>(null);
  useEffect(() => {
    const boot = createReaderBootMonitor(setBootState);
    monitor.current = boot;
    let frameReady = false;
    let readerTitle = "继续阅读";
    let themeObserver: MutationObserver | undefined;
    let positionObserver: MutationObserver | undefined;
    let positionTimer: ReturnType<typeof setTimeout> | undefined;
    const sortedHash = (hash:string) => {const [module,query=""]=hash.split("?");const params=new URLSearchParams(query);params.sort();return module+"?"+params.toString();};
    const capturePosition = (title=readerTitle) => {
      const doc=frame.current?.contentDocument, hash=frame.current?.contentWindow?.location.hash;
      if (!doc || !hash || !validRouteHash(hash)) return;
      const key=hash.slice(1).split("?")[0];
      const selectors:Record<string,string>={people:".people-workbench",offices:".court-scroll",fangzhen:".fangzhen-workbench",jinshi:".jinshi-workbench",battle:".battle-workbench",shihuo:".shihuo-workbench",map:".history-map-page"};
      rememberReading({hash,title,scroll:doc.querySelector(selectors[key])?.scrollTop||0,drawerScroll:doc.querySelector(".el-drawer__body")?.scrollTop||0});
    };
    const restorePosition = () => {
      if (new URLSearchParams(location.search).get("resume")!=="1") return;
      const saved=parseReadingHistory(readingHistorySnapshot()).find(row=>sortedHash(row.hash)===sortedHash(location.hash));
      const doc=frame.current?.contentDocument;
      if (!saved || !doc) return;
      const apply=()=>{
        const shell=doc.querySelector('.shell[data-module-state="ready"]');
        if (!shell || sortedHash(frame.current?.contentWindow?.location.hash||"")!==sortedHash(saved.hash)) return;
        const key=saved.hash.slice(1).split("?")[0];
        const selector:Record<string,string>={people:".people-workbench",offices:".court-scroll",fangzhen:".fangzhen-workbench",jinshi:".jinshi-workbench",battle:".battle-workbench",shihuo:".shihuo-workbench",map:".history-map-page"};
        const scroller=doc.querySelector(selector[key]);if(scroller)scroller.scrollTop=saved.scroll;
        const drawer=doc.querySelector(".el-drawer__body");if(drawer)drawer.scrollTop=saved.drawerScroll||0;
        positionObserver?.disconnect();if(positionTimer)clearTimeout(positionTimer);
      };
      positionObserver?.disconnect();positionObserver=new MutationObserver(apply);positionObserver.observe(doc.documentElement,{subtree:true,childList:true,attributes:true});
      positionTimer=setTimeout(()=>positionObserver?.disconnect(),20_000);apply();
    };
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
      if (event.data?.type === "guanshitai:ready") { boot.ready(); if (!frameReady) { frameReady = true; sendRoute(); restorePosition(); } return; }
      if (!acceptedRouteMessage(event, frame.current?.contentWindow, location.origin)) return;
      if (location.hash !== event.data.hash) {
        history[event.data.mode === "push" ? "pushState" : "replaceState"](null, "", event.data.hash);
      }
      if (typeof event.data.title === "string") { readerTitle=event.data.title.slice(0,160); document.title=readerTitle; }
      if (new URLSearchParams(location.search).get("resume")!=="1") capturePosition(document.title);
    };
    window.addEventListener("message", receiveRoute);
    window.addEventListener("popstate", sendRoute);
    window.addEventListener("hashchange", sendRoute);
    const element = frame.current;
    element?.addEventListener("load", sendRoute);
    element?.addEventListener("load", syncFrameTheme);
    const beforeUnload=()=>capturePosition();
    window.addEventListener("beforeunload",beforeUnload);
    syncFrameTheme();
    sendRoute();
    return () => {
      capturePosition();positionObserver?.disconnect();if(positionTimer)clearTimeout(positionTimer);
      window.removeEventListener("beforeunload",beforeUnload);
      document.documentElement.style.removeProperty("--sgz-paper");
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
        src={`/reader/current?v=${RELEASE_VERSION.slice(1)}`}
        title="观史台 · 历史资料库"
        onError={() => monitor.current?.fail()}
      />
    </main>
  );
}
