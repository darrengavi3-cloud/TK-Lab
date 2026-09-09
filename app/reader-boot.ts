export type ReaderBootState = "loading" | "ready" | "error";

export function createReaderBootMonitor(
  onState: (state: ReaderBootState) => void,
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> = setTimeout,
  cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout,
) {
  let disposed = false;
  let state: ReaderBootState = "loading";
  const timer = schedule(() => {
    if (!disposed && state === "loading") { state = "error"; onState(state); }
  }, 20_000);
  return {
    ready() { if (!disposed) { cancel(timer); state = "ready"; onState(state); } },
    fail() { if (!disposed && state !== "ready") { cancel(timer); state = "error"; onState(state); } },
    dispose() { disposed = true; cancel(timer); },
  };
}
