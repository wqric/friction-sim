export default {
  name: 'CircuitsLab',
  data() {
    return {
      connType: 'series', // 'series' (последовательное) или 'parallel' (параллельное)
      voltage: 12.0,      // Напряжение источника (В)
      r1: 4.0,            // Резистор 1 (Ом)
      r2: 6.0,            // Резистор 2 (Ом)

      electronOffset: 0,
      lastTime: performance.now(),
      animationFrameId: null
    };
  },
  computed: {
    rTotal() {
      if (this.connType === 'series') {
        return this.r1 + this.r2;
      } else {
        return (this.r1 * this.r2) / (this.r1 + this.r2);
      }
    },
    totalCurrent() {
      return this.voltage / this.rTotal;
    },
    branch1() {
      if (this.connType === 'series') {
        const u = this.totalCurrent * this.r1;
        const p = this.totalCurrent * this.totalCurrent * this.r1;
        return { i: this.totalCurrent, u, p };
      } else {
        const i = this.voltage / this.r1;
        const p = (this.voltage * this.voltage) / this.r1;
        return { i, u: this.voltage, p };
      }
    },
    branch2() {
      if (this.connType === 'series') {
        const u = this.totalCurrent * this.r2;
        const p = this.totalCurrent * this.totalCurrent * this.r2;
        return { i: this.totalCurrent, u, p };
      } else {
        const i = this.voltage / this.r2;
        const p = (this.voltage * this.voltage) / this.r2;
        return { i, u: this.voltage, p };
      }
    },
    totalPower() {
      return this.voltage * this.totalCurrent;
    }
  },
  mounted() {
    this.resizeCanvases();
    window.addEventListener('resize', this.resizeCanvases);
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeCanvases);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  },
  methods: {
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

      const cx = w / 2;
      const cy = h / 2;

      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;

      if (this.connType === 'series') {
        // Последовательная схема: контур
        const rw = 160, rh = 90;
        ctx.strokeRect(cx - rw, cy - rh, rw * 2, rh * 2);

        // Резистор 1 (сверху слева)
        this.drawResistor(ctx, cx - 70, cy - rh, 70, 24, "R₁", this.r1, "#0284c7");
        // Резистор 2 (сверху справа)
        this.drawResistor(ctx, cx + 70, cy - rh, 70, 24, "R₂", this.r2, "#d97706");
        // Источник питания (снизу)
        this.drawSource(ctx, cx, cy + rh, this.voltage);
      } else {
        // Параллельная схема
        const rw = 150, rh = 100;
        // Внешний контур
        ctx.strokeRect(cx - rw, cy - rh, rw * 2, rh * 2);
        // Центральная перемычка
        ctx.beginPath();
        ctx.moveTo(cx - rw, cy);
        ctx.lineTo(cx + rw, cy);
        ctx.stroke();

        this.drawResistor(ctx, cx, cy - rh, 70, 24, "R₁", this.r1, "#0284c7");
        this.drawResistor(ctx, cx, cy, 70, 24, "R₂", this.r2, "#d97706");
        this.drawSource(ctx, cx, cy + rh, this.voltage);
      }

      // Анимация направленного движения зарядов (ток)
      const speed = this.totalCurrent * 20;
      ctx.fillStyle = "#fbbf24";
      const eCount = 14;
      for (let i = 0; i < eCount; i++) {
        const offset = (this.electronOffset + (i / eCount) * 400) % 400;
        // Распределяем точки по контуру
        let ex = cx - 140 + offset * 0.7;
        let ey = cy - 80;
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
    drawResistor(ctx, x, y, w, h, label, rVal, fill) {
      ctx.save();
      ctx.fillStyle = fill;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.fillRect(x - w / 2, y - h / 2, w, h);
      ctx.strokeRect(x - w / 2, y - h / 2, w, h);

      ctx.fillStyle = "#ffffff";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${label}=${rVal}Ом`, x, y + 4);
      ctx.restore();
    },
    drawSource(ctx, x, y, uVal) {
      ctx.save();
      ctx.fillStyle = "#090d16";
      ctx.fillRect(x - 30, y - 15, 60, 30);

      // Длинная и короткая пластины гальванического элемента
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 8, y - 12); ctx.lineTo(x - 8, y + 12); ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x + 8, y - 7); ctx.lineTo(x + 8, y + 7); ctx.stroke();

      ctx.fillStyle = "#38bdf8";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${uVal} В`, x, y + 26);
      ctx.restore();
    },
    renderGraph() {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // ВАХ цепи (Закон Ома I от U)
      const padL = 50, padR = 25, padT = 20, padB = 35;
      const pW = w - padL - padR;
      const pH = h - padT - padB;

      ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + pH); ctx.lineTo(padL + pW, padT + pH); ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 11px 'JetBrains Mono', monospace";
      ctx.fillText("I (А)", 12, padT);
      ctx.fillText("U (В)", padL + pW - 10, padT + pH + 24);

      // Линейная ВАХ I = U / R_экв
      const maxU = 24.0;
      const maxI = maxU / this.rTotal;

      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(padL, padT + pH);
      ctx.lineTo(padL + pW, padT + pH - (maxI / (24 / Math.max(this.rTotal, 1))) * pH);
      ctx.stroke();

      // Текущая рабочая точка
      const curX = padL + (this.voltage / maxU) * pW;
      const curY = padT + pH - (this.totalCurrent / maxI) * (pH * 0.95);

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#34d399";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(curX, curY, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    },
    animate(now) {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.electronOffset += this.totalCurrent * 25 * dt;

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
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Принципиальная электрическая схема</span>
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {{ connType === 'series' ? 'Последовательное R = R₁ + R₂' : 'Параллельное 1/R = 1/R₁ + 1/R₂' }}
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                @click="connType = 'series'"
                :class="['px-2.5 py-1 text-xs font-medium rounded-lg border transition', connType === 'series' ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-800 text-slate-400 border-slate-700']"
              >
                Последовательное
              </button>
              <button
                @click="connType = 'parallel'"
                :class="['px-2.5 py-1 text-xs font-medium rounded-lg border transition', connType === 'parallel' ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-800 text-slate-400 border-slate-700']"
              >
                Параллельное
              </button>
            </div>
          </div>

          <div class="relative w-full h-[340px] sm:h-[380px] bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden">
            <canvas ref="simCanvas" class="w-full h-full block"></canvas>
          </div>
        </div>

        <div class="glass-panel rounded-2xl p-4 flex flex-col shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Вольт-амперная характеристика (ВАХ)</span>
              <span class="text-xs text-slate-500">Прямая пропорциональность силы тока напряжению I = U / R</span>
            </div>
          </div>

          <div class="relative w-full h-[220px] sm:h-[240px] bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden">
            <canvas ref="graphCanvas" class="w-full h-full block"></canvas>
          </div>
        </div>

      </div>

      <div class="lg:col-span-4 flex flex-col gap-6">
        
        <div class="glass-panel rounded-2xl p-5 shadow-xl space-y-5">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5">
            Параметры цепи
          </h2>

          <div class="space-y-2">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Напряжение источника <span class="font-mono text-sky-400">U</span></label>
              <span class="font-mono text-base font-bold text-sky-400">{{ voltage.toFixed(1) }} В</span>
            </div>
            <input type="range" min="1" max="24" step="1" v-model.number="voltage" />
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Резистор <span class="font-mono text-sky-400">R₁</span></label>
              <span class="font-mono text-base font-bold text-sky-400">{{ r1.toFixed(1) }} Ом</span>
            </div>
            <input type="range" min="1" max="20" step="1" v-model.number="r1" />
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Резистор <span class="font-mono text-amber-400">R₂</span></label>
              <span class="font-mono text-base font-bold text-amber-400">{{ r2.toFixed(1) }} Ом</span>
            </div>
            <input type="range" min="1" max="20" step="1" v-model.number="r2" />
          </div>
        </div>

        <div class="glass-panel rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 mb-3.5">
              Электрические величины
            </h2>

            <div class="grid grid-cols-2 gap-3 font-mono">
              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Полный ток I</span>
                <span class="text-lg font-bold text-sky-400">{{ totalCurrent.toFixed(2) }} А</span>
                <div class="text-[10px] text-slate-500 mt-0.5">U / R_общ</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Эквив. сопротивление</span>
                <span class="text-lg font-bold text-emerald-400">{{ rTotal.toFixed(2) }} Ом</span>
                <div class="text-[10px] text-slate-500 mt-0.5">R_общ</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Ток через R₁</span>
                <span class="text-base font-bold text-amber-400">{{ branch1.i.toFixed(2) }} А</span>
                <div class="text-[10px] text-slate-500 mt-0.5">U₁ = {{ branch1.u.toFixed(1) }} В</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Полная мощность P</span>
                <span class="text-base font-bold text-rose-400">{{ totalPower.toFixed(1) }} Вт</span>
                <div class="text-[10px] text-slate-500 mt-0.5">U · I</div>
              </div>
            </div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed space-y-1">
            <span class="font-semibold text-slate-200 block">Закон Ома для участка цепи:</span>
            Сила тока прямо пропорциональна приложенному напряжению и обратно пропорциональна сопротивлению проводника: <span class="font-mono text-sky-400">I = U / R</span>.
          </div>
        </div>

      </div>
    </div>
  `
};
