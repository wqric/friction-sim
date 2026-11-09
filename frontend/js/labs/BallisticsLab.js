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
      ctx.strokeStyle = "rgba(238, 240, 245, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.restore();

      const originX = 40;
      const groundY = h - 36;
      const maxPlotX = Math.max(80, this.flightRange * 1.15);
      const maxPlotY = Math.max(30, this.maxHeight * 1.25);
      const scaleX = (w - originX - 30) / maxPlotX;
      const scaleY = (groundY - 30) / maxPlotY;

      // Ground line
      ctx.save();
      ctx.strokeStyle = "rgba(238, 240, 245, 0.15)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(originX - 20, groundY);
      ctx.lineTo(w - 10, groundY);
      ctx.stroke();

      // Launch platform
      ctx.fillStyle = "#181d28";
      ctx.fillRect(originX - 4, groundY - this.h0 * scaleY, 8, this.h0 * scaleY);
      ctx.restore();

      // Theoretical trajectory (dashed line)
      ctx.save();
      ctx.strokeStyle = "rgba(238, 240, 245, 0.25)";
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 3]);
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
        ctx.strokeStyle = "#eef0f5";
        ctx.lineWidth = 1.8;
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
      ctx.arc(curPx, curPy, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Velocity vector
      const vMag = Math.hypot(cur.vx, cur.vy);
      if (vMag > 0.5) {
        const vLen = Math.min(45, vMag * 1.4);
        const vxNorm = (cur.vx / vMag) * vLen;
        const vyNorm = (-cur.vy / vMag) * vLen;
        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(curPx, curPy);
        ctx.lineTo(curPx + vxNorm, curPy + vyNorm);
        ctx.stroke();
      }
      ctx.restore();

      // Axis values
      ctx.save();
      ctx.fillStyle = "#7a8296";
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.fillText(`0`, originX - 10, groundY + 14);
      ctx.fillText(`${this.flightRange.toFixed(1)} м (L)`, originX + this.flightRange * scaleX - 15, groundY + 14);
      ctx.fillText(`${this.maxHeight.toFixed(1)} м (H)`, originX - 36, groundY - this.maxHeight * scaleY);
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
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Canvas (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          <div class="lab-panel p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 text-xs">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-[#eef0f5]">Баллистическая траектория</span>
                <span class="text-[11px] font-mono text-[#a3a9b8] px-2 py-0.2 rounded-[2px] bg-[#181d28] border border-white/[0.08]">
                  t = {{ currentPos.t.toFixed(2) }} с
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="fire"
                  class="btn-primary px-3 py-1 text-xs font-mono"
                >
                  Запуск
                </button>
                <button
                  @click="reset"
                  class="px-2.5 py-1 text-xs rounded-[3px] bg-[#181d28] hover:bg-[#1f2533] text-[#eef0f5] border border-white/[0.08] transition"
                >
                  Сброс
                </button>
              </div>
            </div>

            <div class="w-full h-96 bg-[#07080d] rounded-[4px] border border-white/[0.06] relative overflow-hidden">
              <canvas ref="canvas" class="w-full h-full block"></canvas>
            </div>
          </div>
        </div>

        <!-- Controls (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="lab-panel p-4 space-y-4">
            <span class="text-xs font-medium text-[#eef0f5] block border-b border-white/[0.08] pb-1.5">
              Параметры запуска
            </span>

            <!-- Velocity -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Начальная скорость v₀</span>
                <span class="font-mono text-[#eef0f5]">{{ v0.toFixed(1) }} м/с</span>
              </div>
              <input type="range" min="5" max="50" step="1" v-model.number="v0" @input="reset" />
            </div>

            <!-- Angle -->
            <div class="space-y-1 pt-2 border-t border-white/[0.06]">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Угол вылета α</span>
                <span class="font-mono text-[#eef0f5]">{{ alpha.toFixed(0) }}°</span>
              </div>
              <input type="range" min="5" max="85" step="1" v-model.number="alpha" @input="reset" />
              <div class="flex gap-1 pt-1">
                <button
                  v-for="deg in [30, 45, 60]"
                  :key="deg"
                  @click="alpha = deg; reset()"
                  class="px-2 py-0.5 text-[11px] font-mono rounded-[3px] bg-[#181d28] border border-white/[0.06] text-[#a3a9b8] hover:text-white"
                >
                  {{ deg }}°
                </button>
              </div>
            </div>

            <!-- Initial Height -->
            <div class="space-y-1 pt-2 border-t border-white/[0.06]">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Высота платформы h₀</span>
                <span class="font-mono text-[#eef0f5]">{{ h0.toFixed(1) }} м</span>
              </div>
              <input type="range" min="0" max="30" step="1" v-model.number="h0" @input="reset" />
            </div>
          </div>

          <!-- Output -->
          <div class="lab-panel p-4 space-y-2.5">
            <span class="text-xs font-medium text-[#eef0f5] block border-b border-white/[0.08] pb-1.5">
              Аналитический расчет
            </span>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Дальность L</span>
                <span class="text-xs text-[#eef0f5] font-medium">{{ flightRange.toFixed(2) }} м</span>
              </div>
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Макс. высота H</span>
                <span class="text-xs text-[#34d399] font-medium">{{ maxHeight.toFixed(2) }} м</span>
              </div>
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Время полета T</span>
                <span class="text-xs text-[#fbbf24] font-medium">{{ totalFlightTime.toFixed(2) }} с</span>
              </div>
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Скорость v</span>
                <span class="text-xs text-[#a3a9b8] font-medium">{{ Math.hypot(currentPos.vx, currentPos.vy).toFixed(1) }} м/с</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
