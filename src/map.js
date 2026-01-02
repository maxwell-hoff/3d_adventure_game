// 2D map overlay that renders the world data without revealing player position.

export function createMapOverlay({
  world,
  title = "Map (you are not shown)",
  toggleKey = "m",
  onOpen,
  onClose
}) {
  const root = document.createElement("div");
  root.id = "mapOverlay";
  root.style.cssText = `
    position: fixed; inset: 0;
    display: none;
    align-items: center; justify-content: center;
    background: rgba(0,0,0,0.55);
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    color: rgba(255,255,255,0.92);
    z-index: 50;
  `;

  const panel = document.createElement("div");
  panel.style.cssText = `
    width: min(860px, calc(100vw - 24px));
    height: min(720px, calc(100vh - 24px));
    border-radius: 18px;
    background: rgba(15,15,18,0.75);
    border: 1px solid rgba(255,255,255,0.14);
    box-shadow: 0 18px 60px rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    overflow: hidden;
    display: grid;
    grid-template-rows: auto 1fr auto;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    padding: 12px 14px;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  `;

  const h = document.createElement("div");
  h.textContent = title;
  h.style.cssText = `font-weight: 700; letter-spacing: 0.2px;`;

  const hint = document.createElement("div");
  hint.textContent = `Toggle: ${toggleKey.toUpperCase()}  •  This map does not show your current location.`;
  hint.style.cssText = `opacity: 0.85; font-size: 12px;`;

  header.append(h, hint);

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 700;
  canvas.style.cssText = `
    width: 100%;
    height: 100%;
    display: block;
    background: radial-gradient(circle at 30% 25%, rgba(255,255,255,0.08), rgba(255,255,255,0.02));
  `;

  const footer = document.createElement("div");
  footer.style.cssText = `
    padding: 10px 14px;
    border-top: 1px solid rgba(255,255,255,0.08);
    display: flex;
    justify-content: space-between;
    gap: 12px;
    opacity: 0.9;
    font-size: 12px;
  `;
  footer.innerHTML = `<div><b>Legend</b>: paths (tan), water (blue), stone (gray), rock (slate), dead tree (brown)</div>
                      <div><b>North</b> is up</div>`;

  panel.append(header, canvas, footer);
  root.append(panel);
  document.body.append(root);

  let isOpen = false;

  function resizeCanvasToDisplaySize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { dpr };
  }

  function worldToMap(ctx, x, z) {
    // World coords in [-bounds..bounds] map to canvas space with padding.
    const pad = 34;
    const b = world.bounds ?? 240;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const nx = (x + b) / (2 * b);
    const nz = (z + b) / (2 * b);
    return {
      x: pad + nx * (w - pad * 2),
      y: pad + (1 - nz) * (h - pad * 2) // north = -z is up, so invert z
    };
  }

  function draw() {
    const { dpr } = resizeCanvasToDisplaySize();
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background parchment-ish noise
    ctx.fillStyle = "rgba(12,12,16,0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      ctx.fillRect(x, y, 1, 1);
    }

    // border
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = Math.max(1, 2 * dpr);
    ctx.strokeRect(16 * dpr, 16 * dpr, canvas.width - 32 * dpr, canvas.height - 32 * dpr);

    // north arrow
    ctx.save();
    ctx.translate(canvas.width - 70 * dpr, 60 * dpr);
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = Math.max(1, 2 * dpr);
    ctx.beginPath();
    ctx.moveTo(0, 28 * dpr);
    ctx.lineTo(0, -18 * dpr);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -22 * dpr);
    ctx.lineTo(-7 * dpr, -10 * dpr);
    ctx.lineTo(7 * dpr, -10 * dpr);
    ctx.closePath();
    ctx.fill();
    ctx.fillText("N", 10 * dpr, -8 * dpr);
    ctx.restore();

    // paths
    ctx.strokeStyle = "rgba(195,165,115,0.9)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const path of world.paths ?? []) {
      const width = (path.width ?? 5) * 0.9;
      ctx.lineWidth = Math.max(1, width * 0.7 * dpr);
      const pts = path.points ?? [];
      if (pts.length < 2) continue;
      ctx.beginPath();
      const p0 = worldToMap(ctx, pts[0].x, pts[0].z);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < pts.length; i++) {
        const p = worldToMap(ctx, pts[i].x, pts[i].z);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // landmarks
    for (const lm of world.landmarks ?? []) {
      const p = worldToMap(ctx, lm.x, lm.z);
      let color = "rgba(220,220,220,0.85)";
      if (lm.type === "water") color = "rgba(120,175,255,0.9)";
      if (lm.type === "stone") color = "rgba(210,210,210,0.85)";
      if (lm.type === "rock") color = "rgba(175,190,205,0.85)";
      if (lm.type === "tree") color = "rgba(205,160,120,0.85)";

      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = Math.max(1, 2 * dpr);

      // icon
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // label
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.font = `${Math.floor(12 * dpr)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.fillText(lm.name, p.x + 10 * dpr, p.y - 8 * dpr);
    }
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    root.style.display = "flex";
    if (typeof onOpen === "function") onOpen();
    draw();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    root.style.display = "none";
    if (typeof onClose === "function") onClose();
  }

  function toggle() {
    if (isOpen) close();
    else open();
  }

  // Close on background click (but not when clicking inside panel)
  root.addEventListener("click", () => close());
  panel.addEventListener("click", (e) => e.stopPropagation());

  addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === toggleKey) toggle();
  });
  addEventListener("resize", () => {
    if (isOpen) draw();
  });

  return {
    open,
    close,
    toggle,
    redraw: draw,
    get isOpen() { return isOpen; }
  };
}


