export default {
  name: 'GasLawsLab',
  data() {
    return {
      processType: 'isotherm', // 'isotherm' (T=const), 'isobar' (P=const), 'isochore' (V=const)
      T: 300,                  // Температура (К) 100..600
      P: 100,                  // Давление (кПа) 50..300
      V: 2.0,                  // Объем (л) 1.0..5.0
      nu: 1.0,                 // Количество вещества
      R: 8.31,

      particles: [],
      lastTime: performance.now(),
      animationFrameId: null
    };
  },
  computed: {
    // Вычисляем недостающую величину по Менделееву-Клапейрону P*V = const*T
    calculatedState() {
      // Масштабируем: P * V / T ~ const
      const factor = 100 * 2.0 / 300; // 0.6667
      let p = this.P;
      let v = this.V;
      let t = this.T;

      if (this.processType === 'isotherm') {
        // T фиксирована, P = (T * factor) / V
        p = (this.T * factor) / this.V;
      } else if (this.processType === 'isobar') {
        // P фиксировано, V = (this.T * factor) / this.P
        v = (this.T * factor) / this.P;
      } else if (this.processType === 'isochore') {
        // V фиксирован, P = (this.T * factor) / this.V
        p = (this.T * factor) / this.V;
      }

      return {
        P: p,
        V: v,
        T: t
      };
    }
  },
  mounted() {
    this.initParticles();
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
    initParticles() {
      this.particles = [];
      const count = 45;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * 200 + 20,
          y: Math.random() * 180 + 30,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4
        });
      }
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

      // Цилиндр с поршнем
      const cylX = 80;
      const cylY = 40;
      const cylH = h - 80;
      const maxCylW = w - 160;

      // Текущая ширина цилиндра пропорциональна объему V (от 1.0 до 5.0 л)
      const curV = this.calculatedState.V;
      const cylW = Math.min(maxCylW, 100 + (curV - 1.0) * (maxCylW - 100) / 4.0);

      ctx.save();
      // Стенки сосуда
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cylX + maxCylW, cylY);
      ctx.lineTo(cylX, cylY);
      ctx.lineTo(cylX, cylY + cylH);
      ctx.lineTo(cylX + maxCylW, cylY + cylH);
      ctx.stroke();

      // Газ внутри сосуда
      ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
      ctx.fillRect(cylX, cylY, cylW, cylH);

      // Поршень
      ctx.fillStyle = "#334155";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.fillRect(cylX + cylW - 12, cylY, 14, cylH);
      ctx.strokeRect(cylX + cylW - 12, cylY, 14, cylH);

      // Шток поршня
      ctx.fillStyle = "#64748b";
      ctx.fillRect(cylX + cylW + 2, cylY + cylH / 2 - 8, maxCylW - cylW + 40, 16);

      // Молекулы газа (броуновское тепловое движение)
      const speedScale = Math.sqrt(this.T / 300);
      ctx.fillStyle = "#38bdf8";
      for (let p of this.particles) {
        // Ограничиваем в объеме
        if (p.x < cylX + 6) { p.x = cylX + 6; p.vx = Math.abs(p.vx); }
        if (p.x > cylX + cylW - 18) { p.x = cylX + cylW - 18; p.vx = -Math.abs(p.vx); }
        if (p.y < cylY + 6) { p.y = cylY + 6; p.vy = Math.abs(p.vy); }
        if (p.y > cylY + cylH - 6) { p.y = cylY + cylH - 6; p.vy = -Math.abs(p.vy); }

        p.x += p.vx * speedScale;
        p.y += p.vy * speedScale;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
    renderGraph() {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // Диаграмма P-V
      const padL = 55, padR = 25, padT = 20, padB = 35;
      const pW = w - padL - padR;
      const pH = h - padT - padB;

      ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
      ctx.lineWidth = 1.2;
      ctx.font = "500 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#64748b";

      // Оси P и V
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + pH); ctx.lineTo(padL + pW, padT + pH); ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.fillText("P (кПа)", 10, padT);
      ctx.fillText("V (л)", padL + pW - 10, padT + pH + 24);

      const vToX = (v) => padL + ((v - 1.0) / 4.0) * pW;
      const pToY = (p) => padT + pH - (p / 300) * pH;

      // Отрисовка кривой процесса
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.6;
      ctx.beginPath();

      if (this.processType === 'isotherm') {
        // Гипербола P = const / V
        const c = this.T * (100 * 2.0 / 300);
        for (let v = 1.0; v <= 5.0; v += 0.1) {
          const p = c / v;
          const x = vToX(v);
          const y = pToY(p);
          if (v === 1.0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else if (this.processType === 'isobar') {
        // Горизонтальная линия P = const
        const y = pToY(this.P);
        ctx.moveTo(vToX(1.0), y);
        ctx.lineTo(vToX(5.0), y);
      } else if (this.processType === 'isochore') {
        // Вертикальная линия V = const
        const x = vToX(this.V);
        ctx.moveTo(x, pToY(50));
        ctx.lineTo(x, pToY(300));
      }
      ctx.stroke();

      // Текущая рабочая точка состояния газа
      const curPtX = vToX(this.calculatedState.V);
      const curPtY = pToY(this.calculatedState.P);

      ctx.fillStyle = "rgba(244, 63, 94, 0.3)";
      ctx.beginPath(); ctx.arc(curPtX, curPtY, 11, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(curPtX, curPtY, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    },
    animate(now) {
      this.lastTime = now;
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
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Цилиндр с идеальным газом под поршнем</span>
              <span class="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {{ processType === 'isotherm' ? 'T = const (Изотерма)' : processType === 'isobar' ? 'P = const (Изобара)' : 'V = const (Изохора)' }}
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                @click="processType = 'isotherm'"
                :class="['px-2.5 py-1 text-xs font-medium rounded-lg border transition', processType === 'isotherm' ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-800 text-slate-400 border-slate-700']"
              >
                Изотермический
              </button>
              <button
                @click="processType = 'isobar'"
                :class="['px-2.5 py-1 text-xs font-medium rounded-lg border transition', processType === 'isobar' ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-800 text-slate-400 border-slate-700']"
              >
                Изобарный
              </button>
              <button
                @click="processType = 'isochore'"
                :class="['px-2.5 py-1 text-xs font-medium rounded-lg border transition', processType === 'isochore' ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-800 text-slate-400 border-slate-700']"
              >
                Изохорный
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
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 block">P-V диаграмма состояния газа</span>
              <span class="text-xs text-slate-500">Графическое отображение изопроцесса в координатах давления и объема</span>
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
            Термодинамические параметры
          </h2>

          <!-- Температура T -->
          <div class="space-y-2">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Температура <span class="font-mono text-sky-400">T</span></label>
              <span class="font-mono text-base font-bold text-sky-400">{{ T.toFixed(0) }} К</span>
            </div>
            <input type="range" min="150" max="600" step="10" v-model.number="T" />
          </div>

          <!-- Объем V -->
          <div class="space-y-2 pt-2 border-t border-slate-800/60" v-if="processType !== 'isochore'">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Объем <span class="font-mono text-sky-400">V</span></label>
              <span class="font-mono text-base font-bold text-sky-400">{{ V.toFixed(1) }} л</span>
            </div>
            <input type="range" min="1.0" max="5.0" step="0.1" v-model.number="V" />
          </div>

          <!-- Давление P -->
          <div class="space-y-2 pt-2 border-t border-slate-800/60" v-if="processType === 'isobar'">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Давление <span class="font-mono text-sky-400">P</span></label>
              <span class="font-mono text-base font-bold text-sky-400">{{ P.toFixed(0) }} кПа</span>
            </div>
            <input type="range" min="50" max="250" step="10" v-model.number="P" />
          </div>
        </div>

        <div class="glass-panel rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 mb-3.5">
              Состояние газа
            </h2>

            <div class="grid grid-cols-2 gap-3 font-mono">
              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Давление P</span>
                <span class="text-lg font-bold text-sky-400">{{ calculatedState.P.toFixed(1) }} кПа</span>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Объем V</span>
                <span class="text-lg font-bold text-emerald-400">{{ calculatedState.V.toFixed(2) }} л</span>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Температура T</span>
                <span class="text-base font-bold text-amber-400">{{ calculatedState.T.toFixed(0) }} К</span>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Ср. скор. молекул</span>
                <span class="text-base font-bold text-indigo-300">{{ (Math.sqrt(calculatedState.T) * 28).toFixed(0) }} м/с</span>
              </div>
            </div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed space-y-1">
            <span class="font-semibold text-slate-200 block">Уравнение Клапейрона:</span>
            Для постоянной массы идеального газа отношение произведения давления на объем к температуре остается неизменным: <span class="font-mono text-sky-400">(P·V)/T = const</span>.
          </div>
        </div>

      </div>
    </div>
  `
};
