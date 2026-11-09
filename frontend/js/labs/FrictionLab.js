export default {
  name: 'FrictionLab',
  data() {
    return {
      alpha: 20.0,
      mu: 0.40,
      mass: 2.0,
      g: 9.81,
      isAnimationEnabled: true,
      autoLoop: true,
      showProjections: true,
      blockOffset: 0,
      blockVelocity: 0,
      lastFrameTime: performance.now(),
      animationFrameId: null,
      isDraggingGraph: false
    };
  },
  computed: {
    physics() {
      const alphaRad = (this.alpha * Math.PI) / 180;
      const critAngleRad = Math.atan(this.mu);
      const critAngleDeg = (critAngleRad * 180) / Math.PI;

      const mg = this.mass * this.g;
      const fPull = mg * Math.sin(alphaRad);
      const fNormal = mg * Math.cos(alphaRad);
      const fMaxStatic = this.mu * fNormal;

      const isSliding = this.alpha > critAngleDeg + 1e-4;
      const fFriction = isSliding ? fMaxStatic : fPull;
      const netForce = isSliding ? Math.max(0, fPull - fMaxStatic) : 0;
      const accel = netForce / this.mass;

      return {
        alphaRad,
        critAngleDeg,
        critAngleRad,
        mg,
        fPull,
        fNormal,
        fMaxStatic,
        fFriction,
        isSliding,
        accel
      };
    }
  },
  mounted() {
    this.resizeCanvases();
    window.addEventListener('resize', this.resizeCanvases);
    this.lastFrameTime = performance.now();
    this.animate(this.lastFrameTime);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeCanvases);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  },
  methods: {
    setCritAngle() {
      this.alpha = Math.min(85, Math.round(this.physics.critAngleDeg * 2) / 2);
      this.resetPos();
    },
    resetPos() {
      this.blockOffset = 0;
      this.blockVelocity = 0;
    },
    resizeCanvases() {
      const dpr = window.devicePixelRatio || 1;
      const simCanvas = this.$refs.simCanvas;
      const graphCanvas = this.$refs.graphCanvas;
      if (!simCanvas || !graphCanvas) return;

      const simRect = simCanvas.parentElement.getBoundingClientRect();
      simCanvas.width = simRect.width * dpr;
      simCanvas.height = simRect.height * dpr;
      simCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);

      const graphRect = graphCanvas.parentElement.getBoundingClientRect();
      graphCanvas.width = graphRect.width * dpr;
      graphCanvas.height = graphRect.height * dpr;
      graphCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    drawVector(ctx, x1, y1, x2, y2, color, label, labelOffset = { x: 0, y: 0 }, dashed = false) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 4) return;

      const angle = Math.atan2(dy, dx);
      const headLen = Math.min(10, Math.max(6, len * 0.25));

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = dashed ? 1.5 : 2.2;
      if (dashed) ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        const tx = x2 + labelOffset.x;
        const ty = y2 + labelOffset.y;
        ctx.fillStyle = "#0a0d14";
        const w = ctx.measureText(label).width;
        ctx.fillRect(tx - 3, ty - 10, w + 6, 14);
        ctx.fillStyle = color;
        ctx.fillText(label, tx, ty + 1);
      }
      ctx.restore();
    },
    renderSimulation() {
      const canvas = this.$refs.simCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const phys = this.physics;

      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 28) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 28) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.restore();

      // Plane geometry
      const pivotX = Math.max(140, w * 0.22);
      const pivotY = h - 50;
      const planeLen = Math.min(w - pivotX - 40, h - 80, 380);
      const alpha = phys.alphaRad;
      const topX = pivotX + planeLen * Math.cos(alpha);
      const topY = pivotY - planeLen * Math.sin(alpha);

      // Wedge
      ctx.save();
      ctx.fillStyle = "#111520";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(topX, topY);
      ctx.lineTo(topX, pivotY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Floor
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.beginPath();
      ctx.moveTo(pivotX - 80, pivotY);
      ctx.lineTo(w - 20, pivotY);
      ctx.stroke();

      // Slope line
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(topX, topY);
      ctx.stroke();

      // Roughness hatch
      ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
      ctx.lineWidth = 1;
      const step = Math.max(6, 16 - this.mu * 8);
      for (let d = 8; d < planeLen - 8; d += step) {
        const sx = pivotX + d * Math.cos(alpha);
        const sy = pivotY - d * Math.sin(alpha);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 4 * Math.sin(alpha) - 3 * Math.cos(alpha), sy + 4 * Math.cos(alpha) + 3 * Math.sin(alpha));
        ctx.stroke();
      }

      // Angle arc
      if (this.alpha > 1) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 40, -alpha, 0, false);
        ctx.stroke();
        ctx.fillStyle = "#38bdf8";
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.fillText(`α=${this.alpha.toFixed(1)}°`, pivotX + 48, pivotY - 12);
      }
      ctx.restore();

      // Block
      const blockW = 60;
      const blockH = 36;
      const startDist = planeLen * 0.7;
      const pxOffset = this.blockOffset * 60;
      const minDist = blockW * 0.7;
      let curDist = startDist - pxOffset;

      if (curDist < minDist) {
        if (this.autoLoop && phys.isSliding && this.isAnimationEnabled) {
          this.blockOffset = 0;
          this.blockVelocity = 0;
          curDist = startDist;
        } else {
          curDist = minDist;
          this.blockVelocity = 0;
        }
      }

      const contactX = pivotX + curDist * Math.cos(alpha);
      const contactY = pivotY - curDist * Math.sin(alpha);
      const normX = -Math.sin(alpha);
      const normY = -Math.cos(alpha);
      const cmX = contactX + normX * (blockH / 2);
      const cmY = contactY + normY * (blockH / 2);

      ctx.save();
      ctx.translate(cmX, cmY);
      ctx.rotate(-alpha);
      ctx.fillStyle = phys.isSliding ? "#b45309" : "#1e3a8a";
      ctx.strokeStyle = phys.isSliding ? "#f59e0b" : "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-blockW / 2, -blockH / 2, blockW, blockH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "600 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${this.mass}kg`, 0, 4);
      ctx.restore();

      // Vectors
      const vScale = 90 / Math.max(phys.mg, 1);
      const downX = -Math.cos(alpha);
      const downY = Math.sin(alpha);
      const upX = Math.cos(alpha);
      const upY = -Math.sin(alpha);
      const intoX = Math.sin(alpha);
      const intoY = Math.cos(alpha);

      const mgLen = phys.mg * vScale;
      const pullLen = phys.fPull * vScale;
      const normLen = phys.fNormal * vScale;
      const fricLen = phys.fFriction * vScale;

      if (this.showProjections && this.alpha > 0.5) {
        this.drawVector(ctx, cmX, cmY, cmX + intoX * normLen, cmY + intoY * normLen, "#c084fc", "mg·cosα", { x: 6, y: 10 }, true);
        this.drawVector(ctx, cmX, cmY, cmX + downX * pullLen, cmY + downY * pullLen, "#fbbf24", "mg·sinα", { x: -50, y: 12 }, false);
      }

      this.drawVector(ctx, cmX, cmY, cmX, cmY + mgLen, "#38bdf8", "mg", { x: -24, y: 12 }, false);
      this.drawVector(ctx, cmX, cmY, cmX + normX * normLen, cmY + normY * normLen, "#34d399", "N", { x: -18, y: -6 }, false);

      if (phys.fFriction > 0.05) {
        this.drawVector(ctx, cmX, cmY, cmX + upX * fricLen, cmY + upY * fricLen, "#f43f5e", "F_тр", { x: 6, y: -6 }, false);
      }

      if (phys.isSliding && phys.accel > 0.05) {
        const aLen = Math.min(60, phys.accel * 5);
        this.drawVector(ctx, cmX + normX * 30, cmY + normY * 30, cmX + normX * 30 + downX * aLen, cmY + normY * 30 + downY * aLen, "#818cf8", `a=${phys.accel.toFixed(1)}`, { x: -30, y: -8 }, false);
      }
    },
    renderGraph() {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const phys = this.physics;

      ctx.clearRect(0, 0, w, h);

      const padL = 44, padR = 20, padT = 20, padB = 30;
      const pW = w - padL - padR;
      const pH = h - padT - padB;
      const maxF = Math.max(phys.mg * 1.05, phys.mg * this.mu * 1.05, 10);

      const degX = (deg) => padL + (deg / 90) * pW;
      const fY = (f) => padT + pH - (f / maxF) * pH;

      // Zones
      const critX = degX(Math.min(90, phys.critAngleDeg));
      ctx.fillStyle = "rgba(52, 211, 153, 0.04)";
      ctx.fillRect(padL, padT, critX - padL, pH);
      ctx.fillStyle = "rgba(251, 191, 36, 0.04)";
      ctx.fillRect(critX, padT, padL + pW - critX, pH);

      // Axes & grid
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#64748b";

      for (let deg = 0; deg <= 90; deg += 15) {
        const x = degX(deg);
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + pH); ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText(`${deg}°`, x, padT + pH + 15);
      }

      for (let i = 0; i <= 4; i++) {
        const val = (maxF / 4) * i;
        const y = fY(val);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + pW, y); ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(val.toFixed(0), padL - 6, y + 3);
      }

      // F_тр curve
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let deg = 0; deg <= 90; deg += 0.5) {
        const rad = (deg * Math.PI) / 180;
        const f = deg <= phys.critAngleDeg ? phys.mg * Math.sin(rad) : this.mu * phys.mg * Math.cos(rad);
        const x = degX(deg);
        const y = fY(f);
        if (deg === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Current point
      const curX = degX(this.alpha);
      const curY = fY(phys.fFriction);

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(curX, curY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    },
    onGraphMouseDown(e) {
      this.isDraggingGraph = true;
      this.updateAngleFromEvent(e);
      window.addEventListener('mousemove', this.onGraphMouseMove);
      window.addEventListener('mouseup', this.onGraphMouseUp);
    },
    onGraphMouseMove(e) {
      if (this.isDraggingGraph) this.updateAngleFromEvent(e);
    },
    onGraphMouseUp() {
      this.isDraggingGraph = false;
      window.removeEventListener('mousemove', this.onGraphMouseMove);
      window.removeEventListener('mouseup', this.onGraphMouseUp);
    },
    updateAngleFromEvent(e) {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const padL = 44, padR = 20;
      const pW = rect.width - padL - padR;
      let deg = ((x - padL) / pW) * 90;
      deg = Math.max(0, Math.min(85, deg));
      this.alpha = Math.round(deg * 2) / 2;
    },
    animate(now) {
      const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      if (this.isAnimationEnabled && this.physics.isSliding) {
        this.blockVelocity += this.physics.accel * dt;
        this.blockOffset += this.blockVelocity * dt;
      } else if (!this.physics.isSliding) {
        this.blockVelocity = 0;
      }

      this.renderSimulation();
      this.renderGraph();
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  },
  template: `
    <div class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Main Simulation Visuals (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          <!-- Canvas 1: Setup -->
          <div class="lab-panel p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">Динамическая схема</span>
                <span v-if="physics.isSliding" class="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Скольжение (α > α_кр)
                </span>
                <span v-else class="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Покой
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="isAnimationEnabled = !isAnimationEnabled"
                  class="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  {{ isAnimationEnabled ? 'Пауза' : 'Пуск' }}
                </button>
                <button
                  @click="resetPos"
                  class="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Сброс
                </button>
              </div>
            </div>

            <div class="w-full h-80 bg-[#080b11] rounded border border-white/5 relative overflow-hidden">
              <canvas ref="simCanvas" class="w-full h-full block"></canvas>
            </div>
          </div>

          <!-- Canvas 2: Chart -->
          <div class="lab-panel p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">График зависимости F_тр(α)</span>
              <span class="text-[11px] text-slate-500 font-mono">Кликните по графику для изменения угла</span>
            </div>
            <div class="w-full h-56 bg-[#080b11] rounded border border-white/5 relative overflow-hidden">
              <canvas
                ref="graphCanvas"
                class="w-full h-full block cursor-crosshair"
                @mousedown="onGraphMouseDown"
                @touchstart.passive="updateAngleFromEvent"
              ></canvas>
            </div>
          </div>
        </div>

        <!-- Controls & Dashboard (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <!-- Controls -->
          <div class="lab-panel p-4 space-y-4">
            <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">Параметры</span>
              <button
                @click="setCritAngle"
                class="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/20 transition"
              >
                α = α_кр
              </button>
            </div>

            <!-- Alpha Slider -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Угол наклона α</span>
                <span class="font-mono text-sky-400 font-semibold">{{ alpha.toFixed(1) }}°</span>
              </div>
              <input type="range" min="0" max="85" step="0.5" v-model.number="alpha" />
            </div>

            <!-- Mu Slider -->
            <div class="space-y-1.5 pt-2 border-t border-white/5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Коэффициент трения μ</span>
                <span class="font-mono text-sky-400 font-semibold">{{ mu.toFixed(2) }}</span>
              </div>
              <input type="range" min="0.05" max="1.0" step="0.01" v-model.number="mu" />
              <div class="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  v-for="p in [{ l: 'Лёд', v: 0.1 }, { l: 'Дерево', v: 0.4 }, { l: 'Резина', v: 0.75 }]"
                  :key="p.l"
                  @click="mu = p.v"
                  :class="[
                    'py-1 text-[11px] font-mono rounded border transition text-center',
                    Math.abs(mu - p.v) < 0.01
                      ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                      : 'bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  {{ p.l }} {{ p.v }}
                </button>
              </div>
            </div>

            <!-- Mass Slider -->
            <div class="space-y-1.5 pt-2 border-t border-white/5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Масса бруска m</span>
                <span class="font-mono text-sky-400 font-semibold">{{ mass.toFixed(1) }} кг</span>
              </div>
              <input type="range" min="0.5" max="10.0" step="0.5" v-model.number="mass" />
            </div>
          </div>

          <!-- Realtime metrics -->
          <div class="lab-panel p-4 space-y-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-300 block border-b border-white/10 pb-2">
              Расчетные величины
            </span>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Критический угол</span>
                <span class="text-sm font-semibold text-white">{{ physics.critAngleDeg.toFixed(2) }}°</span>
              </div>
              <div class="bg-rose-950/20 p-2.5 rounded border border-rose-500/20">
                <span class="text-[10px] text-rose-300 block">Сила трения F_тр</span>
                <span class="text-sm font-semibold text-rose-400">{{ physics.fFriction.toFixed(2) }} Н</span>
              </div>
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Скатывающая F_скат</span>
                <span class="text-sm font-semibold text-amber-400">{{ physics.fPull.toFixed(2) }} Н</span>
              </div>
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Ускорение a</span>
                <span class="text-sm font-semibold text-indigo-300">{{ physics.accel.toFixed(2) }} м/с²</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
