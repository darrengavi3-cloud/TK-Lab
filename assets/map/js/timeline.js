/**
 * timeline.js — 时间轴控件
 * 借鉴 historical-map-project 的「时间滑块控件」思路，
 * 升级为关键事件锚点 + 自动播放（时间轴动画）。
 */

const Timeline = (function () {
  let periods = [];
  let onSelect = null;
  let current = -1;
  let timer = null;

  const track = () => document.getElementById('tl-track');
  const label = () => document.getElementById('tl-current');

  function init(periodsArr, selectCb) {
    periods = periodsArr;
    onSelect = selectCb;
    buildTrack();
    bindButtons();
  }

  function buildTrack() {
    const t = track();
    t.innerHTML = '';
    periods.forEach((p, i) => {
      const a = document.createElement('button');
      a.className = 'tl-anchor';
      a.dataset.index = i;
      a.innerHTML = `<span class="tl-dot"></span><span class="tl-name">${p.year} · ${p.name}</span><span class="tl-yr"></span>`;
      a.addEventListener('click', () => select(i, true));
      t.appendChild(a);
    });
  }

  function bindButtons() {
    document.getElementById('tl-prev').addEventListener('click', () => step(-1));
    document.getElementById('tl-next').addEventListener('click', () => step(1));
    document.getElementById('tl-play').addEventListener('click', togglePlay);
  }

  function select(i, animate) {
    if (i < 0 || i >= periods.length) return;
    current = i;
    updateUI();
    onSelect(i, { animate: animate !== false });
  }

  function step(d) {
    pause();
    const next = current + d;
    if (next < 0 || next >= periods.length) return;
    select(next, true);
  }

  function togglePlay() {
    if (timer) pause();
    else play();
  }

  function play() {
    if (timer) return;
    if (current >= periods.length - 1) select(0, true); // 从头播放
    document.getElementById('tl-play').classList.add('is-playing');
    document.getElementById('tl-play').textContent = '⏸';
    timer = setInterval(() => {
      if (current >= periods.length - 1) { pause(); return; }
      select(current + 1, true);
    }, 2800);
  }

  function pause() {
    if (timer) { clearInterval(timer); timer = null; }
    const btn = document.getElementById('tl-play');
    btn.classList.remove('is-playing');
    btn.textContent = '▶';
  }

  function updateUI() {
    const p = periods[current];
    label().innerHTML = `<b>${p.year} 年</b><span>${p.name}</span>`;
    Array.from(track().children).forEach((a, i) => {
      a.classList.toggle('is-active', i === current);
      a.classList.toggle('is-past', i < current);
    });
  }

  function getCurrent() { return current; }

  return { init, select, step, play, pause, getCurrent };
})();
