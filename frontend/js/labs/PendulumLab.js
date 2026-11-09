export default {
  name: 'PendulumLab',
  data() {
    return {
      mode: 'math', // 'math' (математический) или 'spring' (пружинный)
      length: 1.5, // метры (длина нити)
      mass: 1.0, // кг
      stiffness: 40.0, // Н/м (для пружины)
      initialAngle: 25.0, // градусы
      initialDisplacement: 0.3, // метры (для пружины)
      damping: 0.05,
      g: 9.81,

      // State of motion
      theta: 0,
      omega: 0,
      xSpring: 0,
      vSpring: 0,
      simTime: 0,
      isRunning: true,
      lastTime: performance.now(),
      animationFrameId: null
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
        // v = L * omega
        const v = this.length * this.omega;
        const ek = 0.5 * this.mass * v * v;
        const h = this.length * (1 - Math.cos(this.theta));
        const ep = this.mass * this.g * h;
        return { ek, ep, total: ek + ep };
      } else {
        const ek = 0.5 * this.mass * this.vSpring * this.vSpring;
        const ep = 0.5 * this.stiffness * this.xSpring * this.xSpring;
        return { ek, ep, total: ek + ep };
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
    reset() {
      this.theta = (this.initialAngle * Math.PI) / 180;
      this.omega = 0;
      this.xSpring = this.initialDisplacement;
      this.vSpring = 0;
      this.simTime = 0;
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

      const cx = w * 0.45;
      const cy = 40;

      if (this.mode === 'math') {
        // Mathematical pendulum
        const pxScale = 140; // px per meter
        const bobX = cx + this.length * Math.sin(this.theta) * pxScale;
        const bobY = cy + this.length * Math.cos(this.theta) * pxScale;

        // Ceiling
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 50, cy);
        ctx.lineTo(cx + 50, cy);
        ctx.stroke();

        // Vertical reference line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy + this.length * pxScale + 20);
        ctx.stroke();

        // Rod / string
        ctx.setLineDash([]);
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        // Pivot point
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Bob
        const radius = Math.max(12, Math.min(24, 12 + this.mass * 3));
        ctx.fillStyle = "#f43f5e";
        ctx.strokeStyle = "#fda4af";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bobX, bobY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "600 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${this.mass}kg`, bobX, bobY + 3);
        ctx.restore();
      } else {
        // Spring oscillator (vertical)
        const restLenPx = 110;
        const pxScale = 180;
        const bobY = cy + restLenPx + this.xSpring * pxScale;

        // Ceiling
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 50, cy);
        ctx.lineTo(cx + 50, cy);
        ctx.stroke();

        // Spring coils
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const coils = 12;
        const currentLen = bobY - cy;
        for (let i = 1; i <= coils; i++) {
          const sy = cy + (currentLen / (coils + 1)) * i;
          const sx = cx + (i % 2 === 0 ? 14 : -14);
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(cx, bobY);
        ctx.stroke();

        // Spring bob
        const radius = Math.max(14, Math.min(26, 14 + this.mass * 3));
        ctx.fillStyle = "#10b981";
        ctx.strokeStyle = "#6ee7b7";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx - radius, bobY, radius * 2, radius * 1.5, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "600 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${this.mass}kg`, cx, bobY + radius * 0.9);
        ctx.restore();
      }

      // Energy bar visualization inside canvas (Right side)
      const e = this.energies;
      const barX = w - 80;
      const barMaxH = 160;
      const totalSafe = Math.max(0.01, e.total);
      const ekH = (e.ek / totalSafe) * barMaxH;
      const epH = (e.ep / totalSafe) * barMaxH;

      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(barX, cy + 40, 24, barMaxH);

      // E_k (Rose)
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(barX, cy + 40 + barMaxH - ekH, 24, ekH);

      // E_p (Emerald)
      ctx.fillStyle = "#10b981";
      ctx.fillRect(barX + 28, cy + 40 + barMaxH - epH, 24, epH);

      ctx.fillStyle = "#64748b";
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Ek", barX + 12, cy + 40 + barMaxH + 16);
      ctx.fillText("Ep", barX + 40, cy + 40 + barMaxH + 16);
      ctx.restore();
    },
    animate(now) {
      const dt = Math.min(0.04, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (this.isRunning) {
        if (this.mode === 'math') {
          // Equation: d^2(theta)/dt^2 = -(g/L)*sin(theta) - damping*omega
          const alphaAcc = -(this.g / this.length) * Math.sin(this.theta) - this.damping * this.omega;
          this.omega += alphaAcc * dt;
          this.theta += this.omega * dt;
        } else {
          // Spring: m * a = -k*x - damping*v
          const accel = (-this.stiffness * this.xSpring - this.damping * 4 * this.vSpring) / this.mass;
          this.vSpring += accel * dt;
          this.xSpring += this.vSpring * dt;
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
                  {{ mode === 'math' ? 'Математический маятник' : 'Пружинный осциллятор' }}
                </span>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  T = {{ period.toFixed(2) }} с
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="mode = mode === 'math' ? 'spring' : 'math'; reset()"
                  class="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 transition"
                >
                  {{ mode === 'math' ? 'Переключить на пружину' : 'Переключить на нить' }}
                </button>
                <button
                  @click="reset"
                  class="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Сброс
                </button>
              </div>
            </div>

            <div class="w-full h-88 bg-[#080b11] rounded border border-white/5 relative overflow-hidden">
              <canvas ref="canvas" class="w-full h-full block"></canvas>
            </div>
          </div>
        </div>

        <!-- Controls (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="lab-panel p-4 space-y-4">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-300 block border-b border-white/10 pb-2">
              Параметры маятника
            </span>

            <!-- Math length or Spring stiffness -->
            <div v-if="mode === 'math'" class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Длина нити L</span>
                <span class="font-mono text-sky-400 font-semibold">{{ length.toFixed(2) }} м</span>
              </div>
              <input type="range" min="0.5" max="2.5" step="0.1" v-model.number="length" @input="reset" />
            </div>

            <div v-else class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Жесткость пружины k</span>
                <span class="font-mono text-sky-400 font-semibold">{{ stiffness.toFixed(0) }} Н/м</span>
              </div>
              <input type="range" min="10" max="100" step="5" v-model.number="stiffness" @input="reset" />
            </div>

            <!-- Mass -->
            <div class="space-y-1.5 pt-2 border-t border-white/5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Масса груза m</span>
                <span class="font-mono text-sky-400 font-semibold">{{ mass.toFixed(1) }} кг</span>
              </div>
              <input type="range" min="0.2" max="5.0" step="0.2" v-model.number="mass" @input="reset" />
            </div>

            <!-- Initial angle / displacement -->
            <div class="space-y-1.5 pt-2 border-t border-white/5">
              <div v-if="mode === 'math'" class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Начальное отклонение α₀</span>
                <span class="font-mono text-sky-400 font-semibold">{{ initialAngle.toFixed(0) }}°</span>
              </div>
              <div v-else class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Растяжение x₀</span>
                <span class="font-mono text-sky-400 font-semibold">{{ initialDisplacement.toFixed(2) }} м</span>
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

          <!-- Energy telemetry -->
          <div class="lab-panel p-4 space-y-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-300 block border-b border-white/10 pb-2">
              Энергетический баланс
            </span>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div class="bg-rose-950/20 p-2.5 rounded border border-rose-500/20">
                <span class="text-[10px] text-rose-300 block">Кинетическая Ek</span>
                <span class="text-sm font-semibold text-rose-400">{{ energies.ek.toFixed(3) }} Дж</span>
              </div>
              <div class="bg-emerald-950/20 p-2.5 rounded border border-emerald-500/20">
                <span class="text-[10px] text-emerald-300 block">Потенциальная Ep</span>
                <span class="text-sm font-semibold text-emerald-400">{{ energies.ep.toFixed(3) }} Дж</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
