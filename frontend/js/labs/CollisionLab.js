export default {
  name: 'CollisionLab',
  data() {
    return {
      collisionType: 'elastic',
      m1: 2.0,
      v1: 4.0,
      m2: 2.0,
      v2: 0.0,

      showVectors: true,
      showMomentum: true,
      showForces: true,

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
    centerOfMassVelocity() {
      return (this.m1 * this.v1 + this.m2 * this.v2) / (this.m1 + this.m2);
    },
    theoreticalOutcomes() {
      if (this.collisionType === 'inelastic') {
        const u = (this.m1 * this.v1 + this.m2 * this.v2) / (this.m1 + this.m2);
        const ekFinal = 0.5 * (this.m1 + this.m2) * u * u;
        const impulse = Math.abs(this.m1 * (u - this.v1));
        return {
          v1Final: u,
          v2Final: u,
          ekFinal,
          energyLoss: this.ekInitial - ekFinal,
          impulse
        };
      } else {
        const v1Final = ((this.m1 - this.m2) * this.v1 + 2 * this.m2 * this.v2) / (this.m1 + this.m2);
        const v2Final = ((this.m2 - this.m1) * this.v2 + 2 * this.m1 * this.v1) / (this.m1 + this.m2);
        const ekFinal = 0.5 * this.m1 * v1Final * v1Final + 0.5 * this.m2 * v2Final * v2Final;
        const impulse = Math.abs(this.m1 * (v1Final - this.v1));
        return {
          v1Final,
          v2Final,
          ekFinal,
          energyLoss: 0.0,
          impulse
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
    drawVector(ctx, x1, y1, x2, y2, color, label, labelOffset = { x: 0, y: 0 }) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 4) return;
      const angle = Math.atan2(dy, dx);
      const headLen = Math.min(10, Math.max(6, len * 0.25));

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

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
      this.drawCart(ctx, this.x1, trackY, this.m1, this.curV1, "#38bdf8", "#0284c7", "m₁", "1");
      // Тележка 2 (Оранжевая)
      this.drawCart(ctx, this.x2, trackY, this.m2, this.curV2, "#fbbf24", "#d97706", "m₂", "2");

      // Векторы силы взаимодействия при контакте
      if (this.showForces && this.hasCollided) {
        const contactX = (this.x1 + this.cartWidth / 2 + this.x2 - this.cartWidth / 2) / 2;
        const contactY = trackY - this.cartHeight / 2;
        const fLen = 45;
        this.drawVector(ctx, contactX, contactY - 14, contactX - fLen, contactY - 14, "#f43f5e", "F₂₁", { x: -35, y: -8 });
        this.drawVector(ctx, contactX, contactY + 14, contactX + fLen, contactY + 14, "#f43f5e", "F₁₂", { x: 8, y: 12 });
      }
    },
    drawCart(ctx, x, trackY, mass, velocity, strokeColor, fillColor, label, idx) {
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
      ctx.restore();

      // Вектор скорости
      if (this.showVectors && Math.abs(velocity) > 0.05) {
        const vLen = Math.max(16, Math.min(80, Math.abs(velocity) * 16)) * Math.sign(velocity);
        this.drawVector(ctx, x, y - 10, x + vLen, y - 10, strokeColor, `v${idx}=${velocity.toFixed(1)}м/с`, { x: velocity > 0 ? 6 : -45, y: -6 });
      }

      // Вектор импульса
      if (this.showMomentum && Math.abs(velocity) > 0.05) {
        const p = mass * velocity;
        const pLen = Math.max(16, Math.min(95, Math.abs(p) * 8)) * Math.sign(p);
        this.drawVector(ctx, x, y - 26, x + pLen, y - 26, "#a855f7", `p${idx}=${p.toFixed(1)}`, { x: p > 0 ? 6 : -40, y: -6 });
      }
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

            <!-- Тумблеры векторов -->
            <div class="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
              <div class="flex flex-wrap items-center gap-1.5">
                <button
                  @click="showVectors = !showVectors"
                  :class="[
                    'px-2.5 py-1 text-xs rounded-lg border font-mono transition flex items-center gap-1.5 backdrop-blur-md',
                    showVectors ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full" :class="showVectors ? 'bg-sky-400' : 'bg-slate-600'"></span>
                  <span>Скорости v₁ & v₂</span>
                </button>

                <button
                  @click="showMomentum = !showMomentum"
                  :class="[
                    'px-2.5 py-1 text-xs rounded-lg border font-mono transition flex items-center gap-1.5 backdrop-blur-md',
                    showMomentum ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full" :class="showMomentum ? 'bg-purple-400' : 'bg-slate-600'"></span>
                  <span>Импульсы p₁ & p₂</span>
                </button>

                <button
                  @click="showForces = !showForces"
                  :class="[
                    'px-2.5 py-1 text-xs rounded-lg border font-mono transition flex items-center gap-1.5 backdrop-blur-md',
                    showForces ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full" :class="showForces ? 'bg-rose-400' : 'bg-slate-600'"></span>
                  <span>Силы соударения F₁₂</span>
                </button>
              </div>
            </div>
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
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Масса тележки 1 <span class="font-mono text-sky-400">m₁</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.2"
                  max="10.0"
                  step="0.1"
                  v-model.number="m1"
                  @input="reset"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">кг</span>
              </div>
            </div>
            <input type="range" min="0.5" max="5.0" step="0.5" v-model.number="m1" @input="reset" />

            <div class="flex justify-between items-center pt-2">
              <label class="text-sm font-medium text-slate-200">Скорость 1 <span class="font-mono text-sky-400">v₁</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  v-model.number="v1"
                  @input="reset"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">м/с</span>
              </div>
            </div>
            <input type="range" min="1.0" max="6.0" step="0.5" v-model.number="v1" @input="reset" />
          </div>

          <!-- Тележка 2 -->
          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Масса тележки 2 <span class="font-mono text-amber-400">m₂</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.2"
                  max="10.0"
                  step="0.1"
                  v-model.number="m2"
                  @input="reset"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">кг</span>
              </div>
            </div>
            <input type="range" min="0.5" max="5.0" step="0.5" v-model.number="m2" @input="reset" />

            <div class="flex justify-between items-center pt-2">
              <label class="text-sm font-medium text-slate-200">Скорость 2 <span class="font-mono text-amber-400">v₂</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="-6.0"
                  max="6.0"
                  step="0.5"
                  v-model.number="v2"
                  @input="reset"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">м/с</span>
              </div>
            </div>
            <input type="range" min="-3.0" max="3.0" step="0.5" v-model.number="v2" @input="reset" />
          </div>
        </div>

        <!-- Дашборд расчетов -->
        <div class="glass-panel rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 mb-3.5 flex items-center justify-between">
              <span>Законы сохранения</span>
              <span class="text-[11px] font-mono font-normal text-sky-400">P = const</span>
            </h2>

            <div class="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Полный импульс P</span>
                <span class="text-base font-bold text-white">{{ pInitial.toFixed(2) }} кг·м/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">m₁v₁ + m₂v₂ = const</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Скорость ц. масс v_см</span>
                <span class="text-base font-bold text-sky-400">{{ centerOfMassVelocity.toFixed(2) }} м/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">P / (m₁ + m₂)</div>
              </div>

              <div class="bg-rose-950/30 border border-rose-500/30 rounded-xl p-2.5">
                <span class="text-[10px] text-rose-300 block">Потеря энергии ΔEk</span>
                <span class="text-base font-bold text-rose-400">{{ theoreticalOutcomes.energyLoss.toFixed(2) }} Дж</span>
                <div class="text-[10px] text-rose-300/70 mt-0.5">{{ collisionType === 'elastic' ? 'Упруго (0 Дж)' : 'Тепло Q' }}</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Ударный импульс J</span>
                <span class="text-base font-bold text-purple-400">{{ theoreticalOutcomes.impulse.toFixed(2) }} Н·с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">|Δp₁| = |Δp₂|</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Скорость v₁' после</span>
                <span class="text-base font-bold text-sky-400">{{ theoreticalOutcomes.v1Final.toFixed(2) }} м/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">p₁' = {{(m1 * theoreticalOutcomes.v1Final).toFixed(1)}}</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Скорость v₂' после</span>
                <span class="text-base font-bold text-amber-400">{{ theoreticalOutcomes.v2Final.toFixed(2) }} м/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">p₂' = {{(m2 * theoreticalOutcomes.v2Final).toFixed(1)}}</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Ek до удара</span>
                <span class="text-base font-bold text-emerald-400">{{ ekInitial.toFixed(2) }} Дж</span>
                <div class="text-[10px] text-slate-500 mt-0.5">Начальная сумма</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Ek после удара</span>
                <span class="text-base font-bold text-white">{{ theoreticalOutcomes.ekFinal.toFixed(2) }} Дж</span>
                <div class="text-[10px] text-slate-500 mt-0.5">Конечная сумма</div>
              </div>
            </div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed space-y-1">
            <span class="font-semibold text-slate-200 block">Закон сохранения импульса:</span>
            В замкнутой системе векторная сумма импульсов тел остаётся неизменной при любых соударениях, независимо от того, упругий удар или неупругий.
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
