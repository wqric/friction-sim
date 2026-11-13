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
      showForces: true,
      showProjections: true,
      showMotionVectors: true,
      showVectorValues: true,
      blockOffset: 0,
      blockVelocity: 0,
      lastFrameTime: performance.now(),
      animationFrameId: null,
      isDraggingGraph: false,
      isDraggingSlope: false,
      isDraggingBlock: false
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

      const tanAlpha = Math.tan(alphaRad);
      const safetyFactor = tanAlpha > 1e-4 ? this.mu / tanAlpha : 999;
      const ek = 0.5 * this.mass * this.blockVelocity * this.blockVelocity;
      const workFric = fFriction * this.blockOffset;
      const powerDiss = fFriction * this.blockVelocity;

      return {
        alphaRad,
        critAngleDeg,
        critAngleRad,
        mg,
        fPull,
        fNormal,
        fMaxStatic,
        fFriction,
        netForce,
        isSliding,
        accel,
        safetyFactor,
        ek,
        workFric,
        powerDiss
      };
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.resizeCanvases();
      window.addEventListener('resize', this.resizeCanvases);
      this.lastFrameTime = performance.now();
      this.animate(this.lastFrameTime);
    });
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeCanvases);
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  },
  methods: {
    setCritAngle() {
      const crit = Math.min(85, Math.round(this.physics.critAngleDeg * 2) / 2);
      this.alpha = crit;
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

      const simRect = simCanvas.getBoundingClientRect();
      if (simRect.width > 0 && simRect.height > 0) {
        simCanvas.width = simRect.width * dpr;
        simCanvas.height = simRect.height * dpr;
        const ctx1 = simCanvas.getContext('2d');
        ctx1.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const graphRect = graphCanvas.getBoundingClientRect();
      if (graphRect.width > 0 && graphRect.height > 0) {
        graphCanvas.width = graphRect.width * dpr;
        graphCanvas.height = graphRect.height * dpr;
        const ctx2 = graphCanvas.getContext('2d');
        ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    },
    drawVector(ctx, x1, y1, x2, y2, color, label, labelOffset = { x: 0, y: 0 }, dashed = false) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 4) return;

      const angle = Math.atan2(dy, dx);
      const headLen = Math.min(11, Math.max(7, len * 0.25));

      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = dashed ? 1.8 : 2.6;
      if (dashed) ctx.setLineDash([4, 4]);

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
        ctx.font = "600 12px 'JetBrains Mono', monospace";
        const textMetrics = ctx.measureText(label);
        const tx = x2 + labelOffset.x;
        const ty = y2 + labelOffset.y;

        ctx.fillStyle = "rgba(9, 13, 22, 0.85)";
        ctx.beginPath();
        ctx.roundRect(tx - 4, ty - 11, textMetrics.width + 8, 16, 4);
        ctx.fill();

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

      // Инженерная сетка
      ctx.save();
      ctx.strokeStyle = "rgba(30, 41, 59, 0.45)";
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.restore();

      // Геометрия наклонной плоскости
      const alpha = phys.alphaRad;
      const pivotX = Math.max(90, w * 0.16);
      const pivotY = h - 64;
      const planeLen = Math.min(
        (w - pivotX - 56) / Math.max(Math.cos(alpha), 0.18),
        (pivotY - 88) / Math.max(Math.sin(alpha), 0.18),
        640
      );
      const topX = pivotX + planeLen * Math.cos(alpha);
      const topY = pivotY - planeLen * Math.sin(alpha);

      // Клин
      ctx.save();
      const grad = ctx.createLinearGradient(pivotX, topY, topX, pivotY);
      grad.addColorStop(0, "rgba(30, 41, 59, 0.7)");
      grad.addColorStop(1, "rgba(15, 23, 42, 0.9)");
      ctx.fillStyle = grad;
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(topX, topY);
      ctx.lineTo(topX, pivotY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Пол
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX - 90, pivotY);
      ctx.lineTo(w - 25, pivotY);
      ctx.stroke();

      // Рабочая поверхность
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(topX, topY);
      ctx.stroke();

      // Штриховка шероховатости (μ)
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 1.5;
      const step = Math.max(5, 18 - this.mu * 10);
      for (let d = 8; d < planeLen - 8; d += step) {
        const sx = pivotX + d * Math.cos(alpha);
        const sy = pivotY - d * Math.sin(alpha);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 5 * Math.sin(alpha) - 4 * Math.cos(alpha), sy + 5 * Math.cos(alpha) + 4 * Math.sin(alpha));
        ctx.stroke();
      }

      // Интерактивная ручка изменения угла на вершине клина (drag handle)
      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(topX, topY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Дуга угла α
      if (this.alpha > 1) {
        const arcRadius = 48;
        ctx.strokeStyle = "#38bdf8";
        ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
        ctx.lineWidth = 1.8;

        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.arc(pivotX, pivotY, arcRadius, -alpha, 0, false);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.arc(pivotX, pivotY, arcRadius, -alpha, 0, false);
        ctx.stroke();

        const labelAngle = -alpha / 2;
        const lx = pivotX + (arcRadius + 22) * Math.cos(labelAngle);
        const ly = pivotY + (arcRadius + 22) * Math.sin(labelAngle);
        ctx.fillStyle = "#38bdf8";
        ctx.font = "600 12px 'JetBrains Mono', monospace";
        ctx.fillText(`α=${this.alpha.toFixed(1)}°`, lx - 10, ly + 4);
      }
      ctx.restore();

      // Брусок
      const blockW = Math.max(72, Math.min(100, planeLen * 0.16));
      const blockH = Math.max(48, Math.min(64, planeLen * 0.1));
      const startDist = planeLen * 0.7;
      const pxOffset = this.blockOffset * 55;
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

      const blockGrad = ctx.createLinearGradient(-blockW / 2, -blockH / 2, blockW / 2, blockH / 2);
      if (phys.isSliding) {
        blockGrad.addColorStop(0, "#f59e0b");
        blockGrad.addColorStop(1, "#b45309");
        ctx.strokeStyle = "#fde68a";
      } else {
        blockGrad.addColorStop(0, "#0284c7");
        blockGrad.addColorStop(1, "#1e3a8a");
        ctx.strokeStyle = "#7dd3fc";
      }

      ctx.fillStyle = blockGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-blockW / 2, -blockH / 2, blockW, blockH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(`m=${this.mass.toFixed(1)}кг`, 0, -4);

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Векторы сил и движения
      const vectorScale = 140 / Math.max(phys.mg, 1);
      const downSlopeX = -Math.cos(alpha);
      const downSlopeY = Math.sin(alpha);
      const upSlopeX = Math.cos(alpha);
      const upSlopeY = -Math.sin(alpha);
      const intoSlopeX = Math.sin(alpha);
      const intoSlopeY = Math.cos(alpha);

      const mgLen = phys.mg * vectorScale;
      const pullLen = phys.fPull * vectorScale;
      const normLen = phys.fNormal * vectorScale;
      const fricLen = phys.fFriction * vectorScale;

      const mgEndX = cmX;
      const mgEndY = cmY + mgLen;
      const pullEndX = cmX + downSlopeX * pullLen;
      const pullEndY = cmY + downSlopeY * pullLen;
      const cosEndX = cmX + intoSlopeX * normLen;
      const cosEndY = cmY + intoSlopeY * normLen;

      if (this.showForces) {
        if (this.showProjections && this.alpha > 0.5) {
          ctx.save();
          ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(pullEndX, pullEndY);
          ctx.lineTo(mgEndX, mgEndY);
          ctx.lineTo(cosEndX, cosEndY);
          ctx.stroke();
          ctx.restore();

          const cosLabel = this.showVectorValues ? `mg·cosα=${phys.fNormal.toFixed(1)}Н` : "mg·cosα";
          const pullLabel = this.showVectorValues ? `mg·sinα=${phys.fPull.toFixed(1)}Н` : "mg·sinα";
          this.drawVector(ctx, cmX, cmY, cosEndX, cosEndY, "#c084fc", cosLabel, { x: 8, y: 12 }, true);
          this.drawVector(ctx, cmX, cmY, pullEndX, pullEndY, "#fbbf24", pullLabel, { x: -62, y: 14 }, false);
        }

        const mgLabel = this.showVectorValues ? `mg=${phys.mg.toFixed(1)}Н` : "mg";
        this.drawVector(ctx, cmX, cmY, mgEndX, mgEndY, "#38bdf8", mgLabel, { x: -28, y: 14 }, false);

        const nLabel = this.showVectorValues ? `N=${phys.fNormal.toFixed(1)}Н` : "N";
        const nEndX = cmX + normX * normLen;
        const nEndY = cmY + normY * normLen;
        this.drawVector(ctx, cmX, cmY, nEndX, nEndY, "#34d399", nLabel, { x: -24, y: -8 }, false);

        const fricStartX = cmX - normX * (blockH * 0.28);
        const fricStartY = cmY - normY * (blockH * 0.28);
        const fricEndX = fricStartX + upSlopeX * fricLen;
        const fricEndY = fricStartY + upSlopeY * fricLen;
        if (phys.fFriction > 0.05) {
          const fLabel = this.showVectorValues ? `F_тр=${phys.fFriction.toFixed(1)}Н` : "F_тр";
          this.drawVector(ctx, fricStartX, fricStartY, fricEndX, fricEndY, "#f43f5e", fLabel, { x: 6, y: -8 }, false);
        }

        // Результирующая сила при скольжении
        if (phys.isSliding && phys.netForce > 0.05) {
          const netLen = phys.netForce * vectorScale;
          const netEndX = cmX + downSlopeX * netLen;
          const netEndY = cmY + downSlopeY * netLen;
          const netLabel = this.showVectorValues ? `F_равн=${phys.netForce.toFixed(1)}Н` : "F_равн";
          this.drawVector(ctx, cmX, cmY, netEndX, netEndY, "#f97316", netLabel, { x: -50, y: 22 }, false);
        }
      }

      // Векторы кинематики (скорость и ускорение)
      if (this.showMotionVectors) {
        if (this.blockVelocity > 0.05) {
          const vLen = Math.min(85, Math.max(20, this.blockVelocity * 22));
          const vStartX = cmX + normX * (blockH * 0.7);
          const vStartY = cmY + normY * (blockH * 0.7);
          const vEndX = vStartX + downSlopeX * vLen;
          const vEndY = vStartY + downSlopeY * vLen;
          this.drawVector(ctx, vStartX, vStartY, vEndX, vEndY, "#38bdf8", `v=${this.blockVelocity.toFixed(2)}м/с`, { x: -45, y: -8 }, false);
        }

        if (phys.isSliding && phys.accel > 0.05) {
          const accStartX = cmX + normX * (blockH * 1.15);
          const accStartY = cmY + normY * (blockH * 1.15);
          const accLen = Math.min(80, Math.max(24, phys.accel * 6.5));
          const accEndX = accStartX + downSlopeX * accLen;
          const accEndY = accStartY + downSlopeY * accLen;
          this.drawVector(ctx, accStartX, accStartY, accEndX, accEndY, "#a855f7", `a=${phys.accel.toFixed(2)}м/с²`, { x: -45, y: -10 }, false);
        }
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

      const padLeft = 52, padRight = 24, padTop = 24, padBottom = 38;
      const plotW = w - padLeft - padRight;
      const plotH = h - padTop - padBottom;
      const maxForceY = Math.max(phys.mg * 1.05, phys.mg * this.mu * 1.08, 10);

      const degToX = (deg) => padLeft + (deg / 90) * plotW;
      const forceToY = (f) => padTop + plotH - (f / maxForceY) * plotH;

      const critX = degToX(Math.min(90, phys.critAngleDeg));

      ctx.save();
      ctx.fillStyle = "rgba(16, 185, 129, 0.05)";
      ctx.fillRect(padLeft, padTop, critX - padLeft, plotH);
      ctx.fillStyle = "rgba(245, 158, 11, 0.05)";
      ctx.fillRect(critX, padTop, padLeft + plotW - critX, plotH);

      // Сетка
      ctx.strokeStyle = "rgba(51, 65, 85, 0.5)";
      ctx.lineWidth = 1;
      ctx.font = "500 11px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#64748b";

      for (let deg = 0; deg <= 90; deg += 15) {
        const x = degToX(deg);
        ctx.beginPath(); ctx.moveTo(x, padTop); ctx.lineTo(x, padTop + plotH); ctx.stroke();
        ctx.textAlign = "center";
        ctx.fillText(`${deg}°`, x, padTop + plotH + 18);
      }

      const ySteps = 4;
      for (let i = 0; i <= ySteps; i++) {
        const fVal = (maxForceY / ySteps) * i;
        const y = forceToY(fVal);
        ctx.beginPath(); ctx.moveTo(padLeft, y); ctx.lineTo(padLeft + plotW, y); ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(fVal.toFixed(0), padLeft - 8, y + 4);
      }

      ctx.fillStyle = "#94a3b8";
      ctx.textAlign = "left";
      ctx.fillText("F_тр (Н)", 10, padTop - 8);
      ctx.textAlign = "right";
      ctx.fillText("Угол α (град.)", padLeft + plotW, padTop + plotH + 32);

      // Полные кривые sin и cos (пунктир)
      ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (let deg = 0; deg <= 90; deg += 1) {
        const rad = (deg * Math.PI) / 180;
        const f = phys.mg * Math.sin(rad);
        const x = degToX(deg);
        const y = forceToY(f);
        if (deg === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      for (let deg = 0; deg <= 90; deg += 1) {
        const rad = (deg * Math.PI) / 180;
        const f = this.mu * phys.mg * Math.cos(rad);
        const x = degToX(deg);
        const y = forceToY(f);
        if (deg === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Линия α_кр
      const critForcePeak = phys.mg * Math.sin(phys.critAngleRad);
      const critY = forceToY(critForcePeak);
      ctx.strokeStyle = "rgba(244, 63, 94, 0.65)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(critX, padTop);
      ctx.lineTo(critX, padTop + plotH);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = "#fda4af";
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      ctx.textAlign = critX > padLeft + plotW - 85 ? "right" : "left";
      ctx.fillText(`α_кр=${phys.critAngleDeg.toFixed(1)}°`, critX + (critX > padLeft + plotW - 85 ? -6 : 6), padTop + plotH - 8);

      // Реальная кривая силы трения
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      for (let deg = 0; deg <= 90; deg += 0.5) {
        const rad = (deg * Math.PI) / 180;
        const f = deg <= phys.critAngleDeg ? phys.mg * Math.sin(rad) : this.mu * phys.mg * Math.cos(rad);
        const x = degToX(deg);
        const y = forceToY(f);
        if (deg === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Точка пика
      ctx.fillStyle = "#fb7185";
      ctx.beginPath(); ctx.arc(critX, critY, 4, 0, Math.PI * 2); ctx.fill();

      // Маркер текущей точки
      const curX = degToX(this.alpha);
      const curY = forceToY(phys.fFriction);

      ctx.fillStyle = "rgba(244, 63, 94, 0.3)";
      ctx.beginPath(); ctx.arc(curX, curY, 11, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(curX, curY, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      // Бейдж
      const badgeText = `${this.alpha.toFixed(1)}° | ${phys.fFriction.toFixed(2)} Н`;
      ctx.font = "600 11px 'JetBrains Mono', monospace";
      const textW = ctx.measureText(badgeText).width + 12;
      let bx = curX + 10;
      let by = curY - 26;
      if (bx + textW > w - 10) bx = curX - textW - 10;
      if (by < padTop) by = curY + 10;

      ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
      ctx.strokeStyle = "rgba(244, 63, 94, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx, by, textW, 20, 5); ctx.fill(); ctx.stroke();

      ctx.fillStyle = "#f8fafc";
      ctx.textAlign = "left";
      ctx.fillText(badgeText, bx + 6, by + 14);
      ctx.restore();
    },
    // Прямой интерактивный драггинг мышью прямо на главном холсте (за верхушку горки)
    onSimMouseDown(e) {
      const canvas = this.$refs.simCanvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const pivotX = Math.max(90, w * 0.16);
      const pivotY = h - 64;

      const dx = mx - pivotX;
      const dy = pivotY - my;

      if (dx > 20) {
        let rad = Math.atan2(dy, dx);
        let deg = (rad * 180) / Math.PI;
        deg = Math.max(0, Math.min(85, deg));
        this.alpha = Math.round(deg * 2) / 2;
        this.isDraggingSlope = true;
      }

      window.addEventListener('mousemove', this.onSimMouseMove);
      window.addEventListener('mouseup', this.onSimMouseUp);
      window.addEventListener('touchmove', this.onSimMouseMove, { passive: false });
      window.addEventListener('touchend', this.onSimMouseUp);
    },
    onSimMouseMove(e) {
      if (!this.isDraggingSlope) return;
      const canvas = this.$refs.simCanvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const mx = clientX - rect.left;
      const my = clientY - rect.top;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      const pivotX = Math.max(90, w * 0.16);
      const pivotY = h - 64;

      const dx = mx - pivotX;
      const dy = pivotY - my;

      if (dx > 10) {
        let rad = Math.atan2(dy, dx);
        let deg = (rad * 180) / Math.PI;
        deg = Math.max(0, Math.min(85, deg));
        this.alpha = Math.round(deg * 2) / 2;
      }
    },
    onSimMouseUp() {
      this.isDraggingSlope = false;
      window.removeEventListener('mousemove', this.onSimMouseMove);
      window.removeEventListener('mouseup', this.onSimMouseUp);
      window.removeEventListener('touchmove', this.onSimMouseMove);
      window.removeEventListener('touchend', this.onSimMouseUp);
    },
    // Драггинг на графике
    onGraphMouseDown(e) {
      this.isDraggingGraph = true;
      this.updateAngleFromGraphEvent(e);
      window.addEventListener('mousemove', this.onGraphMouseMove);
      window.addEventListener('mouseup', this.onGraphMouseUp);
    },
    onGraphMouseMove(e) {
      if (this.isDraggingGraph) this.updateAngleFromGraphEvent(e);
    },
    onGraphMouseUp() {
      this.isDraggingGraph = false;
      window.removeEventListener('mousemove', this.onGraphMouseMove);
      window.removeEventListener('mouseup', this.onGraphMouseUp);
    },
    updateAngleFromGraphEvent(e) {
      const canvas = this.$refs.graphCanvas;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const padLeft = 52, padRight = 24;
      const plotW = rect.width - padLeft - padRight;
      let deg = ((x - padLeft) / plotW) * 90;
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
    <div class="lab-view grid grid-cols-1 lg:grid-cols-12 gap-6">
      <!-- Холст симуляции и Холст графика (8 колонок) -->
      <div class="lg:col-span-8 flex flex-col gap-6">
        
        <!-- Холст 1: Схема наклонной плоскости -->
        <div class="glass-panel rounded-2xl p-4 flex flex-col relative overflow-hidden shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3 z-10">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400">Динамическая схема</span>
              <span v-if="physics.isSliding" class="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                α > α_кр (Скольжение!)
              </span>
              <span v-else class="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Покой (F_тр = mg·sinα)
              </span>
            </div>
            
            <div class="flex flex-wrap items-center gap-2">
              <button
                @click="isAnimationEnabled = !isAnimationEnabled"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span>{{ isAnimationEnabled ? 'Анимация: ВКЛ' : 'Зафиксировать' }}</span>
              </button>
              <button
                @click="resetPos"
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                <span>Сбросить позицию</span>
              </button>
            </div>
          </div>

          <div class="relative w-full h-[360px] sm:h-[420px] bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden">
            <canvas
              ref="simCanvas"
              class="w-full h-full block cursor-grab active:cursor-grabbing"
              @mousedown="onSimMouseDown"
              @touchstart.passive="onSimMouseDown"
            ></canvas>

            <!-- Легенда векторов (когда включены) -->
            <div v-if="showForces" class="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl p-2.5 text-xs space-y-1.5 pointer-events-none shadow-lg">
              <div class="font-semibold text-slate-300 mb-1 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
                <span>Векторы сил:</span>
                <span class="text-[10px] text-sky-400 font-mono">активны</span>
              </div>
              <div class="flex items-center gap-2"><span class="w-3 h-1 rounded bg-rose-500 inline-block"></span><span class="text-slate-300 font-mono">F_тр</span> <span class="text-slate-400">— трение ({{ physics.fFriction.toFixed(1) }} Н)</span></div>
              <div class="flex items-center gap-2"><span class="w-3 h-1 rounded bg-amber-400 inline-block"></span><span class="text-slate-300 font-mono">mg·sinα</span> <span class="text-slate-400">— скатывающая ({{ physics.fPull.toFixed(1) }} Н)</span></div>
              <div class="flex items-center gap-2"><span class="w-3 h-1 rounded bg-emerald-400 inline-block"></span><span class="text-slate-300 font-mono">N</span> <span class="text-slate-400">— реакция опоры ({{ physics.fNormal.toFixed(1) }} Н)</span></div>
              <div v-if="showProjections" class="flex items-center gap-2"><span class="w-3 h-1 rounded bg-purple-400 inline-block"></span><span class="text-slate-300 font-mono">mg·cosα</span> <span class="text-slate-400">— прижимающая</span></div>
              <div class="flex items-center gap-2"><span class="w-3 h-1 rounded bg-sky-400 inline-block"></span><span class="text-slate-300 font-mono">mg</span> <span class="text-slate-400">— тяжесть ({{ physics.mg.toFixed(1) }} Н)</span></div>
            </div>

            <!-- Подсказка интерактива -->
            <div class="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-lg px-2.5 py-1 text-[11px] font-mono text-sky-400 pointer-events-none">
              💡 Перетаскивайте горку прямо на холсте
            </div>

            <!-- Интерактивная панель тумблеров векторов и анимации -->
            <div class="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
              <div class="flex flex-wrap items-center gap-1.5">
                <button
                  @click="showForces = !showForces"
                  :class="[
                    'px-2.5 py-1 text-xs rounded-lg border font-mono transition flex items-center gap-1.5 backdrop-blur-md',
                    showForces ? 'bg-sky-500/20 border-sky-500/40 text-sky-300' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full" :class="showForces ? 'bg-sky-400' : 'bg-slate-600'"></span>
                  <span>Векторы сил</span>
                </button>

                <button
                  @click="showProjections = !showProjections"
                  :class="[
                    'px-2.5 py-1 text-xs rounded-lg border font-mono transition flex items-center gap-1.5 backdrop-blur-md',
                    showProjections ? 'bg-purple-500/20 border-purple-500/40 text-purple-300' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full" :class="showProjections ? 'bg-purple-400' : 'bg-slate-600'"></span>
                  <span>Проекции mg</span>
                </button>

                <button
                  @click="showMotionVectors = !showMotionVectors"
                  :class="[
                    'px-2.5 py-1 text-xs rounded-lg border font-mono transition flex items-center gap-1.5 backdrop-blur-md',
                    showMotionVectors ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span class="w-2 h-2 rounded-full" :class="showMotionVectors ? 'bg-amber-400' : 'bg-slate-600'"></span>
                  <span>v и a</span>
                </button>

                <button
                  @click="showVectorValues = !showVectorValues"
                  :class="[
                    'px-2.5 py-1 text-xs rounded-lg border font-mono transition flex items-center gap-1.5 backdrop-blur-md',
                    showVectorValues ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  ]"
                >
                  <span>Значения (Н)</span>
                </button>
              </div>

              <div class="flex items-center gap-2">
                <label class="flex items-center gap-1.5 bg-slate-900/85 border border-slate-800 px-2.5 py-1 rounded-lg text-xs text-slate-300 cursor-pointer hover:border-slate-700 transition backdrop-blur-md">
                  <input type="checkbox" v-model="autoLoop" class="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0">
                  <span>Автовозврат бруска</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- Холст 2: График F_тр(α) -->
        <div class="glass-panel rounded-2xl p-4 flex flex-col shadow-xl">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <span class="text-xs font-semibold uppercase tracking-wider text-slate-400 block">График зависимости F_тр(α)</span>
              <span class="text-xs text-slate-500">Вы можете кликать или перетаскивать маркер прямо по графику для изменения угла α</span>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-xs">
              <span class="flex items-center gap-1.5 text-slate-300">
                <span class="w-4 h-1 bg-rose-500 rounded inline-block"></span> Реальная F_тр(α)
              </span>
              <span class="flex items-center gap-1.5 text-slate-400">
                <span class="w-4 border-b-2 border-dashed border-amber-400/70 inline-block"></span> mg·sin(α)
              </span>
              <span class="flex items-center gap-1.5 text-slate-400">
                <span class="w-4 border-b-2 border-dashed border-sky-400/70 inline-block"></span> μ·mg·cos(α)
              </span>
            </div>
          </div>

          <div class="relative w-full h-[270px] sm:h-[300px] bg-slate-950/70 rounded-xl border border-slate-800/80 overflow-hidden">
            <canvas
              ref="graphCanvas"
              class="w-full h-full block cursor-crosshair"
              @mousedown="onGraphMouseDown"
              @touchstart.passive="updateAngleFromGraphEvent"
            ></canvas>
          </div>
        </div>

      </div>

      <!-- Правая колонка: Управление и Дашборд расчетов (4 колонки) -->
      <div class="lg:col-span-4 flex flex-col gap-6">
        
        <!-- Панель управления -->
        <div class="glass-panel rounded-2xl p-5 shadow-xl space-y-5">
          <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 flex items-center justify-between">
            <span>Параметры системы</span>
            <button
              @click="setCritAngle"
              class="text-xs font-mono normal-case px-2.5 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 transition"
              title="Установить угол равным критическому"
            >
              Установить α = α_кр
            </button>
          </h2>

          <!-- Угол α -->
          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Угол наклона <span class="font-mono text-sky-400">α</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="85"
                  step="0.5"
                  v-model.number="alpha"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">°</span>
              </div>
            </div>
            <input type="range" min="0" max="85" step="0.5" v-model.number="alpha" />
            <div class="flex justify-between text-[11px] font-mono text-slate-500">
              <span>0°</span><span>30°</span><span>45°</span><span>60°</span><span>85°</span>
            </div>
          </div>

          <!-- Коэффициент μ -->
          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Коэф. трения <span class="font-mono text-sky-400">μ</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.01"
                  max="1.50"
                  step="0.01"
                  v-model.number="mu"
                  class="num-input w-20"
                />
              </div>
            </div>
            <input type="range" min="0.05" max="1.20" step="0.01" v-model.number="mu" />

            <div class="pt-1">
              <span class="text-[11px] text-slate-400 block mb-1.5">Быстрые пресеты материалов:</span>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  v-for="p in [{ l: '❄️ Лёд', v: 0.10 }, { l: '🪵 Дерево', v: 0.40 }, { l: '🛞 Резина', v: 0.75 }]"
                  :key="p.l"
                  @click="mu = p.v"
                  :class="[
                    'px-2 py-1.5 rounded-lg text-xs transition text-center',
                    Math.abs(mu - p.v) < 0.005
                      ? 'bg-sky-950/80 hover:bg-sky-900/70 text-sky-200 border border-sky-500/40'
                      : 'bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
                  ]"
                >
                  {{ p.l }} <span class="block font-mono text-[10px] text-sky-400">μ = {{ p.v.toFixed(2) }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Масса m -->
          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Масса бруска <span class="font-mono text-sky-400">m</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.1"
                  max="25"
                  step="0.1"
                  v-model.number="mass"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">кг</span>
              </div>
            </div>
            <input type="range" min="0.5" max="10" step="0.5" v-model.number="mass" />
            <div class="flex justify-between text-[11px] font-mono text-slate-500">
              <span>0.5 кг</span><span>5.0 кг</span><span>10.0 кг</span>
            </div>
          </div>

          <!-- Ускорение g -->
          <div class="space-y-2 pt-2 border-t border-slate-800/60">
            <div class="flex justify-between items-center">
              <label class="text-sm font-medium text-slate-200">Ускорение падения <span class="font-mono text-sky-400">g</span></label>
              <div class="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0.5"
                  max="30"
                  step="0.01"
                  v-model.number="g"
                  class="num-input w-20"
                />
                <span class="font-mono text-xs text-slate-400">м/с²</span>
              </div>
            </div>
            <input type="range" min="1.6" max="24.8" step="0.01" v-model.number="g" />
            <div class="grid grid-cols-4 gap-1 pt-1">
              <button
                v-for="pl in [{ n: 'Луна', v: 1.62 }, { n: 'Марс', v: 3.71 }, { n: 'Земля', v: 9.81 }, { n: 'Юпитер', v: 24.79 }]"
                :key="pl.n"
                @click="g = pl.v"
                :class="[
                  'px-1.5 py-1 rounded text-[11px] font-mono transition text-center border',
                  Math.abs(g - pl.v) < 0.05 ? 'bg-sky-950 text-sky-300 border-sky-500/50' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                ]"
              >
                {{ pl.n }} ({{ pl.v }})
              </button>
            </div>
          </div>
        </div>

        <!-- Дашборд расчётных данных -->
        <div class="glass-panel rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between space-y-4">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-800 pb-2.5 mb-3.5 flex items-center justify-between">
              <span>Расчётные данные в реальном времени</span>
              <span class="text-[11px] font-mono font-normal text-slate-400">12 параметров</span>
            </h2>

            <div class="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Крит. угол α_кр</span>
                <span class="text-base font-bold text-white">{{ physics.critAngleDeg.toFixed(2) }}°</span>
                <div class="text-[10px] text-slate-500 mt-0.5">arctan(μ) = {{ physics.critAngleRad.toFixed(3) }} рад</div>
              </div>

              <div class="bg-rose-950/30 border border-rose-500/30 rounded-xl p-2.5">
                <span class="text-[10px] text-rose-300 block">Сила трения F_тр</span>
                <span class="text-base font-bold text-rose-400">{{ physics.fFriction.toFixed(2) }} Н</span>
                <div class="text-[10px] text-rose-300/70 mt-0.5">{{ physics.isSliding ? 'μ·N (скольжение)' : 'mg·sinα (покой)' }}</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Скатывающая F_скат</span>
                <span class="text-base font-bold text-amber-400">{{ physics.fPull.toFixed(2) }} Н</span>
                <div class="text-[10px] text-slate-500 mt-0.5">mg·sin(α)</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Прижимающая N</span>
                <span class="text-base font-bold text-emerald-400">{{ physics.fNormal.toFixed(2) }} Н</span>
                <div class="text-[10px] text-slate-500 mt-0.5">mg·cos(α)</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Макс. трение покоя</span>
                <span class="text-base font-bold text-sky-300">{{ physics.fMaxStatic.toFixed(2) }} Н</span>
                <div class="text-[10px] text-slate-500 mt-0.5">μ·mg·cos(α)</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Результ. ускорение a</span>
                <span class="text-base font-bold text-indigo-300">{{ physics.accel.toFixed(2) }} м/с²</span>
                <div class="text-[10px] text-slate-500 mt-0.5">g·(sinα - μ·cosα)</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Скорость бруска v</span>
                <span class="text-base font-bold text-sky-400">{{ blockVelocity.toFixed(2) }} м/с</span>
                <div class="text-[10px] text-slate-500 mt-0.5">S = {{ blockOffset.toFixed(2) }} м</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Кинетич. энергия Ek</span>
                <span class="text-base font-bold text-amber-300">{{ physics.ek.toFixed(2) }} Дж</span>
                <div class="text-[10px] text-slate-500 mt-0.5">mv² / 2</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Работа трения A_тр</span>
                <span class="text-base font-bold text-rose-300">{{ physics.workFric.toFixed(2) }} Дж</span>
                <div class="text-[10px] text-slate-500 mt-0.5">F_тр · S</div>
              </div>

              <div class="bg-slate-900/90 border border-slate-800/90 rounded-xl p-2.5">
                <span class="text-[10px] text-slate-400 block">Запас сцепления k</span>
                <span class="text-base font-bold" :class="physics.safetyFactor >= 1 ? 'text-emerald-400' : 'text-amber-400'">
                  {{ physics.safetyFactor > 99 ? '∞' : physics.safetyFactor.toFixed(2) }}
                </span>
                <div class="text-[10px] mt-0.5" :class="physics.safetyFactor >= 1 ? 'text-emerald-500' : 'text-amber-500'">
                  {{ physics.safetyFactor >= 1 ? 'Устойчив' : 'Скользит' }}
                </div>
              </div>
            </div>
          </div>

          <div class="bg-slate-900/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed space-y-1.5">
            <div class="font-semibold text-slate-200 flex items-center gap-1.5">
              <svg class="w-4 h-4 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Физический смысл перегиба графика:
            </div>
            <p>
              Пока <span class="text-emerald-400 font-mono">α ≤ arctan(μ)</span>, брусок покоится, и сила трения в точности равна скатывающей силе: <span class="font-mono text-slate-200">F_тр = mg·sinα</span>.
            </p>
            <p>
              При <span class="text-amber-400 font-mono">α > arctan(μ)</span> начинается скольжение. Прижимающая сила уменьшается, поэтому сила трения начинает убывать: <span class="font-mono text-slate-200">F_тр = μ·mg·cosα</span>.
            </p>
            <p>
              При <span class="text-amber-400 font-mono">α > arctan(μ)</span> начинается скольжение. Прижимающая сила уменьшается, поэтому сила трения начинает убывать: <span class="font-mono text-slate-200">F_тр = μ·mg·cosα</span>.
            </p>
          </div>
        </div>

      </div>
    </div>
  `
};
