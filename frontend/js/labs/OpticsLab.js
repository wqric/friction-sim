export default {
  name: 'OpticsLab',
  data() {
    return {
      mode: 'refraction', // 'refraction' (закон Снеллиуса) или 'lens' (тонкая линза)
      n1: 1.0,            // Показатель преломления среды 1 (воздух)
      n2: 1.5,            // Показатель преломления среды 2 (стекло)
      incidentAngle: 40.0,// Угол падения (градусы)

      // Линза
      focalLength: 30.0,  // Фокусное расстояние F (см)
      objDistance: 50.0,  // Расстояние до предмета d (см)
      objHeight: 25.0,    // Высота предмета h (см)

      lastTime: performance.now(),
      animationFrameId: null
    };
  },
  computed: {
    incRad() {
      return (this.incidentAngle * Math.PI) / 180;
    },
    // Угол преломления по Снеллиусу: n1*sin(α) = n2*sin(β) => sin(β) = (n1/n2)*sin(α)
    refraction() {
      const sinBeta = (this.n1 / this.n2) * Math.sin(this.incRad);
      const isTotalInternal = sinBeta > 1.0;
      const betaRad = isTotalInternal ? 0 : Math.asin(Math.min(1.0, sinBeta));
      const betaDeg = (betaRad * 180) / Math.PI;

      // Предельный угол полного внутреннего отражения
      const critAngleRad = this.n1 > this.n2 ? Math.asin(this.n2 / this.n1) : Math.PI / 2;
      const critAngleDeg = (critAngleRad * 180) / Math.PI;

      // Скорости света (c = 300 000 км/с)
      const v1 = 300 / this.n1; // тыс. км/с
      const v2 = 300 / this.n2; // тыс. км/с
      const n21 = this.n2 / this.n1;

      // Приближение коэффициента отражения Френеля при нормальном падении
      const r0 = Math.pow((this.n1 - this.n2) / (this.n1 + this.n2), 2);
      const rFresnel = isTotalInternal ? 100 : Math.min(100, (r0 + (1 - r0) * Math.pow(1 - Math.cos(this.incRad), 5)) * 100);

      return {
        sinBeta,
        isTotalInternal,
        betaDeg,
        betaRad,
        critAngleDeg,
        v1,
        v2,
        n21,
        rFresnel
      };
    },
    // Формула тонкой линзы: 1/F = 1/d + 1/f => 1/f = 1/F - 1/d
    lensCalc() {
      const invF = 1 / this.focalLength;
      const invD = 1 / this.objDistance;
      const invImage = invF - invD;
      const imgDistance = Math.abs(invImage) > 1e-4 ? 1 / invImage : 9999;
      const magnification = -imgDistance / this.objDistance;
      const imgHeight = this.objHeight * magnification;
      const isReal = imgDistance > 0;
      const diopters = 100 / this.focalLength; // дптр

      return {
        imgDistance,
        imgHeight,
        magnification,
        isReal,
        diopters
      };
    }
  },
  mounted() {
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

      const cx = w / 2;
      const cy = h / 2;

      if (this.mode === 'refraction') {
        // Отрисовка преломления на границе раздела сред
        ctx.save();
        // Среда 2 (снизу)
        ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
        ctx.fillRect(0, cy, w, h - cy);

        // Граница раздела сред
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();

        // Нормаль к границе раздела
        ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(cx, 20); ctx.lineTo(cx, h - 20); ctx.stroke();
        ctx.setLineDash([]);

        // Падающий луч
        const rayLen = 170;
        const inX = cx - rayLen * Math.sin(this.incRad);
        const inY = cy - rayLen * Math.cos(this.incRad);

        ctx.strokeStyle = "#fbbf24";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(inX, inY); ctx.lineTo(cx, cy); ctx.stroke();

        // Отраженный луч
        const refX = cx + rayLen * Math.sin(this.incRad);
        const refY = cy - rayLen * Math.cos(this.incRad);
        ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(refX, refY); ctx.stroke();

        // Преломленный луч
        if (!this.refraction.isTotalInternal) {
          const outX = cx + rayLen * Math.sin(this.refraction.betaRad);
          const outY = cy + rayLen * Math.cos(this.refraction.betaRad);
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(outX, outY); ctx.stroke();
        }

        ctx.fillStyle = "#94a3b8";
        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.fillText(`Среда 1 (n₁ = ${this.n1.toFixed(2)})`, 20, cy - 20);
        ctx.fillText(`Среда 2 (n₂ = ${this.n2.toFixed(2)})`, 20, cy + 30);
        ctx.restore();
      } else {
        // Отрисовка тонкой линзы и хода 3 главных лучей
        ctx.save();
        // Главная оптическая ось
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(20, cy); ctx.lineTo(w - 20, cy); ctx.stroke();

        // Линза (вертикаль)
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(cx, 30); ctx.lineTo(cx, h - 30); ctx.stroke();

        // Стрелки линзы (собирающая)
        ctx.beginPath();
        ctx.moveTo(cx - 8, 42); ctx.lineTo(cx, 30); ctx.lineTo(cx + 8, 42);
        ctx.moveTo(cx - 8, h - 42); ctx.lineTo(cx, h - 30); ctx.lineTo(cx + 8, h - 42);
        ctx.stroke();

        // Фокусы F
        const scalePx = 3.5;
        const fPx = this.focalLength * scalePx;
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath(); ctx.arc(cx - fPx, cy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + fPx, cy, 4, 0, Math.PI * 2); ctx.fill();

        ctx.font = "600 11px 'JetBrains Mono', monospace";
        ctx.fillText("F", cx - fPx - 4, cy + 18);
        ctx.fillText("F'", cx + fPx - 4, cy + 18);

        // Предмет (стрелка вверх)
        const dPx = this.objDistance * scalePx;
        const hPx = this.objHeight * 2;
        const objX = cx - dPx;
        const objTopY = cy - hPx;

        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(objX, cy); ctx.lineTo(objX, objTopY); ctx.stroke();
        // Наконечник стрелки предмета
        ctx.beginPath(); ctx.moveTo(objX - 5, objTopY + 8); ctx.lineTo(objX, objTopY); ctx.lineTo(objX + 5, objTopY + 8); ctx.stroke();

        // Изображение
        const img = this.lensCalc;
        if (Math.abs(img.imgDistance) < 500) {
          const imgDPx = img.imgDistance * scalePx;
          const imgHPx = img.imgHeight * 2;
          const imgX = cx + imgDPx;
          const imgTopY = cy - imgHPx;

          ctx.strokeStyle = "#f43f5e";
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(imgX, cy); ctx.lineTo(imgX, imgTopY); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(imgX - 5, imgTopY - 8 * Math.sign(img.imgHeight)); ctx.lineTo(imgX, imgTopY); ctx.lineTo(imgX + 5, imgTopY - 8 * Math.sign(img.imgHeight)); ctx.stroke();

          // Лучи построения
          ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
          ctx.lineWidth = 1.5;
          // Луч 1: параллельно главной оси -> через фокус F'
          ctx.beginPath(); ctx.moveTo(objX, objTopY); ctx.lineTo(cx, objTopY); ctx.lineTo(imgX, imgTopY); ctx.stroke();
          // Луч 2: через оптический центр O без преломления
          ctx.beginPath(); ctx.moveTo(objX, objTopY); ctx.lineTo(imgX, imgTopY); ctx.stroke();
        }
        ctx.restore();
      }
    },
    renderGraph() {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      // График зависимости угла преломления от угла падения β(α)
      const padL = 50, padR = 25, padT = 20, padB = 35;
      const pW = w - padL - padR;
      const pH = h - padT - padB;

      ctx.strokeStyle = "rgba(51, 65, 85, 0.6)";
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + pH); ctx.lineTo(padL + pW, padT + pH); ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 11px 'JetBrains Mono', monospace";
      ctx.fillText("β (град.)", 10, padT);
      ctx.fillText("α (град.)", padL + pW - 10, padT + pH + 24);

      const degToX = (deg) => padL + (deg / 90) * pW;
      const degToY = (deg) => padT + pH - (deg / 90) * pH;

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      for (let a = 0; a <= 90; a += 1) {
        const rad = (a * Math.PI) / 180;
        const sinB = (this.n1 / this.n2) * Math.sin(rad);
        if (sinB <= 1.0) {
          const bDeg = (Math.asin(sinB) * 180) / Math.PI;
          const x = degToX(a);
          const y = degToY(bDeg);
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Маркер текущей точки
      if (!this.refraction.isTotalInternal) {
        const curX = degToX(this.incidentAngle);
        const curY = degToY(this.refraction.betaDeg);
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#f43f5e";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(curX, curY, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
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
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {{ mode === 'refraction' ? 'Преломление света на границе сред' : 'Построение изображения в тонкой линзе' }}
              </span>
              <span v-if="refraction.isTotalInternal && mode === 'refraction'" class="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Полное внутреннее отражение!
              </span>
            </div>
            <div class="flex items-center gap-1.5">
              <button
                @click="mode = 'refraction'"
                :class="['px-2.5 py-1 text-xs font-medium rounded-lg border transition', mode === 'refraction' ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-800 text-slate-400 border-slate-700']"
              >
                Закон Снеллиуса
              </button>
              <button
                @click="mode = 'lens'"
                :class="['px-2.5 py-1 text-xs font-medium rounded-lg border transition', mode === 'lens' ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-800 text-slate-400 border-slate-700']"
              >
                Тонкая линза
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
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Зависимость угла преломления β от угла падения α</span>
              <span class="text-xs text-slate-500">Закон Снеллиуса n₁·sin(α) = n₂·sin(β)</span>
            </div>
          </div>

          <div class="relative w-full h-[220px] sm:h-[240px] bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden">
            <canvas ref="graphCanvas" class="w-full h-full block"></canvas>
          </div>
        </div>

      </div>

      <div class="lg:col-span-4 flex flex-col gap-6">
        
        <div class="glass-panel rounded-2xl p-5 shadow-xl space-y-5">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <span>Оптические параметры</span>
            <span class="text-xs font-mono text-sky-400">Точный ввод & ползунки</span>
          </h2>

          <div v-if="mode === 'refraction'" class="space-y-4">
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium text-slate-200">Угол падения <span class="font-mono text-sky-400">α</span></label>
                <div class="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="89"
                    step="0.5"
                    v-model.number="incidentAngle"
                    class="num-input w-20"
                  />
                  <span class="font-mono text-xs text-slate-400">°</span>
                </div>
              </div>
              <input type="range" min="0" max="85" step="0.5" v-model.number="incidentAngle" />
            </div>

            <div class="space-y-2 pt-2 border-t border-slate-800/60">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium text-slate-200">Показатель <span class="font-mono text-sky-400">n₁</span> (Среда 1)</label>
                <div class="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1.0"
                    max="3.0"
                    step="0.01"
                    v-model.number="n1"
                    class="num-input w-20"
                  />
                </div>
              </div>
              <input type="range" min="1.0" max="2.4" step="0.02" v-model.number="n1" />
            </div>

            <div class="space-y-2 pt-2 border-t border-slate-800/60">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium text-slate-200">Показатель <span class="font-mono text-emerald-400">n₂</span> (Среда 2)</label>
                <div class="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1.0"
                    max="3.0"
                    step="0.01"
                    v-model.number="n2"
                    class="num-input w-20"
                  />
                </div>
              </div>
              <input type="range" min="1.0" max="2.4" step="0.02" v-model.number="n2" />
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium text-slate-200">Фокус линзы <span class="font-mono text-sky-400">F</span></label>
                <div class="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="5"
                    max="80"
                    step="1"
                    v-model.number="focalLength"
                    class="num-input w-20"
                  />
                  <span class="font-mono text-xs text-slate-400">см</span>
                </div>
              </div>
              <input type="range" min="15" max="50" step="1" v-model.number="focalLength" />
            </div>

            <div class="space-y-2 pt-2 border-t border-slate-800/60">
              <div class="flex justify-between items-center">
                <label class="text-sm font-medium text-slate-200">Расстояние до предмета <span class="font-mono text-sky-400">d</span></label>
                <div class="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="5"
                    max="150"
                    step="1"
                    v-model.number="objDistance"
                    class="num-input w-20"
                  />
                  <span class="font-mono text-xs text-slate-400">см</span>
                </div>
              </div>
              <input type="range" min="20" max="100" step="1" v-model.number="objDistance" />
            </div>
          </div>
        </div>

        <div class="glass-panel rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 mb-3.5 flex items-center justify-between">
              <span>Результаты расчета</span>
              <span class="text-[11px] font-mono font-normal text-sky-400">Оптическая геометрия</span>
            </h2>

            <div v-if="mode === 'refraction'" class="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Угол преломления β</span>
                <span class="text-base font-bold text-sky-400">
                  {{ refraction.isTotalInternal ? 'ПВО (нет луча)' : refraction.betaDeg.toFixed(2) + '°' }}
                </span>
                <div class="text-[10px] text-slate-500 mt-0.5">arcsin(n₁·sinα / n₂)</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Предельный угол ПВО</span>
                <span class="text-base font-bold text-emerald-400">{{ refraction.critAngleDeg.toFixed(2) }}°</span>
                <div class="text-[10px] text-slate-500 mt-0.5">{{ n1 > n2 ? 'Возможно ПВО' : 'ПВО невозможно' }}</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Скор. света v₁</span>
                <span class="text-base font-bold text-amber-300">{{ refraction.v1.toFixed(0) }} тыс. км/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">c / n₁</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Скор. света v₂</span>
                <span class="text-base font-bold text-purple-300">{{ refraction.v2.toFixed(0) }} тыс. км/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">c / n₂</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Относит. показатель n₂₁</span>
                <span class="text-base font-bold text-white">{{ refraction.n21.toFixed(3) }}</span>
                <div class="text-[10px] text-slate-500 mt-0.5">n₂ / n₁</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Отражение Френеля R</span>
                <span class="text-base font-bold text-rose-400">{{ refraction.rFresnel.toFixed(1) }}%</span>
                <div class="text-[10px] text-slate-500 mt-0.5">Пропускание: {{(100 - refraction.rFresnel).toFixed(1)}}%</div>
              </div>
            </div>

            <div v-else class="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Расст. до изобр. f</span>
                <span class="text-base font-bold text-sky-400">{{ lensCalc.imgDistance.toFixed(1) }} см</span>
                <div class="text-[10px] text-slate-500 mt-0.5">{{ lensCalc.isReal ? 'Действительное' : 'Мнимое' }}</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Увеличение Г</span>
                <span class="text-base font-bold text-emerald-400">{{ Math.abs(lensCalc.magnification).toFixed(2) }}x</span>
                <div class="text-[10px] text-slate-500 mt-0.5">f / d</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Оптическая сила D</span>
                <span class="text-base font-bold text-amber-300">{{ lensCalc.diopters.toFixed(2) }} дптр</span>
                <div class="text-[10px] text-slate-500 mt-0.5">1 / F (м)</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Высота изобр. H</span>
                <span class="text-base font-bold text-purple-300">{{ Math.abs(lensCalc.imgHeight).toFixed(1) }} см</span>
                <div class="text-[10px] text-slate-500 mt-0.5">{{ lensCalc.imgHeight < 0 ? 'Перевернутое' : 'Прямое' }}</div>
              </div>
            </div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed space-y-1">
            <span class="font-semibold text-slate-200 block">Закон Снеллиуса:</span>
            Отношение синуса угла падения к синусу угла преломления равно отношению показателей преломления сред: <span class="font-mono text-sky-400">n₁·sin(α) = n₂·sin(β)</span>.
          </div>
        </div>

          <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed space-y-1">
            <span class="font-semibold text-slate-200 block">Закон Снеллиуса:</span>
            Отношение синуса угла падения к синусу угла преломления равно отношению показателей преломления сред: <span class="font-mono text-sky-400">n₁·sin(α) = n₂·sin(β)</span>.
          </div>
        </div>

      </div>
    </div>
  `
};
