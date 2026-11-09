export default {
  name: 'BallisticsLab',
  data() {
    return {
      v0: 25.0,
      alpha: 45.0,
      h0: 0.0,
      mass: 1.0,
      g: 9.81,

      showForces: true,
      showVelocityVectors: true,
      showVectorValues: true,

      simTime: 0,
      isRunning: false,
      history: [],
      lastTime: performance.now(),
      animationFrameId: null,
      isDraggingGraph: false,
      isDraggingCannon: false
    };
  },
  computed: {
    alphaRad() {
      return (this.alpha * Math.PI) / 180;
    },
    v0x() {
      return this.v0 * Math.cos(this.alphaRad);
    },
    v0y() {
      return this.v0 * Math.sin(this.alphaRad);
    },
    totalFlightTime() {
      const d = this.v0y * this.v0y + 2 * this.g * this.h0;
      return (this.v0y + Math.sqrt(d)) / this.g;
    },
    maxHeight() {
      return this.h0 + (this.v0y * this.v0y) / (2 * this.g);
    },
    flightRange() {
      return this.v0x * this.totalFlightTime;
    },
    currentPos() {
      const t = Math.min(this.simTime, this.totalFlightTime);
      const x = this.v0x * t;
      const y = Math.max(0, this.h0 + this.v0y * t - 0.5 * this.g * t * t);
      const vx = this.v0x;
      const vy = this.v0y - this.g * t;
      return { x, y, vx, vy, t };
    },
    telemetry() {
      const cur = this.currentPos;
      const v = Math.hypot(cur.vx, cur.vy);
      const theta = (Math.atan2(cur.vy, cur.vx) * 180) / Math.PI;
      const ek = 0.5 * this.mass * v * v;
      const ep = this.mass * this.g * cur.y;
      const totalEnergy = ek + ep;
      const fGravity = this.mass * this.g;
      const rApex = (this.v0x * this.v0x) / this.g;
      const vLand = Math.sqrt(this.v0 * this.v0 + 2 * this.g * this.h0);
      return {
        v,
        theta,
        ek,
        ep,
        totalEnergy,
        fGravity,
        rApex,
        vLand
      };
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.resizeCanvases();
      window.addEventListener('resize', this.resizeCanvases);
      this.lastTime = performance.now();
      this.animate(this.lastTime);
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeCanvases);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  },
  methods: {
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
      ctx.lineWidth = dashed ? 1.6 : 2.2;
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
        const metrics = ctx.measureText(label);
        ctx.fillStyle = "rgba(9, 13, 22, 0.88)";
        ctx.beginPath();
        ctx.roundRect(tx - 4, ty - 10, metrics.width + 8, 15, 3);
        ctx.fill();
        ctx.fillStyle = color;
        ctx.fillText(label, tx, ty + 1);
      }
      ctx.restore();
    },
    fire() {
      this.simTime = 0;
      this.history = [];
      this.isRunning = true;
    },
    reset() {
      this.simTime = 0;
      this.history = [];
      this.isRunning = false;
    },
    resizeCanvases() {
      const dpr = window.devicePixelRatio || 1;
      const simCanvas = this.$refs.simCanvas;
      const graphCanvas = this.$refs.graphCanvas;
      if (!simCanvas || !graphCanvas) return;

      const simRect = simCanvas.getBoundingClientRect();
      if (simRect.width > 0 && simRect.height > 0) {
        simCanvas.width = simRect.width * dpr;
        simCanvas.height = simRect.height * dpr;
        simCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const graphRect = graphCanvas.getBoundingClientRect();
      if (graphRect.width > 0 && graphRect.height > 0) {
        graphCanvas.width = graphRect.width * dpr;
        graphCanvas.height = graphRect.height * dpr;
        graphCanvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    },
    renderSimulation() {
      const canvas = this.$refs.simCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // Сетка
      ctx.save();
      ctx.strokeStyle = "rgba(30, 41, 59, 0.45)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.restore();

      const originX = 60;
      const groundY = h - 50;
      const maxPlotX = Math.max(80, this.flightRange * 1.15);
      const maxPlotY = Math.max(30, this.maxHeight * 1.3);
      const scaleX = (w - originX - 40) / maxPlotX;
      const scaleY = (groundY - 35) / maxPlotY;

      // Горизонт земли
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX - 30, groundY);
      ctx.lineTo(w - 20, groundY);
      ctx.stroke();

      // Стартовая башня
      if (this.h0 > 0.1) {
        ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1.5;
        const towerH = this.h0 * scaleY;
        ctx.fillRect(originX - 10, groundY - towerH, 20, towerH);
        ctx.strokeRect(originX - 10, groundY - towerH, 20, towerH);
      }

      // Пушечное сопло
      const startX = originX;
      const startY = groundY - this.h0 * scaleY;
      const barrelLen = 34;
      const barrelEndX = startX + barrelLen * Math.cos(this.alphaRad);
      const barrelEndY = startY - barrelLen * Math.sin(this.alphaRad);

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(barrelEndX, barrelEndY);
      ctx.stroke();

      // Интерактивная ручка поворота дула
      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(barrelEndX, barrelEndY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Дуга угла вылета
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(startX, startY, 44, -this.alphaRad, 0, false);
      ctx.stroke();
      ctx.fillStyle = "#38bdf8";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.fillText(`${this.alpha.toFixed(0)}°`, startX + 50, startY - 8);

      // Теоретическая парабола (пунктир)
      ctx.save();
      ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const steps = 100;
      for (let i = 0; i <= steps; i++) {
        const t = (this.totalFlightTime / steps) * i;
        const tx = this.v0x * t;
        const ty = this.h0 + this.v0y * t - 0.5 * this.g * t * t;
        const px = originX + tx * scaleX;
        const py = groundY - ty * scaleY;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();

      // Реальный шлейф полета
      if (this.history.length > 1) {
        ctx.save();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < this.history.length; i++) {
          const pt = this.history[i];
          const px = originX + pt.x * scaleX;
          const py = groundY - pt.y * scaleY;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Снаряд
      const cur = this.currentPos;
      const curPx = originX + cur.x * scaleX;
      const curPy = groundY - cur.y * scaleY;

      ctx.save();
      ctx.fillStyle = "#f43f5e";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(curPx, curPy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Векторы силы тяжести и скорости
      if (this.showForces) {
        const mg = this.telemetry.fGravity;
        const mgLen = Math.min(75, Math.max(16, mg * 4.5));
        const mgLabel = this.showVectorValues ? `mg=${mg.toFixed(1)}Н` : "mg";
        this.drawVector(ctx, curPx, curPy, curPx, curPy + mgLen, "#38bdf8", mgLabel, { x: 8, y: 12 });
      }

      if (this.showVelocityVectors) {
        const vMag = this.telemetry.v;
        if (vMag > 0.4) {
          const vScale = 1.6;
          const vxLen = cur.vx * vScale;
          const vyLen = -cur.vy * vScale;
          const vEndPx = curPx + vxLen;
          const vEndPy = curPy + vyLen;

          // Проекции (пунктир)
          ctx.save();
          ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(vEndPx, curPy);
          ctx.lineTo(vEndPx, vEndPy);
          ctx.lineTo(curPx, vEndPy);
          ctx.stroke();
          ctx.restore();

          // vx и vy
          const vxLabel = this.showVectorValues ? `vx=${cur.vx.toFixed(1)}` : "vx";
          const vyLabel = this.showVectorValues ? `vy=${Math.abs(cur.vy).toFixed(1)}` : "vy";
          this.drawVector(ctx, curPx, curPy, vEndPx, curPy, "#34d399", vxLabel, { x: 6, y: -8 });
          this.drawVector(ctx, curPx, curPy, curPx, vEndPy, "#c084fc", vyLabel, { x: -45, y: -6 });

          // Результирующий вектор v
          const vLabel = this.showVectorValues ? `v=${vMag.toFixed(1)}м/с` : "v";
          this.drawVector(ctx, curPx, curPy, vEndPx, vEndPy, "#fbbf24", vLabel, { x: 8, y: 12 });
        }
      }

      // Метки L и H
      ctx.save();
      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.fillText(`L = ${this.flightRange.toFixed(1)} м`, originX + this.flightRange * scaleX - 25, groundY + 22);
      ctx.fillText(`H = ${this.maxHeight.toFixed(1)} м`, originX - 55, groundY - this.maxHeight * scaleY);
      ctx.restore();
    },
    renderGraph() {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      const padL = 50, padR = 25, padT = 20, padB = 35;
      const pW = w - padL - padR;
      const pH = h - padT - padB;
      const maxL = (this.v0 * this.v0) / this.g * 1.05;

      const degX = (deg) => padL + (deg / 90) * pW;
      const rangeY = (l) => padT + pH - (l / maxL) * pH;

      ctx.strokeStyle = "rgba(51, 65, 85, 0.5)";
      ctx.lineWidth = 1;
      ctx.font = "500 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#64748b";

      for (let deg = 0; deg <= 90; deg += 15) {
        const x = degX(deg);
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + pH); ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText(`${deg}°`, x, padT + pH + 16);
      }

      for (let i = 0; i <= 4; i++) {
        const val = (maxL / 4) * i;
        const y = rangeY(val);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + pW, y); ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(val.toFixed(0), padL - 8, y + 4);
      }

      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "left";
      ctx.fillText("Дальность L (м)", 10, padT - 6);
      ctx.textAlign = "right";
      ctx.fillText("Угол α (град.)", padL + pW, padT + pH + 30);

      // Кривая дальности
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      for (let deg = 0; deg <= 90; deg += 0.5) {
        const rad = (deg * Math.PI) / 180;
        const lVal = (this.v0 * this.v0 * Math.sin(2 * rad)) / this.g;
        const x = degX(deg);
        const y = rangeY(lVal);
        if (deg === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Маркер текущей точки
      const curX = degX(this.alpha);
      const curL = (this.v0 * this.v0 * Math.sin(2 * this.alphaRad)) / this.g;
      const curY = rangeY(curL);

      ctx.fillStyle = "rgba(56, 189, 248, 0.3)";
      ctx.beginPath(); ctx.arc(curX, curY, 10, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(curX, curY, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    },
    onSimMouseDown(e) {
      this.isDraggingCannon = true;
      this.updateAngleFromSimEvent(e);
      window.addEventListener('mousemove', this.onSimMouseMove);
      window.addEventListener('mouseup', this.onSimMouseUp);
      window.addEventListener('touchmove', this.onSimMouseMove, { passive: false });
      window.addEventListener('touchend', this.onSimMouseUp);
    },
    onSimMouseMove(e) {
      if (this.isDraggingCannon) this.updateAngleFromSimEvent(e);
    },
    onSimMouseUp() {
      this.isDraggingCannon = false;
      window.removeEventListener('mousemove', this.onSimMouseMove);
      window.removeEventListener('mouseup', this.onSimMouseUp);
      window.removeEventListener('touchmove', this.onSimMouseMove);
      window.removeEventListener('touchend', this.onSimMouseUp);
    },
    updateAngleFromSimEvent(e) {
      const canvas = this.$refs.simCanvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const originX = 60;
      const h = canvas.height / (window.devicePixelRatio || 1);
      const groundY = h - 50;
      const startX = originX;
      const startY = groundY - this.h0 * ((groundY - 35) / Math.max(30, this.maxHeight * 1.3));

      const dx = mx - startX;
      const dy = startY - my;

      if (dx > 5) {
        let rad = Math.atan2(dy, dx);
        let deg = (rad * 180) / Math.PI;
        deg = Math.max(5, Math.min(85, deg));
        this.alpha = Math.round(deg);
        this.reset();
      }
    },
    onGraphMouseDown(e) {
      this.isDraggingGraph = true;
      this.updateAngleFromGraphEvent(e);
      window.addEventListener('mousemove', this.onGraphMouseMove);
      window.addEventListener('mouseup', this.onGraphMouseUp);
    },
    onGraphMouseMove(e) {
      if (this.isDraggingGraph) this.updateAngleFromGraphEvent(e);
    },
    onGraphMouseUp() {
      this.isDraggingGraph = false;
      window.removeEventListener('mousemove', this.onGraphMouseMove);
      window.removeEventListener('mouseup', this.onGraphMouseUp);
    },
    updateAngleFromGraphEvent(e) {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const padL = 50, padR = 25;
      const pW = rect.width - padL - padR;
      let deg = ((x - padL) / pW) * 90;
      deg = Math.max(5, Math.min(85, deg));
      this.alpha = Math.round(deg);
      this.reset();
    },
    animate(now) {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (this.isRunning) {
        this.simTime += dt;
        const cur = this.currentPos;
        this.history.push({ x: cur.x, y: cur.y });
        if (this.simTime >= this.totalFlightTime) {
          this.isRunning = false;
        }
      }

      this.renderSimulation();
      this.renderGraph();
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  },
  template: `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-8 flex flex-col gap-6">
        
        <div class="glass-panel rounded-2xl p-4 flex flex-col relative overflow-hidden shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3 z-10">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Баллистическая траектория</span>
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                t = {{ currentPos.t.toFixed(2) }} с
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="fire"
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20 hover:opacity-95 transition"
              >
                Пуск ▶
              </button>
              <button
                @click="reset"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Сброс
              </button>
            </div>
          </div>

          <div class="relative w-full h-[360px] sm:h-[420px] bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden">
            <canvas
              ref="simCanvas"
              class="w-full h-full block cursor-grab active:cursor-grabbing"
              @mousedown="onSimMouseDown"
              @touchstart.passive="onSimMouseDown"
            ></canvas>

            <div class="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 text-xs space-y-1.5 pointer-events-none shadow-lg">
              <div class="font-semibold text-slate-300 mb-1 border-b border-slate-800 pb-1">Элементы:</div>
              <div class="flex items-center gap-2"><span class="w-3 h-1 rounded bg-rose-500 inline-block"></span><span class="text-slate-300">Снаряд</span></div>
              <div class="flex items-center gap-2"><span class="w-3 h-1 rounded bg-amber-400 inline-block"></span><span class="text-slate-300 font-mono">v(t)</span> <span class="text-slate-500">— скорость</span></div>
              <div class="flex items-center gap-2"><span class="w-3 h-1 rounded bg-sky-400 inline-block"></span><span class="text-slate-300 font-mono">mg</span> <span class="text-slate-500">— сила тяжести</span></div>
            </div>

            <div class="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px] font-mono text-sky-400 pointer-events-none">
              💡 Поворачивайте дуло пушки прямо на холсте
            </div>

            <!-- Тумблеры векторов -->
            <div class="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
              <div class="flex flex-wrap items-center gap-1.5">
                <button
                  @click="showForces = !showForces"
                  :class="[
                    'px-2.5 py-1 text-xs rounded-lg border font-mono transition flex items-center gap-1.5 backdrop-blur-md',
                    showForces ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full" :class="showForces ? 'bg-sky-400' : 'bg-slate-600'"></span>
                  <span>Сила тяжести mg</span>
                </button>

                <button
                  @click="showVelocityVectors = !showVelocityVectors"
                  :class="[
                    'px-2.5 py-1 text-xs rounded-lg border font-mono transition flex items-center gap-1.5 backdrop-blur-md',
                    showVelocityVectors ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full" :class="showVelocityVectors ? 'bg-amber-400' : 'bg-slate-600'"></span>
                  <span>Вектор v с проекциями</span>
                </button>

                <button
                  @click="showVectorValues = !showVectorValues"
                  :class="[
                    'px-2.5 py-1 text-xs rounded-lg border font-mono transition flex items-center gap-1.5 backdrop-blur-md',
                    showVectorValues ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span>Значения (Н, м/с)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="glass-panel rounded-2xl p-4 flex flex-col shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Зависимость дальности полета L от угла α</span>
              <span class="text-xs text-slate-500">Кликайте или перемещайте маркер по графику для смены угла</span>
            </div>
          </div>

          <div class="relative w-full h-[240px] sm:h-[260px] bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden">
            <canvas
              ref="graphCanvas"
              class="w-full h-full block cursor-crosshair"
              @mousedown="onGraphMouseDown"
              @touchstart.passive="updateAngleFromGraphEvent"
            ></canvas>
          </div>
        </div>

      </div>

      <div class="lg:col-span-4 flex flex-col gap-6">
        
        <div class="glass-panel rounded-2xl p-5 shadow-xl space-y-5">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <span>Параметры баллистики</span>
            <span class="text-xs font-mono text-sky-400">Точный ввод & ползунки</span>
          </h2>

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Скорость вылета <span class="font-mono text-sky-400">v₀</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  v-model.number="v0"
                  @input="reset"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">м/с</span>
              </div>
            </div>
            <input type="range" min="5" max="60" step="1" v-model.number="v0" @input="reset" />
            <div class="flex justify-between text-[11px] font-mono text-slate-500">
              <span>5 м/с</span><span>30 м/с</span><span>60 м/с</span>
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Угол вылета <span class="font-mono text-sky-400">α</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="0.5"
                  v-model.number="alpha"
                  @input="reset"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">°</span>
              </div>
            </div>
            <input type="range" min="5" max="85" step="1" v-model.number="alpha" @input="reset" />
            <div class="grid grid-cols-3 gap-1.5 pt-1">
              <button
                v-for="deg in [30, 45, 60]"
                :key="deg"
                @click="alpha = deg; reset()"
                :class="[
                  'px-2 py-1.5 rounded-lg text-xs font-mono transition text-center',
                  alpha === deg
                    ? 'bg-sky-950/80 text-sky-200 border border-sky-500/50'
                    : 'bg-slate-800/90 text-slate-300 border border-slate-700/80 hover:bg-slate-700'
                ]"
              >
                {{ deg }}°
              </button>
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Высота платформы <span class="font-mono text-sky-400">h₀</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  v-model.number="h0"
                  @input="reset"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">м</span>
              </div>
            </div>
            <input type="range" min="0" max="30" step="1" v-model.number="h0" @input="reset" />
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Масса снаряда <span class="font-mono text-sky-400">m</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.1"
                  max="20"
                  step="0.1"
                  v-model.number="mass"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">кг</span>
              </div>
            </div>
            <input type="range" min="0.2" max="10" step="0.2" v-model.number="mass" />
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Гравитация <span class="font-mono text-sky-400">g</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="30"
                  step="0.01"
                  v-model.number="g"
                  @input="reset"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">м/с²</span>
              </div>
            </div>
            <input type="range" min="1.6" max="24.8" step="0.01" v-model.number="g" @input="reset" />
          </div>
        </div>

        <div class="glass-panel rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 mb-3.5 flex items-center justify-between">
              <span>Расчётная телеметрия</span>
              <span class="text-[11px] font-mono font-normal text-sky-400">Реальное время</span>
            </h2>

            <div class="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Дальность L</span>
                <span class="text-base font-bold text-sky-400">{{ flightRange.toFixed(2) }} м</span>
                <div class="text-[10px] text-slate-500 mt-0.5">v₀²·sin(2α)/g</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Макс. высота H</span>
                <span class="text-base font-bold text-emerald-400">{{ maxHeight.toFixed(2) }} м</span>
                <div class="text-[10px] text-slate-500 mt-0.5">h₀ + v₀y²/(2g)</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Время полета T</span>
                <span class="text-base font-bold text-amber-400">{{ totalFlightTime.toFixed(2) }} с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">t_тек = {{ currentPos.t.toFixed(2) }} с</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Текущая скорость v</span>
                <span class="text-base font-bold text-indigo-300">{{ telemetry.v.toFixed(2) }} м/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">vx={{ currentPos.vx.toFixed(1) }}, vy={{ currentPos.vy.toFixed(1) }}</div>
              </div>

              <div class="bg-rose-950/30 border border-rose-500/30 rounded-xl p-2.5">
                <span class="text-[10px] text-rose-300 block">Кинетическая Ek</span>
                <span class="text-base font-bold text-rose-400">{{ telemetry.ek.toFixed(1) }} Дж</span>
                <div class="text-[10px] text-rose-300/70 mt-0.5">mv²/2</div>
              </div>

              <div class="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-2.5">
                <span class="text-[10px] text-emerald-300 block">Потенциальная Ep</span>
                <span class="text-base font-bold text-emerald-400">{{ telemetry.ep.toFixed(1) }} Дж</span>
                <div class="text-[10px] text-emerald-300/70 mt-0.5">mgy (y={{ currentPos.y.toFixed(1) }}м)</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Полная энергия E</span>
                <span class="text-base font-bold text-white">{{ telemetry.totalEnergy.toFixed(1) }} Дж</span>
                <div class="text-[10px] text-slate-500 mt-0.5">Ek + Ep = const</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Скорость приземления</span>
                <span class="text-base font-bold text-sky-300">{{ telemetry.vLand.toFixed(2) }} м/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">√(v₀² + 2gh₀)</div>
              </div>
            </div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed space-y-1">
            <span class="font-semibold text-slate-200 block">Физический закон:</span>
            При отсутствии сопротивления воздуха максимальная дальность полета достигается строго при угле <span class="text-sky-400 font-mono">α = 45°</span>, так как <span class="font-mono text-slate-200">sin(2α) = sin(90°) = 1</span>.
          </div>
        </div>

          <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed space-y-1">
            <span class="font-semibold text-slate-200 block">Физический закон:</span>
            При отсутствии сопротивления воздуха максимальная дальность полета достигается строго при угле <span class="text-sky-400 font-mono">α = 45°</span>, так как <span class="font-mono text-slate-200">sin(2α) = sin(90°) = 1</span>.
          </div>
        </div>

      </div>
    </div>
  `
};
