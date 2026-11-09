export default {
  name: 'CollisionLab',
  data() {
    return {
      collisionType: 'elastic', // 'elastic' (упругий) или 'inelastic' (абсолютно неупругий)
      m1: 2.0,
      v1: 4.0,
      m2: 2.0,
      v2: 0.0,

      // Live simulation
      x1: 150,
      x2: 380,
      curV1: 4.0,
      curV2: 0.0,
      cartWidth: 70,
      cartHeight: 40,
      hasCollided: false,
      isRunning: false,
      lastTime: performance.now(),
      animationFrameId: null
    };
  },
  computed: {
    pInitial() {
      return this.m1 * this.v1 + this.m2 * this.v2;
    },
    ekInitial() {
      return 0.5 * this.m1 * this.v1 * this.v1 + 0.5 * this.m2 * this.v2 * this.v2;
    },
    theoreticalOutcomes() {
      if (this.collisionType === 'inelastic') {
        const u = (this.m1 * this.v1 + this.m2 * this.v2) / (this.m1 + this.m2);
        const ekFinal = 0.5 * (this.m1 + this.m2) * u * u;
        return {
          v1Final: u,
          v2Final: u,
          ekFinal,
          energyLoss: this.ekInitial - ekFinal
        };
      } else {
        const v1Final = ((this.m1 - this.m2) * this.v1 + 2 * this.m2 * this.v2) / (this.m1 + this.m2);
        const v2Final = ((this.m2 - this.m1) * this.v2 + 2 * this.m1 * this.v1) / (this.m1 + this.m2);
        const ekFinal = 0.5 * this.m1 * v1Final * v1Final + 0.5 * this.m2 * v2Final * v2Final;
        return {
          v1Final,
          v2Final,
          ekFinal,
          energyLoss: 0.0
        };
      }
    }
  },
  mounted() {
    this.reset();
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
    start() {
      this.reset();
      this.isRunning = true;
    },
    reset() {
      this.x1 = 120;
      this.x2 = 420;
      this.curV1 = this.v1;
      this.curV2 = this.v2;
      this.hasCollided = false;
      this.isRunning = false;
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

      const trackY = h - 60;

      // Рельс / Трек
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(30, trackY); ctx.lineTo(w - 30, trackY); ctx.stroke();

      // Опоры трека
      for (let x = 70; x < w - 40; x += 130) {
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, trackY); ctx.lineTo(x, trackY + 28); ctx.stroke();
      }

      // Тележка 1 (Синяя)
      this.drawCart(ctx, this.x1, trackY, this.m1, this.curV1, "#38bdf8", "#0284c7", "m₁");
      // Тележка 2 (Оранжевая)
      this.drawCart(ctx, this.x2, trackY, this.m2, this.curV2, "#fbbf24", "#d97706", "m₂");
    },
    drawCart(ctx, x, trackY, mass, velocity, strokeColor, fillColor, label) {
      const y = trackY - this.cartHeight;
      const w = this.cartWidth;
      const h = this.cartHeight;

      ctx.save();
      // Корпус тележки
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y, w, h, 6);
      ctx.fill();
      ctx.stroke();

      // Колеса
      const wheelR = 6;
      ctx.fillStyle = "#1e293b";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.8;

      ctx.beginPath(); ctx.arc(x - w / 3, trackY - wheelR, wheelR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + w / 3, trackY - wheelR, wheelR, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Подпись внутри тележки
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${label}=${mass}кг`, x, y + h / 2 - 2);
      ctx.fillText(`v=${velocity.toFixed(1)}`, x, y + h / 2 + 11);

      // Вектор скорости
      if (Math.abs(velocity) > 0.05) {
        const vLen = velocity * 14;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + vLen, y - 8);
        ctx.stroke();
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

      // Столбчатая диаграмма энергий и импульсов До / После
      const padL = 60, padR = 40, padT = 30, padB = 40;
      const plotH = h - padT - padB;

      ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, padT + plotH); ctx.lineTo(w - padR, padT + plotH); ctx.stroke();

      const outcomes = this.theoreticalOutcomes;
      const maxE = Math.max(this.ekInitial, 1);

      const barW = 34;
      const xE1 = padL + 60;
      const xE2 = padL + 110;
      const xP1 = padL + 210;
      const xP2 = padL + 260;

      const hE1 = (this.ekInitial / maxE) * (plotH - 20);
      const hE2 = (outcomes.ekFinal / maxE) * (plotH - 20);

      // Кинетическая энергия До
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(xE1, padT + plotH - hE1, barW, hE1);
      // Кинетическая энергия После
      ctx.fillStyle = this.collisionType === 'elastic' ? "#38bdf8" : "#f43f5e";
      ctx.fillRect(xE2, padT + plotH - hE2, barW, hE2);

      // Подписи
      ctx.fillStyle = "#94a3b8";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Ek До", xE1 + barW / 2, padT + plotH + 18);
      ctx.fillText("Ek После", xE2 + barW / 2, padT + plotH + 18);

      ctx.fillText(`${this.ekInitial.toFixed(1)} Дж`, xE1 + barW / 2, padT + plotH - hE1 - 6);
      ctx.fillText(`${outcomes.ekFinal.toFixed(1)} Дж`, xE2 + barW / 2, padT + plotH - hE2 - 6);

      // Статус сохранения
      ctx.textAlign = "left";
      ctx.fillStyle = this.collisionType === 'elastic' ? "#34d399" : "#fbbf24";
      ctx.fillText(
        this.collisionType === 'elastic' ? "Упругий удар: энергия сохраняется (ΔEk = 0)" : `Неупругий удар: потери энергии в тепло Q = ${outcomes.energyLoss.toFixed(1)} Дж`,
        padL + 200, padT + 30
      );
      ctx.fillStyle = "#38bdf8";
      ctx.fillText(`Полный импульс P = ${this.pInitial.toFixed(1)} кг·м/с = const`, padL + 200, padT + 60);
    },
    animate(now) {
      const dt = Math.min(0.04, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (this.isRunning) {
        const scalePx = 50;
        this.x1 += this.curV1 * scalePx * dt;
        this.x2 += this.curV2 * scalePx * dt;

        const dist = this.x2 - this.x1;
        if (dist <= this.cartWidth && !this.hasCollided) {
          this.hasCollided = true;
          const outcomes = this.theoreticalOutcomes;
          this.curV1 = outcomes.v1Final;
          this.curV2 = outcomes.v2Final;
        }

        const canvas = this.$refs.simCanvas;
        const maxW = canvas ? canvas.width / (window.devicePixelRatio || 1) : 700;
        if (this.x1 < 40 || this.x2 > maxW - 40) {
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
      <!-- Холсты (8 колонок) -->
      <div class="lg:col-span-8 flex flex-col gap-6">
        
        <!-- Холст 1: Трек с тележками -->
        <div class="glass-panel rounded-2xl p-4 flex flex-col relative overflow-hidden shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3 z-10">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {{ collisionType === 'elastic' ? 'Абсолютно упругий центральный удар' : 'Абсолютно неупругий удар (слипание)' }}
              </span>
              <span v-if="hasCollided" class="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Соударение зафиксировано
              </span>
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="start"
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

          <div class="relative w-full h-[340px] sm:h-[380px] bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden">
            <canvas ref="simCanvas" class="w-full h-full block"></canvas>
          </div>
        </div>

        <!-- Холст 2: График сохранения энергии -->
        <div class="glass-panel rounded-2xl p-4 flex flex-col shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Диаграмма энергии и импульса</span>
              <span class="text-xs text-slate-500">Сравнение кинетической энергии системы до и после соударения</span>
            </div>
          </div>

          <div class="relative w-full h-[220px] sm:h-[240px] bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden">
            <canvas ref="graphCanvas" class="w-full h-full block"></canvas>
          </div>
        </div>

      </div>

      <!-- Правая колонка параметров (4 колонки) -->
      <div class="lg:col-span-4 flex flex-col gap-6">
        
        <div class="glass-panel rounded-2xl p-5 shadow-xl space-y-5">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span class="text-sm font-semibold uppercase tracking-wider text-slate-300">Тип взаимодействия</span>
            <div class="flex gap-1.5 text-xs font-mono">
              <button
                @click="collisionType = 'elastic'; reset()"
                :class="[
                  'px-2.5 py-1 rounded-lg transition',
                  collisionType === 'elastic' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold' : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                ]"
              >
                Упругий
              </button>
              <button
                @click="collisionType = 'inelastic'; reset()"
                :class="[
                  'px-2.5 py-1 rounded-lg transition',
                  collisionType === 'inelastic' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                ]"
              >
                Неупругий
              </button>
            </div>
          </div>

          <!-- Тележка 1 -->
          <div class="space-y-2">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Масса тележки 1 <span class="font-mono text-sky-400">m₁</span></label>
              <span class="font-mono text-base font-bold text-sky-400">{{ m1.toFixed(1) }} кг</span>
            </div>
            <input type="range" min="0.5" max="5.0" step="0.5" v-model.number="m1" @input="reset" />
            <div class="flex justify-between items-baseline pt-1">
              <label class="text-sm font-medium text-slate-200">Скорость тележки 1 <span class="font-mono text-sky-400">v₁</span></label>
              <span class="font-mono text-base font-bold text-sky-400">{{ v1.toFixed(1) }} м/с</span>
            </div>
            <input type="range" min="1.0" max="6.0" step="0.5" v-model.number="v1" @input="reset" />
          </div>

          <!-- Тележка 2 -->
          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-baseline">
              <label class="text-sm font-medium text-slate-200">Масса тележки 2 <span class="font-mono text-amber-400">m₂</span></label>
              <span class="font-mono text-base font-bold text-amber-400">{{ m2.toFixed(1) }} кг</span>
            </div>
            <input type="range" min="0.5" max="5.0" step="0.5" v-model.number="m2" @input="reset" />
            <div class="flex justify-between items-baseline pt-1">
              <label class="text-sm font-medium text-slate-200">Скорость тележки 2 <span class="font-mono text-amber-400">v₂</span></label>
              <span class="font-mono text-base font-bold text-amber-400">{{ v2.toFixed(1) }} м/с</span>
            </div>
            <input type="range" min="-3.0" max="3.0" step="0.5" v-model.number="v2" @input="reset" />
          </div>
        </div>

        <!-- Дашборд расчетов -->
        <div class="glass-panel rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 mb-3.5">
              Законы сохранения
            </h2>

            <div class="grid grid-cols-2 gap-3 font-mono">
              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Полный импульс P</span>
                <span class="text-lg font-bold text-white">{{ pInitial.toFixed(1) }} кг·м/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">m₁v₁ + m₂v₂ = const</div>
              </div>

              <div class="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3">
                <span class="text-[11px] text-rose-300 block">Потеря энергии ΔEk</span>
                <span class="text-lg font-bold text-rose-400">{{ theoreticalOutcomes.energyLoss.toFixed(2) }} Дж</span>
                <div class="text-[10px] text-rose-300/70 mt-0.5">Переход в тепло Q</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Скорость v₁' после</span>
                <span class="text-base font-bold text-sky-400">{{ theoreticalOutcomes.v1Final.toFixed(2) }} м/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">Тележка 1</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3">
                <span class="text-[11px] text-slate-400 block">Скорость v₂' после</span>
                <span class="text-base font-bold text-amber-400">{{ theoreticalOutcomes.v2Final.toFixed(2) }} м/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">Тележка 2</div>
              </div>
            </div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed space-y-1">
            <span class="font-semibold text-slate-200 block">Закон сохранения импульса:</span>
            В замкнутой системе векторная сумма импульсов тел остаётся неизменной при любых соударениях, независимо от того, упругий удар или неупругий.
          </div>
        </div>

      </div>
    </div>
  `
};
