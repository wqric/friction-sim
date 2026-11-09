export default {
  name: 'CollisionLab',
  data() {
    return {
      collisionType: 'elastic',
      m1: 2.0,
      v1: 4.0,
      m2: 2.0,
      v2: 0.0,

      x1: 150,
      x2: 380,
      curV1: 4.0,
      curV2: 0.0,
      cartWidth: 64,
      cartHeight: 34,
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
      this.x2 = 400;
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
      ctx.strokeStyle = "rgba(238, 240, 245, 0.03)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.restore();

      const trackY = h - 50;

      // Track line
      ctx.save();
      ctx.strokeStyle = "rgba(238, 240, 245, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(30, trackY);
      ctx.lineTo(w - 30, trackY);
      ctx.stroke();

      // Track supports
      for (let x = 60; x < w - 40; x += 120) {
        ctx.strokeStyle = "rgba(238, 240, 245, 0.08)";
        ctx.beginPath();
        ctx.moveTo(x, trackY);
        ctx.lineTo(x, trackY + 20);
        ctx.stroke();
      }
      ctx.restore();

      // Draw Carts
      this.drawCart(ctx, this.x1, trackY, this.m1, this.curV1, "rgba(238, 240, 245, 0.4)", "#181d28", "m₁");
      this.drawCart(ctx, this.x2, trackY, this.m2, this.curV2, "rgba(251, 191, 36, 0.5)", "#231f18", "m₂");
    },
    drawCart(ctx, x, trackY, mass, velocity, strokeColor, fillColor, label) {
      const y = trackY - this.cartHeight;
      const w = this.cartWidth;
      const h = this.cartHeight;

      ctx.save();
      // Body
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y, w, h, 3);
      ctx.fill();
      ctx.stroke();

      // Wheels
      const wheelR = 4;
      ctx.fillStyle = "#11141c";
      ctx.strokeStyle = "rgba(238, 240, 245, 0.3)";
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.arc(x - w / 3, trackY - wheelR, wheelR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.arc(x + w / 3, trackY - wheelR, wheelR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      // Text label inside cart
      ctx.fillStyle = "#eef0f5";
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${label}=${mass}кг`, x, y + h / 2 - 2);
      ctx.fillText(`v=${velocity.toFixed(1)}`, x, y + h / 2 + 10);

      // Velocity vector arrow
      if (Math.abs(velocity) > 0.05) {
        const vLen = velocity * 10;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - 6);
        ctx.lineTo(x + vLen, y - 6);
        ctx.stroke();
      }

      ctx.restore();
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
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Visuals (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          <div class="lab-panel p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 text-xs">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-[#eef0f5]">
                  {{ collisionType === 'elastic' ? 'Упругий удар' : 'Неупругий удар' }}
                </span>
                <span v-if="hasCollided" class="text-[11px] font-mono text-[#fbbf24] px-2 py-0.2 rounded-[2px] bg-[#181d28] border border-white/[0.08]">
                  Контакт
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="start"
                  class="btn-primary px-3 py-1 text-xs font-mono"
                >
                  Пуск
                </button>
                <button
                  @click="reset"
                  class="px-2.5 py-1 text-xs rounded-[3px] bg-[#181d28] hover:bg-[#1f2533] text-[#eef0f5] border border-white/[0.08] transition"
                >
                  Сброс
                </button>
              </div>
            </div>

            <div class="w-full h-80 bg-[#07080d] rounded-[4px] border border-white/[0.06] relative overflow-hidden">
              <canvas ref="canvas" class="w-full h-full block"></canvas>
            </div>
          </div>
        </div>

        <!-- Controls (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <div class="lab-panel p-4 space-y-4">
            <div class="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <span class="text-xs font-medium text-[#eef0f5]">Тип соударения</span>
              <div class="flex gap-1 text-[11px] font-mono">
                <button
                  @click="collisionType = 'elastic'; reset()"
                  :class="[
                    'px-2 py-0.5 rounded-[3px] border transition',
                    collisionType === 'elastic' ? 'bg-[#181d28] text-white border-white/30' : 'bg-[#11141c] text-[#7a8296] border-white/[0.06]'
                  ]"
                >
                  Упругий
                </button>
                <button
                  @click="collisionType = 'inelastic'; reset()"
                  :class="[
                    'px-2 py-0.5 rounded-[3px] border transition',
                    collisionType === 'inelastic' ? 'bg-[#181d28] text-white border-white/30' : 'bg-[#11141c] text-[#7a8296] border-white/[0.06]'
                  ]"
                >
                  Неупругий
                </button>
              </div>
            </div>

            <!-- Cart 1 -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Масса m₁</span>
                <span class="font-mono text-[#eef0f5]">{{ m1.toFixed(1) }} кг</span>
              </div>
              <input type="range" min="0.5" max="5.0" step="0.5" v-model.number="m1" @input="reset" />
              <div class="flex justify-between text-xs pt-1">
                <span class="text-[#a3a9b8]">Скорость v₁</span>
                <span class="font-mono text-[#eef0f5]">{{ v1.toFixed(1) }} м/с</span>
              </div>
              <input type="range" min="1.0" max="6.0" step="0.5" v-model.number="v1" @input="reset" />
            </div>

            <!-- Cart 2 -->
            <div class="space-y-1 pt-2 border-t border-white/[0.06]">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Масса m₂</span>
                <span class="font-mono text-[#eef0f5]">{{ m2.toFixed(1) }} кг</span>
              </div>
              <input type="range" min="0.5" max="5.0" step="0.5" v-model.number="m2" @input="reset" />
              <div class="flex justify-between text-xs pt-1">
                <span class="text-[#a3a9b8]">Скорость v₂</span>
                <span class="font-mono text-[#eef0f5]">{{ v2.toFixed(1) }} м/с</span>
              </div>
              <input type="range" min="-3.0" max="3.0" step="0.5" v-model.number="v2" @input="reset" />
            </div>
          </div>

          <!-- Conservation Laws -->
          <div class="lab-panel p-4 space-y-2.5">
            <span class="text-xs font-medium text-[#eef0f5] block border-b border-white/[0.08] pb-1.5">
              Законы сохранения
            </span>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Импульс P</span>
                <span class="text-xs text-[#eef0f5] font-medium">{{ pInitial.toFixed(1) }} кг·м/с</span>
              </div>
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Потеря ΔEk</span>
                <span class="text-xs text-[#f43f5e] font-medium">{{ theoreticalOutcomes.energyLoss.toFixed(2) }} Дж</span>
              </div>
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Скор. v₁'</span>
                <span class="text-xs text-[#a3a9b8] font-medium">{{ theoreticalOutcomes.v1Final.toFixed(2) }} м/с</span>
              </div>
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Скор. v₂'</span>
                <span class="text-xs text-[#fbbf24] font-medium">{{ theoreticalOutcomes.v2Final.toFixed(2) }} м/с</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
