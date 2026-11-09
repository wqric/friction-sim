export default {
  name: 'FrictionLab',
  data() {
    return {
      alpha: 20.0,
      mu: 0.40,
      mass: 2.0,
      g: 9.81,
      isAnimationEnabled: true,
      autoLoop: true,
      showProjections: true,
      blockOffset: 0,
      blockVelocity: 0,
      lastFrameTime: performance.now(),
      animationFrameId: null,
      isDraggingGraph: false
    };
  },
  computed: {
    physics() {
      const alphaRad = (this.alpha * Math.PI) / 180;
      const critAngleRad = Math.atan(this.mu);
      const critAngleDeg = (critAngleRad * 180) / Math.PI;

      const mg = this.mass * this.g;
      const fPull = mg * Math.sin(alphaRad);
      const fNormal = mg * Math.cos(alphaRad);
      const fMaxStatic = this.mu * fNormal;

      const isSliding = this.alpha > critAngleDeg + 1e-4;
      const fFriction = isSliding ? fMaxStatic : fPull;
      const netForce = isSliding ? Math.max(0, fPull - fMaxStatic) : 0;
      const accel = netForce / this.mass;

      return {
        alphaRad,
        critAngleDeg,
        critAngleRad,
        mg,
        fPull,
        fNormal,
        fMaxStatic,
        fFriction,
        isSliding,
        accel
      };
    }
  },
  mounted() {
    this.resizeCanvases();
    window.addEventListener('resize', this.resizeCanvases);
    this.lastFrameTime = performance.now();
    this.animate(this.lastFrameTime);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeCanvases);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  },
  methods: {
    setCritAngle() {
      this.alpha = Math.min(85, Math.round(this.physics.critAngleDeg * 2) / 2);
      this.resetPos();
    },
    resetPos() {
      this.blockOffset = 0;
      this.blockVelocity = 0;
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
    drawVector(ctx, x1, y1, x2, y2, color, label, labelOffset = { x: 0, y: 0 }, dashed = false) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 4) return;

      const angle = Math.atan2(dy, dx);
      const headLen = Math.min(9, Math.max(5, len * 0.22));

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = dashed ? 1.2 : 1.8;
      if (dashed) ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI / 6), y2 - headLen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI / 6), y2 - headLen * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fill();

      if (label) {
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        const tx = x2 + labelOffset.x;
        const ty = y2 + labelOffset.y;
        ctx.fillStyle = "#07080d";
        const w = ctx.measureText(label).width;
        ctx.fillRect(tx - 2, ty - 9, w + 4, 12);
        ctx.fillStyle = color;
        ctx.fillText(label, tx, ty + 1);
      }
      ctx.restore();
    },
    renderSimulation() {
      const canvas = this.$refs.simCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const phys = this.physics;

      ctx.clearRect(0, 0, w, h);

      // Engineering grid (quiet hairlines)
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

      // Plane geometry
      const pivotX = Math.max(140, w * 0.22);
      const pivotY = h - 45;
      const planeLen = Math.min(w - pivotX - 40, h - 75, 380);
      const alpha = phys.alphaRad;
      const topX = pivotX + planeLen * Math.cos(alpha);
      const topY = pivotY - planeLen * Math.sin(alpha);

      // Wedge
      ctx.save();
      ctx.fillStyle = "#11141c";
      ctx.strokeStyle = "rgba(238, 240, 245, 0.12)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(topX, topY);
      ctx.lineTo(topX, pivotY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Floor
      ctx.strokeStyle = "rgba(238, 240, 245, 0.15)";
      ctx.beginPath();
      ctx.moveTo(pivotX - 80, pivotY);
      ctx.lineTo(w - 20, pivotY);
      ctx.stroke();

      // Slope contact line
      ctx.strokeStyle = "#eef0f5";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(topX, topY);
      ctx.stroke();

      // Angle arc
      if (this.alpha > 1) {
        ctx.strokeStyle = "#a3a9b8";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 36, -alpha, 0, false);
        ctx.stroke();
        ctx.fillStyle = "#a3a9b8";
        ctx.font = "500 11px 'JetBrains Mono', monospace";
        ctx.fillText(`α=${this.alpha.toFixed(1)}°`, pivotX + 44, pivotY - 10);
      }
      ctx.restore();

      // Block
      const blockW = 56;
      const blockH = 32;
      const startDist = planeLen * 0.7;
      const pxOffset = this.blockOffset * 60;
      const minDist = blockW * 0.7;
      let curDist = startDist - pxOffset;

      if (curDist < minDist) {
        if (this.autoLoop && phys.isSliding && this.isAnimationEnabled) {
          this.blockOffset = 0;
          this.blockVelocity = 0;
          curDist = startDist;
        } else {
          curDist = minDist;
          this.blockVelocity = 0;
        }
      }

      const contactX = pivotX + curDist * Math.cos(alpha);
      const contactY = pivotY - curDist * Math.sin(alpha);
      const normX = -Math.sin(alpha);
      const normY = -Math.cos(alpha);
      const cmX = contactX + normX * (blockH / 2);
      const cmY = contactY + normY * (blockH / 2);

      ctx.save();
      ctx.translate(cmX, cmY);
      ctx.rotate(-alpha);
      ctx.fillStyle = phys.isSliding ? "#2d2417" : "#181d28";
      ctx.strokeStyle = phys.isSliding ? "#fbbf24" : "rgba(238, 240, 245, 0.3)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-blockW / 2, -blockH / 2, blockW, blockH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#eef0f5";
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${this.mass} кг`, 0, 3);
      ctx.restore();

      // Vectors (measured academic styling)
      const vScale = 85 / Math.max(phys.mg, 1);
      const downX = -Math.cos(alpha);
      const downY = Math.sin(alpha);
      const upX = Math.cos(alpha);
      const upY = -Math.sin(alpha);
      const intoX = Math.sin(alpha);
      const intoY = Math.cos(alpha);

      const mgLen = phys.mg * vScale;
      const pullLen = phys.fPull * vScale;
      const normLen = phys.fNormal * vScale;
      const fricLen = phys.fFriction * vScale;

      if (this.showProjections && this.alpha > 0.5) {
        this.drawVector(ctx, cmX, cmY, cmX + intoX * normLen, cmY + intoY * normLen, "#a3a9b8", "mg·cosα", { x: 6, y: 10 }, true);
        this.drawVector(ctx, cmX, cmY, cmX + downX * pullLen, cmY + downY * pullLen, "#fbbf24", "mg·sinα", { x: -50, y: 12 }, false);
      }

      this.drawVector(ctx, cmX, cmY, cmX, cmY + mgLen, "#eef0f5", "mg", { x: -24, y: 12 }, false);
      this.drawVector(ctx, cmX, cmY, cmX + normX * normLen, cmY + normY * normLen, "#34d399", "N", { x: -16, y: -6 }, false);

      if (phys.fFriction > 0.05) {
        this.drawVector(ctx, cmX, cmY, cmX + upX * fricLen, cmY + upY * fricLen, "#f43f5e", "F_тр", { x: 6, y: -6 }, false);
      }

      if (phys.isSliding && phys.accel > 0.05) {
        const aLen = Math.min(50, phys.accel * 4.5);
        this.drawVector(ctx, cmX + normX * 26, cmY + normY * 26, cmX + normX * 26 + downX * aLen, cmY + normY * 26 + downY * aLen, "#38bdf8", `a=${phys.accel.toFixed(1)}`, { x: -30, y: -8 }, false);
      }
    },
    renderGraph() {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const phys = this.physics;

      ctx.clearRect(0, 0, w, h);

      const padL = 40, padR = 20, padT = 16, padB = 26;
      const pW = w - padL - padR;
      const pH = h - padT - padB;
      const maxF = Math.max(phys.mg * 1.05, phys.mg * this.mu * 1.05, 10);

      const degX = (deg) => padL + (deg / 90) * pW;
      const fY = (f) => padT + pH - (f / maxF) * pH;

      // Axes & grid lines
      ctx.strokeStyle = "rgba(238, 240, 245, 0.06)";
      ctx.lineWidth = 1;
      ctx.font = "500 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#7a8296";

      for (let deg = 0; deg <= 90; deg += 15) {
        const x = degX(deg);
        ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, padT + pH); ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText(`${deg}°`, x, padT + pH + 14);
      }

      for (let i = 0; i <= 4; i++) {
        const val = (maxF / 4) * i;
        const y = fY(val);
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(padL + pW, y); ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(val.toFixed(0), padL - 6, y + 3);
      }

      // Vertical threshold line α_кр
      const critX = degX(Math.min(90, phys.critAngleDeg));
      ctx.save();
      ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(critX, padT);
      ctx.lineTo(critX, padT + pH);
      ctx.stroke();
      ctx.restore();

      // F_тр curve
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let deg = 0; deg <= 90; deg += 0.5) {
        const rad = (deg * Math.PI) / 180;
        const f = deg <= phys.critAngleDeg ? phys.mg * Math.sin(rad) : this.mu * phys.mg * Math.cos(rad);
        const x = degX(deg);
        const y = fY(f);
        if (deg === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Current point marker
      const curX = degX(this.alpha);
      const curY = fY(phys.fFriction);

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(curX, curY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    },
    onGraphMouseDown(e) {
      this.isDraggingGraph = true;
      this.updateAngleFromEvent(e);
      window.addEventListener('mousemove', this.onGraphMouseMove);
      window.addEventListener('mouseup', this.onGraphMouseUp);
    },
    onGraphMouseMove(e) {
      if (this.isDraggingGraph) this.updateAngleFromEvent(e);
    },
    onGraphMouseUp() {
      this.isDraggingGraph = false;
      window.removeEventListener('mousemove', this.onGraphMouseMove);
      window.removeEventListener('mouseup', this.onGraphMouseUp);
    },
    updateAngleFromEvent(e) {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const padL = 40, padR = 20;
      const pW = rect.width - padL - padR;
      let deg = ((x - padL) / pW) * 90;
      deg = Math.max(0, Math.min(85, deg));
      this.alpha = Math.round(deg * 2) / 2;
    },
    animate(now) {
      const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      if (this.isAnimationEnabled && this.physics.isSliding) {
        this.blockVelocity += this.physics.accel * dt;
        this.blockOffset += this.blockVelocity * dt;
      } else if (!this.physics.isSliding) {
        this.blockVelocity = 0;
      }

      this.renderSimulation();
      this.renderGraph();
      this.animationFrameId = requestAnimationFrame(this.animate);
    }
  },
  template: `
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Visuals (8 cols) -->
        <div class="lg:col-span-8 space-y-4">
          <!-- Setup Canvas -->
          <div class="lab-panel p-4 flex flex-col">
            <div class="flex items-center justify-between mb-3 text-xs">
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium text-[#eef0f5]">Динамическая схема</span>
                <span v-if="physics.isSliding" class="text-[11px] font-mono px-2 py-0.2 rounded-[2px] bg-[#181d28] text-[#fbbf24] border border-white/[0.08]">
                  Скольжение
                </span>
                <span v-else class="text-[11px] font-mono px-2 py-0.2 rounded-[2px] bg-[#181d28] text-[#34d399] border border-white/[0.08]">
                  Покой
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="isAnimationEnabled = !isAnimationEnabled"
                  class="px-2.5 py-1 text-xs rounded-[3px] bg-[#181d28] hover:bg-[#1f2533] text-[#eef0f5] border border-white/[0.08] transition"
                >
                  {{ isAnimationEnabled ? 'Пауза' : 'Пуск' }}
                </button>
                <button
                  @click="resetPos"
                  class="px-2.5 py-1 text-xs rounded-[3px] bg-[#181d28] hover:bg-[#1f2533] text-[#eef0f5] border border-white/[0.08] transition"
                >
                  Сброс
                </button>
              </div>
            </div>

            <div class="w-full h-80 bg-[#07080d] rounded-[4px] border border-white/[0.06] relative overflow-hidden">
              <canvas ref="simCanvas" class="w-full h-full block"></canvas>
            </div>
          </div>

          <!-- Chart Canvas -->
          <div class="lab-panel p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-[#eef0f5]">График зависимости F_тр(α)</span>
              <span class="text-[11px] text-[#7a8296] font-mono">Перетаскивание маркера по графику</span>
            </div>
            <div class="w-full h-52 bg-[#07080d] rounded-[4px] border border-white/[0.06] relative overflow-hidden">
              <canvas
                ref="graphCanvas"
                class="w-full h-full block cursor-crosshair"
                @mousedown="onGraphMouseDown"
                @touchstart.passive="updateAngleFromEvent"
              ></canvas>
            </div>
          </div>
        </div>

        <!-- Controls & Metrics (4 cols) -->
        <div class="lg:col-span-4 space-y-4">
          <!-- Parameters -->
          <div class="lab-panel p-4 space-y-4">
            <div class="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <span class="text-xs font-medium text-[#eef0f5]">Параметры</span>
              <button
                @click="setCritAngle"
                class="text-[11px] font-mono px-2 py-0.5 rounded-[3px] bg-[#181d28] text-[#a3a9b8] hover:text-[#eef0f5] border border-white/[0.08] transition"
              >
                α = α_кр
              </button>
            </div>

            <!-- Alpha Slider -->
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Угол наклона α</span>
                <span class="font-mono text-[#eef0f5]">{{ alpha.toFixed(1) }}°</span>
              </div>
              <input type="range" min="0" max="85" step="0.5" v-model.number="alpha" />
            </div>

            <!-- Mu Slider -->
            <div class="space-y-1 pt-2 border-t border-white/[0.06]">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Коэффициент трения μ</span>
                <span class="font-mono text-[#eef0f5]">{{ mu.toFixed(2) }}</span>
              </div>
              <input type="range" min="0.05" max="1.0" step="0.01" v-model.number="mu" />
              <div class="grid grid-cols-3 gap-1 pt-1">
                <button
                  v-for="p in [{ l: 'Лёд', v: 0.1 }, { l: 'Дерево', v: 0.4 }, { l: 'Резина', v: 0.75 }]"
                  :key="p.l"
                  @click="mu = p.v"
                  :class="[
                    'py-1 text-[11px] font-mono rounded-[3px] border transition text-center',
                    Math.abs(mu - p.v) < 0.01
                      ? 'bg-[#181d28] border-white/30 text-white'
                      : 'bg-[#11141c] border-white/[0.06] text-[#7a8296] hover:text-[#a3a9b8]'
                  ]"
                >
                  {{ p.l }} {{ p.v }}
                </button>
              </div>
            </div>

            <!-- Mass Slider -->
            <div class="space-y-1 pt-2 border-t border-white/[0.06]">
              <div class="flex justify-between text-xs">
                <span class="text-[#a3a9b8]">Масса m</span>
                <span class="font-mono text-[#eef0f5]">{{ mass.toFixed(1) }} кг</span>
              </div>
              <input type="range" min="0.5" max="10.0" step="0.5" v-model.number="mass" />
            </div>
          </div>

          <!-- Exact Output -->
          <div class="lab-panel p-4 space-y-2.5">
            <span class="text-xs font-medium text-[#eef0f5] block border-b border-white/[0.08] pb-1.5">
              Показания приборов
            </span>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono">
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Крит. угол α_кр</span>
                <span class="text-xs text-[#eef0f5] font-medium">{{ physics.critAngleDeg.toFixed(2) }}°</span>
              </div>
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Сила трения F_тр</span>
                <span class="text-xs text-[#f43f5e] font-medium">{{ physics.fFriction.toFixed(2) }} Н</span>
              </div>
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Скатывающая F</span>
                <span class="text-xs text-[#fbbf24] font-medium">{{ physics.fPull.toFixed(2) }} Н</span>
              </div>
              <div class="bg-[#181d28] p-2 rounded-[3px] border border-white/[0.04]">
                <span class="text-[10px] text-[#7a8296] block">Ускорение a</span>
                <span class="text-xs text-[#a3a9b8] font-medium">{{ physics.accel.toFixed(2) }} м/с²</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
};
