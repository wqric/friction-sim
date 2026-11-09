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
      damping: 0.05,
      g: 9.81,

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
      ctx.strokeStyle = "rgba(238, 240, 245, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.restore();

      const cx = w * 0.42;
      const cy = 36;

      if (this.mode === 'math') {
        const pxScale = 130;
        const bobX = cx + this.length * Math.sin(this.theta) * pxScale;
        const bobY = cy + this.length * Math.cos(this.theta) * pxScale;

        // Ceiling
        ctx.save();
        ctx.strokeStyle = "rgba(238, 240, 245, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy);
        ctx.lineTo(cx + 40, cy);
        ctx.stroke();

        // Vertical reference line
        ctx.strokeStyle = "rgba(238, 240, 245, 0.1)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy + this.length * pxScale + 16);
        ctx.stroke();

        // String
        ctx.setLineDash([]);
        ctx.strokeStyle = "#a3a9b8";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(bobX, bobY);
        ctx.stroke();

        // Pivot point
        ctx.fillStyle = "#eef0f5";
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Bob
        const radius = Math.max(12, Math.min(22, 11 + this.mass * 2.5));
        ctx.fillStyle = "#181d28";
        ctx.strokeStyle = "#eef0f5";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bobX, bobY, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#eef0f5";
        ctx.font = "500 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${this.mass} кг`, bobX, bobY + 3);
        ctx.restore();
      } else {
        const restLenPx = 100;
        const pxScale = 160;
        const bobY = cy + restLenPx + this.xSpring * pxScale;

        // Ceiling
        ctx.save();
        ctx.strokeStyle = "rgba(238, 240, 245, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - 40, cy);
        ctx.lineTo(cx + 40, cy);
        ctx.stroke();

        // Spring coils
        ctx.strokeStyle = "#a3a9b8";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const coils = 12;
        const currentLen = bobY - cy;
        for (let i = 1; i <= coils; i++) {
          const sy = cy + (currentLen / (coils + 1)) * i;
          const sx = cx + (i % 2 === 0 ? 12 : -12);
          ctx.lineTo(sx, sy);
        }
        ctx.lineTo(cx, bobY);
        ctx.stroke();

        // Bob
        const radius = Math.max(14, Math.min(24, 13 + this.mass * 2.5));
        ctx.fillStyle = "#181d28";
        ctx.strokeStyle = "#eef0f5";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx - radius, bobY, radius * 2, radius * 1.4, 3);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#eef0f5";
        ctx.font = "500 10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${this.mass} кг`, cx, bobY + radius * 0.85);
        ctx.restore();
      }

      // Energy bar visualization
      const e = this.energies;
      const barX = w - 70;
      const barMaxH = 140;
      const totalSafe = Math.max(0.01, e.total);
      const ekH = (e.ek / totalSafe) * barMaxH;
      const epH = (e.ep / totalSafe) * barMaxH;

      ctx.save();
      ctx.fillStyle = "rgba(238, 240, 245, 0.04)";
      ctx.fillRect(barX, cy + 30, 20, barMaxH);
      ctx.fillRect(barX + 24, cy + 30, 20, barMaxH);

      // Ek
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(barX, cy + 30 + barMaxH - ekH, 20, ekH);

      // Ep
      ctx.fillStyle = "#34d399";
      ctx.fillRect(barX + 24, cy + 30 + barMaxH - epH, 20, epH);

      ctx.fillStyle = "#7a8296";
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("Ek", barX + 10, cy + 30 + barMaxH + 14);
      ctx.fillText("Ep", barX + 34, cy + 30 + barMaxH + 14);
      ctx.restore();
    },
    animate(now) {
      const dt = Math.min(0.04, (now - this.lastTime) / 1000);
      this.lastTime = now;

      if (this.isRunning) {
        if (this.mode === 'math') {
          const alphaAcc = -(this.g / this.length) * Math.sin(this.theta) - this.damping * this.omega;
          this.omega += alphaAcc * dt;
          this.theta += this.omega * dt;
        } else {
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
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Visuals (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          <div class="lab-panel p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 text-xs">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-[#eef0f5]">
                  {{ mode === 'math' ? 'Математический маятник' : 'Пружинный осциллятор' }}
                </span>
                <span class="text-[11px] font-mono text-[#a3a9b8] px-2 py-0.2 rounded-[2px] bg-[#181d28] border border-white/[0.08]">
                  T = {{ period.toFixed(2) }} с
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="mode = mode === 'math' ? 'spring' : 'math'; reset()"
                  class="px-2.5 py-1 text-xs rounded-[3px] bg-[#181d28] hover:bg-[#1f2533] text-[#eef0f5] border border-white/[0.08] transition"
                >
                  {{ mode === 'math' ? 'Пружина' : 'Нить' }}
                </button>
                <button
                  @click="reset"
                  class="px-2.5 py-1 text-xs rounded-[3px] bg-[#181d28] hover:bg-[#1f2533] text-[#eef0f5] border border-white/[0.08] transition"
                >
                  Сброс
                </button>
              </div>
            </div>

            <div class="w-full h-88 bg-[#07080d] rounded-[4px] border border-white/[0.06] relative overflow-hidden">
              <canvas ref="canvas" class="w-full h-full block"></canvas>
            </div>
          </div>
        </div>

        <!-- Controls (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="lab-panel p-4 space-y-4">
            <span class="text-xs font-medium text-[#eef0f5] block border-b border-white/[0.08] pb-1.5">
              Параметры осциллятора
            </span>

            <div v-if="mode === 'math'" class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Длина нити L</span>
                <span class="font-mono text-[#eef0f5]">{{ length.toFixed(2) }} м</span>
              </div>
              <input type="range" min="0.5" max="2.5" step="0.1" v-model.number="length" @input="reset" />
            </div>

            <div v-else class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Жесткость k</span>
                <span class="font-mono text-[#eef0f5]">{{ stiffness.toFixed(0) }} Н/м</span>
              </div>
              <input type="range" min="10" max="100" step="5" v-model.number="stiffness" @input="reset" />
            </div>

            <!-- Mass -->
            <div class="space-y-1 pt-2 border-t border-white/[0.06]">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Масса m</span>
                <span class="font-mono text-[#eef0f5]">{{ mass.toFixed(1) }} кг</span>
              </div>
              <input type="range" min="0.2" max="5.0" step="0.2" v-model.number="mass" @input="reset" />
            </div>

            <!-- Displacement -->
            <div class="space-y-1 pt-2 border-t border-white/[0.06]">
              <div v-if="mode === 'math'" class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Отклонение α₀</span>
                <span class="font-mono text-[#eef0f5]">{{ initialAngle.toFixed(0) }}°</span>
              </div>
              <div v-else class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Растяжение x₀</span>
                <span class="font-mono text-[#eef0f5]">{{ initialDisplacement.toFixed(2) }} м</span>
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

          <!-- Energy panel -->
          <div class="lab-panel p-4 space-y-2.5">
            <span class="text-xs font-medium text-[#eef0f5] block border-b border-white/[0.08] pb-1.5">
              Энергетический баланс
            </span>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Кинетическая Ek</span>
                <span class="text-xs text-[#f43f5e] font-medium">{{ energies.ek.toFixed(3) }} Дж</span>
              </div>
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Потенциальная Ep</span>
                <span class="text-xs text-[#34d399] font-medium">{{ energies.ep.toFixed(3) }} Дж</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
