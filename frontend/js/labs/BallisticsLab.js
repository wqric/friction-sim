export default {
  name: 'BallisticsLab',
  data() {
    return {
      v0: 25.0,
      alpha: 45.0,
      h0: 0.0,
      g: 9.81,
      simTime: 0,
      isRunning: false,
      history: [],
      lastTime: performance.now(),
      animationFrameId: null
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
      // y = h0 + v0y*t - 0.5*g*t^2 = 0
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
    }
  },
  mounted() {
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

      const originX = 50;
      const groundY = h - 40;
      const maxPlotX = Math.max(80, this.flightRange * 1.15);
      const maxPlotY = Math.max(30, this.maxHeight * 1.25);
      const scaleX = (w - originX - 30) / maxPlotX;
      const scaleY = (groundY - 30) / maxPlotY;

      // Ground
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(originX - 20, groundY);
      ctx.lineTo(w - 10, groundY);
      ctx.stroke();

      // Launch tower / cannon
      ctx.fillStyle = "#334155";
      ctx.fillRect(originX - 6, groundY - this.h0 * scaleY, 12, this.h0 * scaleY);
      ctx.restore();

      // Theoretical trajectory (dashed line)
      ctx.save();
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1.5;
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

      // Trajectory trail
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

      // Projectile
      const cur = this.currentPos;
      const curPx = originX + cur.x * scaleX;
      const curPy = groundY - cur.y * scaleY;

      ctx.save();
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.arc(curPx, curPy, 5, 0, Math.PI * 2);
      ctx.fill();

      // Velocity vector
      const vMag = Math.hypot(cur.vx, cur.vy);
      if (vMag > 0.5) {
        const vLen = Math.min(50, vMag * 1.5);
        const vxNorm = (cur.vx / vMag) * vLen;
        const vyNorm = (-cur.vy / vMag) * vLen; // Canvas Y inverted
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(curPx, curPy);
        ctx.lineTo(curPx + vxNorm, curPy + vyNorm);
        ctx.stroke();
      }
      ctx.restore();

      // Axis labels
      ctx.save();
      ctx.fillStyle = "#64748b";
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.fillText(`0`, originX - 10, groundY + 16);
      ctx.fillText(`${this.flightRange.toFixed(1)} м (L)`, originX + this.flightRange * scaleX - 15, groundY + 16);
      ctx.fillText(`${this.maxHeight.toFixed(1)} м (H)`, originX - 42, groundY - this.maxHeight * scaleY);
      ctx.restore();
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

      this.render();
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  },
  template: `
    <div class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Canvas simulation (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          <div class="lab-panel p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-300">Баллистическая траектория</span>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  t = {{ currentPos.t.toFixed(2) }} с
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="fire"
                  class="px-3 py-1 text-xs font-medium rounded bg-sky-500 hover:bg-sky-400 text-slate-950 transition font-mono"
                >
                  Запуск ▶
                </button>
                <button
                  @click="reset"
                  class="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                >
                  Сброс
                </button>
              </div>
            </div>

            <div class="w-full h-96 bg-[#080b11] rounded border border-white/5 relative overflow-hidden">
              <canvas ref="canvas" class="w-full h-full block"></canvas>
            </div>
          </div>
        </div>

        <!-- Parameters & Metrics (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="lab-panel p-4 space-y-4">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-300 block border-b border-white/10 pb-2">
              Параметры выстрела
            </span>

            <!-- Velocity -->
            <div class="space-y-1.5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Начальная скорость v₀</span>
                <span class="font-mono text-sky-400 font-semibold">{{ v0.toFixed(1) }} м/с</span>
              </div>
              <input type="range" min="5" max="50" step="1" v-model.number="v0" @input="reset" />
            </div>

            <!-- Angle -->
            <div class="space-y-1.5 pt-2 border-t border-white/5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Угол вылета α</span>
                <span class="font-mono text-sky-400 font-semibold">{{ alpha.toFixed(0) }}°</span>
              </div>
              <input type="range" min="5" max="85" step="1" v-model.number="alpha" @input="reset" />
              <div class="flex gap-1.5 pt-1">
                <button
                  v-for="deg in [30, 45, 60]"
                  :key="deg"
                  @click="alpha = deg; reset()"
                  class="px-2 py-0.5 text-[11px] font-mono rounded bg-slate-900 border border-white/5 text-slate-300 hover:text-white"
                >
                  {{ deg }}°
                </button>
              </div>
            </div>

            <!-- Initial Height -->
            <div class="space-y-1.5 pt-2 border-t border-white/5">
              <div class="flex justify-between text-xs">
                <span class="text-slate-300 font-medium">Высота платформы h₀</span>
                <span class="font-mono text-sky-400 font-semibold">{{ h0.toFixed(1) }} м</span>
              </div>
              <input type="range" min="0" max="30" step="1" v-model.number="h0" @input="reset" />
            </div>
          </div>

          <!-- Calculated Output -->
          <div class="lab-panel p-4 space-y-3">
            <span class="text-xs font-semibold uppercase tracking-wider text-slate-300 block border-b border-white/10 pb-2">
              Аналитический расчет
            </span>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Дальность L</span>
                <span class="text-sm font-semibold text-sky-400">{{ flightRange.toFixed(2) }} м</span>
              </div>
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Макс. высота H</span>
                <span class="text-sm font-semibold text-emerald-400">{{ maxHeight.toFixed(2) }} м</span>
              </div>
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Время полета T</span>
                <span class="text-sm font-semibold text-amber-400">{{ totalFlightTime.toFixed(2) }} с</span>
              </div>
              <div class="bg-slate-900/60 p-2.5 rounded border border-white/5">
                <span class="text-[10px] text-slate-400 block">Текущая скор. v</span>
                <span class="text-sm font-semibold text-indigo-300">{{ Math.hypot(currentPos.vx, currentPos.vy).toFixed(1) }} м/с</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
