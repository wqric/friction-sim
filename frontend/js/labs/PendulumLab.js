export default {
  name: 'PendulumLab',
  data() {
    return {
      mode: 'math',
      length: 1.5,
      mass: 1.0,
      stiffness: 40.0,
      initialAngle: 25.0,
      initialDisplacement: 0.3,
      damping: 0.04,
      g: 9.81,

      theta: 0,
      omega: 0,
      xSpring: 0,
      vSpring: 0,
      simTime: 0,
      isRunning: true,
      phaseHistory: [],
      lastTime: performance.now(),
      animationFrameId: null,
      isDraggingBob: false
    };
  },
  computed: {
    period() {
      if (this.mode === 'math') {
        return 2 * Math.PI * Math.sqrt(this.length / this.g);
      } else {
        return 2 * Math.PI * Math.sqrt(this.mass / this.stiffness);
      }
    },
    energies() {
      if (this.mode === 'math') {
        const v = this.length * this.omega;
        const ek = 0.5 * this.mass * v * v;
        const h = this.length * (1 - Math.cos(this.theta));
        const ep = this.mass * this.g * h;
        return { ek, ep, total: ek + ep, v };
      } else {
        const ek = 0.5 * this.mass * this.vSpring * this.vSpring;
        const ep = 0.5 * this.stiffness * this.xSpring * this.xSpring;
        return { ek, ep, total: ek + ep, v: this.vSpring };
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.reset();
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
    reset() {
      this.theta = (this.initialAngle * Math.PI) / 180;
      this.omega = 0;
      this.xSpring = this.initialDisplacement;
      this.vSpring = 0;
      this.simTime = 0;
      this.phaseHistory = [];
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

      const cx = w * 0.42;
      const cy = 40;

      if (this.mode === 'math') {
        const pxScale = 140;
        const bobX = cx + this.length * Math.sin(this.theta) * pxScale;
        const bobY = cy + this.length * Math.cos(this.theta) * pxScale;

        // Потолок
        ctx.save();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 60, cy); ctx.lineTo(cx + 60, cy); ctx.stroke();

        // Вертикаль
        ctx.strokeStyle = "rgba(148, 163, 184, 0.2)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + this.length * pxScale + 25); ctx.stroke();

        // Нить
        ctx.setLineDash([]);
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bobX, bobY); ctx.stroke();

        // Шарнир
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();

        // Груз
        const radius = Math.max(14, Math.min(26, 13 + this.mass * 3));
        const grad = ctx.createRadialGradient(bobX - 4, bobY - 4, 2, bobX, bobY, radius);
        grad.addColorStop(0, "#fb7185");
        grad.addColorStop(1, "#e11d48");
        ctx.fillStyle = grad;
        ctx.strokeStyle = "#ffe4e6";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bobX, bobY, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${this.mass} кг`, bobX, bobY + 4);
        ctx.restore();
      } else {
        const restLenPx = 100;
        const pxScale = 180;
        const bobY = cy + restLenPx + this.xSpring * pxScale;

        // Потолок
        ctx.save();
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx - 60, cy); ctx.lineTo(cx + 60, cy); ctx.stroke();

        // Пружина
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        const coils = 12;
        const currentLen = bobY - cy;
        for (let i = 1; i <= coils; i++) {
          const sy = cy + (currentLen / (coils + 1)) * i;
          const sx = cx + (i % 2 === 0 ? 15 : -15);
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(cx, bobY); ctx.stroke();

        // Груз
        const bw = 50 + this.mass * 4;
        const bh = 36;
        ctx.fillStyle = "#0284c7";
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(cx - bw / 2, bobY, bw, bh, 6); ctx.fill(); ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${this.mass} кг`, cx, bobY + bh / 2 + 4);
        ctx.restore();
      }

      // Гистограмма энергии
      const e = this.energies;
      const barX = w - 90;
      const barH = 170;
      const totalSafe = Math.max(0.01, e.total);
      const ekH = (e.ek / totalSafe) * barH;
      const epH = (e.ep / totalSafe) * barH;

      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, cy + 30, 30, barH);
      ctx.strokeRect(barX + 38, cy + 30, 30, barH);

      // Ek
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(barX + 1, cy + 30 + barH - ekH, 28, ekH);

      // Ep
      ctx.fillStyle = "#10b981";
      ctx.fillRect(barX + 39, cy + 30 + barH - epH, 28, epH);

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Ek", barX + 15, cy + 30 + barH + 18);
      ctx.fillText("Ep", barX + 53, cy + 30 + barH + 18);
      ctx.restore();
    },
    renderGraph() {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      const midX = w / 2;
      const midY = h / 2;

      ctx.save();
      ctx.strokeStyle = "rgba(51, 65, 85, 0.7)";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(20, midY); ctx.lineTo(w - 20, midY); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(midX, 15); ctx.lineTo(midX, h - 15); ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.fillText("x (смещение)", w - 90, midY - 8);
      ctx.fillText("v (скорость)", midX + 8, 24);

      if (this.phaseHistory.length > 2) {
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        const scaleX = 140;
        const scaleV = 45;
        for (let i = 0; i < this.phaseHistory.length; i++) {
          const pt = this.phaseHistory[i];
          const px = midX + pt.x * scaleX;
          const py = midY - pt.v * scaleV;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      const curX = this.mode === 'math' ? this.theta : this.xSpring;
      const curV = this.energies.v;
      const ptX = midX + curX * 140;
      const ptY = midY - curV * 45;

      ctx.fillStyle = "#f43f5e";
      ctx.beginPath(); ctx.arc(ptX, ptY, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
    onSimMouseDown(e) {
      this.isDraggingBob = true;
      this.updatePendulumFromEvent(e);
      window.addEventListener('mousemove', this.onSimMouseMove);
      window.addEventListener('mouseup', this.onSimMouseUp);
      window.addEventListener('touchmove', this.onSimMouseMove, { passive: false });
      window.addEventListener('touchend', this.onSimMouseUp);
    },
    onSimMouseMove(e) {
      if (this.isDraggingBob) this.updatePendulumFromEvent(e);
    },
    onSimMouseUp() {
      this.isDraggingBob = false;
      window.removeEventListener('mousemove', this.onSimMouseMove);
      window.removeEventListener('mouseup', this.onSimMouseUp);
      window.removeEventListener('touchmove', this.onSimMouseMove);
      window.removeEventListener('touchend', this.onSimMouseUp);
    },
    updatePendulumFromEvent(e) {
      const canvas = this.$refs.simCanvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const cx = w * 0.42;
      const cy = 40;

      if (this.mode === 'math') {
        const dx = mx - cx;
        const dy = my - cy;
        let rad = Math.atan2(dx, dy);
        rad = Math.max(-1.1, Math.min(1.1, rad));
        this.theta = rad;
        this.initialAngle = Math.abs((rad * 180) / Math.PI);
        this.omega = 0;
      } else {
        const restLenPx = 100;
        const pxScale = 180;
        let disp = (my - cy - restLenPx) / pxScale;
        disp = Math.max(-0.5, Math.min(0.5, disp));
        this.xSpring = disp;
        this.initialDisplacement = Math.abs(disp);
        this.vSpring = 0;
      }
    },
    animate(now) {
      const dt = Math.min(0.04, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (this.isRunning && !this.isDraggingBob) {
        if (this.mode === 'math') {
          const alphaAcc = -(this.g / this.length) * Math.sin(this.theta) - this.damping * this.omega;
          this.omega += alphaAcc * dt;
          this.theta += this.omega * dt;
          this.phaseHistory.push({ x: this.theta, v: this.length * this.omega });
        } else {
          const accel = (-this.stiffness * this.xSpring - this.damping * 4 * this.vSpring) / this.mass;
          this.vSpring += accel * dt;
          this.xSpring += this.vSpring * dt;
          this.phaseHistory.push({ x: this.xSpring, v: this.vSpring });
        }

        if (this.phaseHistory.length > 400) this.phaseHistory.shift();
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
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {{ mode === 'math' ? 'Математический маятник' : 'Пружинный осциллятор' }}
              </span>
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                T = {{ period.toFixed(2) }} с
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="mode = mode === 'math' ? 'spring' : 'math'; reset()"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-950/80 hover:bg-sky-900 text-sky-200 border border-sky-500/40 transition"
              >
                {{ mode === 'math' ? 'Перейти на пружину' : 'Перейти на нить' }}
              </button>
              <button
                @click="reset"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Сброс
              </button>
            </div>
          </div>

          <div class="relative w-full h-[360px] sm:h-[400px] bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden">
            <canvas
              ref="simCanvas"
              class="w-full h-full block cursor-grab active:cursor-grabbing"
              @mousedown="onSimMouseDown"
              @touchstart.passive="onSimMouseDown"
            ></canvas>
            
            <div class="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 text-xs space-y-1.5 pointer-events-none shadow-lg">
              <div class="font-semibold text-slate-300 mb-1 border-b border-slate-800 pb-1">Энергетическая шкала:</div>
              <div class="flex items-center gap-2"><span class="w-3 h-1 rounded bg-rose-500 inline-block"></span><span class="text-slate-300 font-mono">Ek</span> <span class="text-slate-500">— кинетическая</span></div>
              <div class="flex items-center gap-2"><span class="w-3 h-1 rounded bg-emerald-400 inline-block"></span><span class="text-slate-300 font-mono">Ep</span> <span class="text-slate-500">— потенциальная</span></div>
            </div>

            <div class="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px] font-mono text-sky-400 pointer-events-none">
              💡 Перетаскивайте груз маятника курсором
            </div>
          </div>
        </div>

        <div class="glass-panel rounded-2xl p-4 flex flex-col shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Фазовый портрет: v(x)</span>
              <span class="text-xs text-slate-500">Эллипс замкнутой траектории в фазовом пространстве координат и скоростей</span>
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
            Параметры системы
          </h2>

          <div v-if="mode === 'math'" class="space-y-2">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Длина нити <span class="font-mono text-sky-400">L</span></label>
              <span class="font-mono text-base font-bold text-sky-400">{{ length.toFixed(2) }} м</span>
            </div>
            <input type="range" min="0.5" max="2.5" step="0.1" v-model.number="length" @input="reset" />
          </div>

          <div v-else class="space-y-2">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Жесткость пружины <span class="font-mono text-sky-400">k</span></label>
              <span class="font-mono text-base font-bold text-sky-400">{{ stiffness.toFixed(0) }} Н/м</span>
            </div>
            <input type="range" min="10" max="100" step="5" v-model.number="stiffness" @input="reset" />
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Масса груза <span class="font-mono text-sky-400">m</span></label>
              <span class="font-mono text-base font-bold text-sky-400">{{ mass.toFixed(1) }} кг</span>
            </div>
            <input type="range" min="0.2" max="5.0" step="0.2" v-model.number="mass" @input="reset" />
          </div>

          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">
                {{ mode === 'math' ? 'Начальный угол α₀' : 'Начальное смещение x₀' }}
              </label>
              <span class="font-mono text-base font-bold text-sky-400">
                {{ mode === 'math' ? initialAngle.toFixed(0) + '°' : initialDisplacement.toFixed(2) + ' м' }}
              </span>
            </div>
            <input
              v-if="mode === 'math'"
              type="range" min="5" max="60" step="1"
              v-model.number="initialAngle" @input="reset"
            />
            <input
              v-else
              type="range" min="0.05" max="0.5" step="0.05"
              v-model.number="initialDisplacement" @input="reset"
            />
          </div>
        </div>

        <div class="glass-panel rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 mb-3.5">
              Энергетический баланс
            </h2>

            <div class="grid grid-cols-2 gap-3 font-mono">
              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Период колебаний T</span>
                <span class="text-lg font-bold text-sky-400">{{ period.toFixed(2) }} с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">2π√(l/g) или 2π√(m/k)</div>
              </div>

              <div class="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3">
                <span class="text-[11px] text-rose-300 block">Кинетическая Ek</span>
                <span class="text-lg font-bold text-rose-400">{{ energies.ek.toFixed(3) }} Дж</span>
                <div class="text-[10px] text-rose-300/70 mt-0.5">m·v²/2</div>
              </div>

              <div class="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3">
                <span class="text-[11px] text-emerald-300 block">Потенциальная Ep</span>
                <span class="text-lg font-bold text-emerald-400">{{ energies.ep.toFixed(3) }} Дж</span>
                <div class="text-[10px] text-emerald-300/70 mt-0.5">mgh или kx²/2</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Полная энергия E</span>
                <span class="text-lg font-bold text-white">{{ energies.total.toFixed(3) }} Дж</span>
                <div class="text-[10px] text-slate-500 mt-0.5">Ek + Ep = const</div>
              </div>
            </div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed space-y-1">
            <span class="font-semibold text-slate-200 block">Закон сохранения энергии:</span>
            В точках максимального отклонения скорость равна нулю (<span class="font-mono text-emerald-400">Ek = 0</span>, <span class="font-mono text-slate-200">Ep = max</span>), а в точке равновесия потенциальная энергия полностью переходит в кинетическую.
          </div>
        </div>

      </div>
    </div>
  `
};
