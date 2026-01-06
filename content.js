(() => {
  "use strict";

  const STORAGE_KEY = "yt_access_start_ms_v1";
  const OVERLAY_ID = "yt-elapsed-timer-overlay-v1";

  function now() {
    return Date.now();
  }

  function getStartMs() {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  }

  function ensureStartMs() {
    let start = getStartMs();
    if (!start) {
      start = now();
      sessionStorage.setItem(STORAGE_KEY, String(start));
    }
    return start;
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatElapsed(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }

  function createOverlay() {
    let el = document.getElementById(OVERLAY_ID);
    if (el) return el;

    el = document.createElement("div");
    el.id = OVERLAY_ID;
    el.setAttribute("role", "status");
    el.style.position = "fixed";
    el.style.top = "12px";
    el.style.right = "12px";
    el.style.zIndex = "2147483647";
    el.style.background = "rgba(0,0,0,0.72)";
    el.style.color = "#fff";
    el.style.padding = "8px 10px";
    el.style.borderRadius = "10px";
    el.style.fontFamily =
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
    el.style.fontSize = "13px";
    el.style.lineHeight = "1.2";
    el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.35)";
    el.style.userSelect = "none";
    el.style.cursor = "move";
    el.style.backdropFilter = "blur(6px)";
    el.style.webkitBackdropFilter = "blur(6px)";
    el.style.letterSpacing = "0.5px";

    // ドラッグで位置変更できるように（任意だけど便利）
    makeDraggable(el);

    const label = document.createElement("div");
    label.textContent = "YouTube経過";
    label.style.opacity = "0.85";
    label.style.fontSize = "11px";
    label.style.marginBottom = "2px";

    const value = document.createElement("div");
    value.dataset.timerValue = "1";
    value.textContent = "00:00:00";

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.marginTop = "6px";

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.dataset.timerReset = "1";
    resetButton.textContent = "リセット";
    resetButton.style.fontSize = "11px";
    resetButton.style.lineHeight = "1";
    resetButton.style.padding = "4px 6px";
    resetButton.style.borderRadius = "6px";
    resetButton.style.border = "1px solid rgba(255,255,255,0.35)";
    resetButton.style.background = "rgba(255,255,255,0.12)";
    resetButton.style.color = "#fff";
    resetButton.style.cursor = "pointer";
    resetButton.style.userSelect = "none";
    resetButton.style.transition = "background 150ms ease";

    resetButton.addEventListener("mouseenter", () => {
      resetButton.style.background = "rgba(255,255,255,0.22)";
    });
    resetButton.addEventListener("mouseleave", () => {
      resetButton.style.background = "rgba(255,255,255,0.12)";
    });
    resetButton.addEventListener("mousedown", (e) => {
      // ドラッグ開始を防ぐ
      e.stopPropagation();
    });

    actions.appendChild(resetButton);

    el.appendChild(label);
    el.appendChild(value);
    el.appendChild(actions);

    document.documentElement.appendChild(el);
    return el;
  }

  function makeDraggable(el) {
    let dragging = false;
    let startX = 0,
      startY = 0;
    let startTop = 0,
      startRight = 0;

    const onMouseDown = (e) => {
      // 右クリックや入力フォーカスを避ける
      if (e.button !== 0) return;
      dragging = true;
      el.style.transition = "none";

      startX = e.clientX;
      startY = e.clientY;

      // top/right を数値として取得
      startTop = parseFloat(el.style.top || "12");
      startRight = parseFloat(el.style.right || "12");

      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!dragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // rightはx方向が逆
      const newTop = Math.max(0, startTop + dy);
      const newRight = Math.max(0, startRight - dx);

      el.style.top = `${newTop}px`;
      el.style.right = `${newRight}px`;
    };

    const onMouseUp = () => {
      if (!dragging) return;
      dragging = false;
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseup", onMouseUp, { passive: true });
  }

  function startTicker() {
    let startMs = ensureStartMs();
    const overlay = createOverlay();
    const valueEl = overlay.querySelector('[data-timer-value="1"]');
    const resetButton = overlay.querySelector('[data-timer-reset="1"]');

    if (resetButton) {
      resetButton.addEventListener("click", () => {
        startMs = now();
        sessionStorage.setItem(STORAGE_KEY, String(startMs));
      });
    }

    const tick = () => {
      const elapsed = now() - startMs;
      if (valueEl) valueEl.textContent = formatElapsed(elapsed);
    };

    tick();
    setInterval(tick, 1000);
  }

  // YouTubeはSPAなので、DOM再構築で要素が消えることがある。
  // その場合も復活させる。
  function keepOverlayAlive() {
    const obs = new MutationObserver(() => {
      if (!document.getElementById(OVERLAY_ID)) {
        // overlay消失時だけ再生成（タイマーはsessionStorageなので継続）
        createOverlay();
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }

  startTicker();
  keepOverlayAlive();
})();
