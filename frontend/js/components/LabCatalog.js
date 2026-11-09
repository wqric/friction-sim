export default {
  name: 'LabCatalog',
  props: {
    topics: {
      type: Array,
      required: true
    }
  },
  emits: ['select-lab'],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Section Intro -->
      <div class="mb-8">
        <span class="text-xs font-mono uppercase tracking-wider text-sky-400">Учебный комплекс</span>
        <h1 class="text-2xl font-bold tracking-tight text-white mt-1">Виртуальная лаборатория механики</h1>
        <p class="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Интерактивные математические модели физических явлений с динамическим расчётом векторов сил, фазовыми траекториями и практическими расчётными задачами.
        </p>
      </div>

      <!-- Grid of simulations -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="topic in topics"
          :key="topic.id"
          @click="$emit('select-lab', topic.id)"
          class="lab-card p-5 cursor-pointer flex flex-col justify-between group hover:border-sky-500/40"
        >
          <div>
            <div class="flex items-center justify-between mb-2.5">
              <span class="text-[11px] font-mono text-slate-400 uppercase tracking-wider">{{ topic.section }}</span>
              <span class="text-[11px] px-2 py-0.5 rounded bg-sky-950/60 border border-sky-500/20 text-sky-300 font-mono">
                {{ topic.badge }}
              </span>
            </div>
            
            <h2 class="text-base font-semibold text-slate-100 group-hover:text-sky-300 transition-colors">
              {{ topic.title }}
            </h2>
            <p class="text-xs text-slate-400 mt-2 leading-relaxed">
              {{ topic.description }}
            </p>
          </div>

          <div class="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
            <span class="text-slate-300 text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-white/5">
              {{ topic.formula }}
            </span>
            <span class="text-sky-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
              Открыть →
            </span>
          </div>
        </div>
      </div>
    </div>
  `
};
