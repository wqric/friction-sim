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
    // Initial momentum & energy
    pInitial() {
      return this.m1 * this.v1 + this.m2 * this.v2;
    },
    ekInitial() {
      return 0.5 * this.m1 * this.v1 * this.v1 + 0.5 * this.m2 * this.v2 * this.v2;
    },
    // Final theoretical velocities
    theoreticalOutcomes() {
      if (this.collisionType === 'inelastic') {
        // u = (m1*v1 + m2*v2) / (m1 + m2)
        const u = (this.m1 * this.v1 + this.m2 * this.v2) / (this.m1 + this.m2);
        const ekFinal = 0.5 * (this.m1 + this.m2) * u * u;
        return {
          v1Final: u,
          v2Final: u,
          ekFinal,
          energyLoss: this.ekInitial - ekFinal
        };
      } else {
        // 1D elastic collision
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
    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeCanvas);
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
    resizeCanvas() {
      const dpr = window.devicePixelRatio || 1;
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    render() {
      const canvas = this.$refs.canvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // Grid
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.restore();

      const trackY = h - 60;

      // Track
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, trackY);
      ctx.lineTo(w - 30, trackY);
      ctx.stroke();

      // Track supports
      for (let x = 60; x < w - 40; x += 120) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.moveTo(x, trackY);
        ctx.lineTo(x, trackY + 25);
        ctx.stroke();
      }
      ctx.restore();

      // Draw Cart 1
      this.drawCart(ctx, this.x1, trackY, this.m1, this.curV1, "#38bdf8", "#0284c7", "m₁");
      // Draw Cart 2
      this.drawCart(ctx, this.x2, trackY, this.m2, this.curV2, "#fbbf24", "#d97706", "m₂");
    },
    drawCart(ctx, x, trackY, mass, velocity, strokeColor, fillColor, label) {
      const y = trackY - this.cartHeight;
      const w = this.cartWidth;
      const h = this.cartHeight;

      ctx.save();
      // Body
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y, w, h, 4);
      ctx.fill();
      ctx.stroke();

      // Wheels
      const wheelR = 5;
      ctx.fillStyle = "#334155";
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(x - w / 3, trackY - wheelR, wheelR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.arc(x + w / 3, trackY - wheelR, wheelR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Text label inside cart
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${label}=${mass}kg`, x, y + h / 2 - 2);
      ctx.fillText(`v=${velocity.toFixed(1)}`, x, y + h / 2 + 10);

      // Velocity vector arrow
      if (Math.abs(velocity) > 0.05) {
        const vLen = velocity * 12;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x + vLen, y - 8);
        ctx.stroke();
      }

      ctx.restore();
    },
    animate(now) {
      const dt = Math.min(0.04, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (this.isRunning) {
        const scalePx = 50; // 1 m/s = 50 px/s
        this.x1 += this.curV1 * scalePx * dt;
        this.x2 += this.curV2 * scalePx * dt;

        // Check collision between carts
        const dist = this.x2 - this.x1;
        if (dist <= this.cartWidth && !this.hasCollided) {
          this.hasCollided = true;
          const outcomes = this.theoreticalOutcomes;
          this.curV1 = outcomes.v1Final;
          this.curV2 = outcomes.v2Final;
        }

        const canvas = this.$refs.canvas;
        const maxW = canvas ? canvas.width / (window.devicePixelRatio || 1) : 600;
        if (this.x1 < 40 || this.x2 > maxW - 40) {
          this.isRunning = false;
        }
      }

      this.render();
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  },
  template: `
    <div class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Canvas Visuals (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          <div class="lab-panel p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {{ collisionType === 'elastic' ? 'Абсолютно упругий удар' : 'Абсолютно неупругий удар' }}
                </span>
                <span v-if="hasCollided" class="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Соударение произошло
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="start"
                  class="px-3 py-1 text-xs font-medium rounded bg-sky-500 hover:bg-sky-400 text-slate-950 transition font-mono"
                >
                  Пуск ▶
                </button>
                <button
                  @click="reset"
                  class="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Сброс
                </button>
              </div>
            </div>

            <div class="w-full h-80 bg-[#080b11] rounded border border-white/5 relative overflow-hidden">
              <canvas ref="canvas" class="w-full h-full block"></canvas>
            </div>
          </div>
        </div>

        <!-- Controls (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="lab-panel p-4 space-y-4">
            <div class="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">Тип соударения</span>
              <div class="flex gap-1 text-[11px] font-mono">
                <button
                  @click="collisionType = 'elastic'; reset()"
                  :class="[
                    'px-2 py-0.5 rounded border transition',
                    collisionType === 'elastic' ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-slate-900 text-slate-400 border-white/5'
                  ]"
                >
                  Упругий
                </button>
                <button
                  @click="collisionType = 'inelastic'; reset()"
                  :class="[
                    'px-2 py-0.5 rounded border transition',
                    collisionType === 'inelastic' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900 text-slate-400 border-white/5'
                  ]"
                >
                  Неупругий
                </button>
              </div>
            </div>

            <!-- Cart 1 (m1, v1) -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Масса m₁</span>
                <span class="font-mono text-sky-400 font-semibold">{{ m1.toFixed(1) }} кг</span>
              </div>
              <input type="range" min="0.5" max="5.0" step="0.5" v-model.number="m1" @input="reset" />
              <div class="flex justify-between text-xs pt-1">
                <span class="text-slate-300 font-medium">Скорость v₁</span>
                <span class="font-mono text-sky-400 font-semibold">{{ v1.toFixed(1) }} м/с</span>
              </div>
              <input type="range" min="1.0" max="6.0" step="0.5" v-model.number="v1" @input="reset" />
            </div>

            <!-- Cart 2 (m2, v2) -->
            <div class="space-y-1.5 pt-2 border-t border-white/5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Масса m₂</span>
                <span class="font-mono text-amber-400 font-semibold">{{ m2.toFixed(1) }} кг</span>
              </div>
              <input type="range" min="0.5" max="5.0" step="0.5" v-model.number="m2" @input="reset" />
              <div class="flex justify-between text-xs pt-1">
                <span class="text-slate-300 font-medium">Скорость v₂</span>
                <span class="font-mono text-amber-400 font-semibold">{{ v2.toFixed(1) }} м/с</span>
              </div>
              <input type="range" min="-3.0" max="3.0" step="0.5" v-model.number="v2" @input="reset" />
            </div>
          </div>

          <!-- Conservation laws Output -->
          <div class="lab-panel p-4 space-y-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-300 block border-b border-white/10 pb-2">
              Законы сохранения
            </span>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Полный импульс P</span>
                <span class="text-sm font-semibold text-white">{{ pInitial.toFixed(1) }} кг·м/с</span>
              </div>
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Потеря энергии ΔEk</span>
                <span class="text-sm font-semibold text-rose-400">{{ theoreticalOutcomes.energyLoss.toFixed(2) }} Дж</span>
              </div>
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Скор. v₁ после</span>
                <span class="text-sm font-semibold text-sky-400">{{ theoreticalOutcomes.v1Final.toFixed(2) }} м/с</span>
              </div>
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Скор. v₂ после</span>
                <span class="text-sm font-semibold text-amber-400">{{ theoreticalOutcomes.v2Final.toFixed(2) }} м/с</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
