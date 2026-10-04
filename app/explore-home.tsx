"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {readingHistorySnapshot, parseReadingHistory, clearReadingHistory} from "../atlas/assets/app/reading-history.js";

type Person = { personId: string; name: string; aliases?: string[]; zi?: string; dynastyTags?: string[] };
const modules = [
  ["people", "人物记", "生平、任官与原典"],
  ["offices", "职官谱", "官署、职掌与制度"],
  ["fangzhen", "州镇表", "地方军政与时期对照"],
  ["jinshi", "金石录", "释文、异文与著录"],
] as const;
const personHref = (id: string) => "#people?person=" + encodeURIComponent(id);
function subscribeQuery(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener("guanshitai:home-query", notify);
  return () => { window.removeEventListener("popstate", notify); window.removeEventListener("guanshitai:home-query", notify); };
}
function subscribeReading(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener("guanshitai:reading-history", notify);
  return () => {window.removeEventListener("storage", notify);window.removeEventListener("guanshitai:reading-history", notify);};
}

export function ExploreHome() {
  const [people, setPeople] = useState<Person[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const query = useSyncExternalStore(subscribeQuery, () => new URLSearchParams(location.search).get("q") || "", () => "");
  const search = useRef<HTMLInputElement>(null);
  const recentSnapshot = useSyncExternalStore(subscribeReading, readingHistorySnapshot, () => "[]");
  const recent = useMemo(() => parseReadingHistory(recentSnapshot), [recentSnapshot]);
  const resume = () => {const url=new URL(location.href);url.searchParams.set("resume","1");history.replaceState(null,"",url.pathname+url.search+url.hash);};
  useEffect(() => {
    const saved = new URLSearchParams(location.search).get("q") || "";
    if (saved) search.current?.focus();
  }, []);
  const changeQuery = (value: string) => {
    const url = new URL(location.href);
    if (value) url.searchParams.set("q", value); else url.searchParams.delete("q");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
    window.dispatchEvent(new Event("guanshitai:home-query"));
  };
  useEffect(() => {
    const controller = new AbortController();
    let expired = false;
    const timer = setTimeout(() => { expired = true; controller.abort(); setState("error"); }, 20_000);
    (async () => {
      // Follow the active fixed reader snapshot; never substitute candidate data.
      const current = await fetch("/reader/current", { signal: controller.signal, cache: "no-store" });
      if (!current.ok) throw new Error("Reader unavailable");
      const url = new URL("data/v63-reader-people.json", current.url);
      if (url.origin !== location.origin) throw new Error("Unexpected reader origin");
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("People unavailable");
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("people" in payload) || !Array.isArray(payload.people)) throw new Error("Invalid reader data");
      const published = payload.people.filter((p): p is Person => !!p && typeof p === "object" && typeof p.personId === "string" && typeof p.name === "string");
      if (!controller.signal.aborted) {
        setPeople(published);
        setState("ready");
        clearTimeout(timer);
      }
    })().catch(() => { if (!controller.signal.aborted || expired) setState("error"); clearTimeout(timer); });
    return () => { clearTimeout(timer); controller.abort(); };
  }, [attempt]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && !event.isComposing) {
        event.preventDefault(); search.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const matches = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return [];
    return people.filter(p => [p.name, p.zi, ...(p.aliases || [])].some(v => v?.toLocaleLowerCase().includes(q)))
      .sort((a, b) => Number(b.name === query.trim()) - Number(a.name === query.trim()));
  }, [people, query]);
  const featured = ["山濤", "山涛", "羊祜", "陸抗", "陆抗"].flatMap(name => people.filter(p => p.name === name)).filter((p, i, all) => all.findIndex(other => other.personId === p.personId) === i).slice(0, 3);
  return <div className="atlas-home">
    <a className="atlas-skip" href="#explore-main">跳到探索</a>
    <header className="atlas-header"><Link className="atlas-wordmark" href="/">观史台</Link><span>历史研究工作台</span><a className="atlas-button atlas-button-secondary" href="/admin/research">研究案卷</a></header>
    <div className="atlas-layout">
      <nav className="atlas-sidebar" aria-label="探索导航">
        <Link href="/" aria-current="page">首页</Link>
        {modules.map(([key, title]) => <a key={key} href={"#" + key}>{title}</a>)}
        <div className="atlas-nav-secondary"><a href="#battle">战事纪</a><a href="#shihuo">食货志</a><a href="#map">形势图</a><a href="/admin/research">研究案卷</a></div>
      </nav>
      <main id="explore-main" className="atlas-main">
        <section className="atlas-explore" aria-labelledby="explore-title">
          <p className="atlas-eyebrow">人物 · 制度 · 史料</p>
          <h1 id="explore-title">从人物开始研究。</h1>
          <div className="atlas-search"><label htmlFor="person-search">搜索人物</label><div className="atlas-search-control"><span aria-hidden="true">⌕</span><input id="person-search" ref={search} value={query} onChange={e => changeQuery(e.target.value)} placeholder="姓名、表字或别名" type="search" autoComplete="off"/>{query && <button type="button" onClick={() => { changeQuery(""); search.current?.focus(); }} aria-label="清除人物搜索">清除</button>}<kbd>⌘ K</kbd></div></div>
          <div className="atlas-results" aria-live="polite" aria-busy={state === "loading"}>
            {state === "loading" && <p role="status">正在载入已发布的人物资料…</p>}
            {state === "error" && <div role="alert"><p>人物资料暂未载入。你仍可从下方入口打开案卷。</p><button className="atlas-button atlas-button-secondary" type="button" onClick={() => { setState("loading"); setAttempt(v => v + 1); }}>重新载入</button></div>}
            {state === "ready" && query.trim() && <><p>{matches.length ? `找到 ${matches.length} 位人物` : "没有匹配的人物，请尝试别名或其他写法。"}</p><div className="atlas-result-links">{matches.slice(0, 8).map(p => <a key={p.personId} href={personHref(p.personId)}><strong>{p.name}</strong><span>{[p.zi ? "字 " + p.zi : "", ...(p.dynastyTags || [])].filter(Boolean).join(" · ")}</span></a>)}</div>{matches.length > 8 && <a href={"#people?q=" + encodeURIComponent(query)}>查看全部匹配人物</a>}</>}
          </div>
        </section>
        {recent.length > 0 && <section className="atlas-recent atlas-panel" aria-label="最近阅读"><div><h2>继续上次阅读</h2><button type="button" className="atlas-button atlas-button-secondary" onClick={clearReadingHistory}>清除最近阅读</button></div><p>阅读位置仅保存在本设备。</p><nav aria-label="最近阅读记录">{recent.map(entry=><a key={entry.hash} href={entry.hash} onClick={resume}>{entry.title}</a>)}</nav></section>}
        <div className="atlas-home-cards">
          <section className="atlas-panel" aria-labelledby="people-entry"><p className="atlas-eyebrow">人物探索</p><h2 id="people-entry">沿着生平，寻找线索。</h2><div className="atlas-featured">{featured.map(p => <a key={p.personId} href={personHref(p.personId)}><strong>{p.name}</strong><span>{(p.dynastyTags || []).join(" · ")}</span></a>)}</div><a className="atlas-button" href="#people">浏览人物档案</a></section>
          <section className="atlas-panel atlas-research-entry"><p className="atlas-eyebrow">私人研究</p><h2>把不同说法，<br/>放回原始证据中。</h2><p>整理事件、并读材料、保存你的判断。</p><a className="atlas-button atlas-button-secondary" href="/admin/research">打开研究案卷</a></section>
        </div>
        <section className="atlas-directory" aria-label="资料入口">{modules.slice(1).map(([key, title, copy]) => <a key={key} href={"#" + key}><h2>{title}</h2><p>{copy}</p></a>)}</section>
      </main>
    </div>
  </div>;
}
