export default {
  name: 'LabCatalog',
  props: {
    topics: {
      type: Array,
      required: true
    },
    activeCategory: {
      type: String,
      default: 'all'
    }
  },
  emits: ['select-lab', 'select-category'],
  computed: {
    categories() {
      return [
        { id: 'all', title: 'Все разделы' },
        { id: 'mechanics', title: 'Механика' },
        { id: 'thermo', title: 'Термодинамика и МКТ' },
        { id: 'electrodynamics', title: 'Электродинамика' },
        { id: 'optics', title: 'Оптика' }
      ];
    },
    filteredTopics() {
      if (this.activeCategory === 'all') return this.topics;
      return this.topics.filter(t => t.category === this.activeCategory);
    }
  },
  template: `
    <div class="max-w-[1600px] mx-auto py-6 space-y-6">
      <!-- Заголовок каталога -->
      <div class="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div class="space-y-2 z-10 max-w-3xl">
          <div class="flex items-center gap-2">
            <span class="text-xs font-semibold uppercase tracking-wider text-sky-400 font-mono">Виртуальная лаборатория</span>
            <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
              7 симуляций
            </span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Интерактивный физический практикум
          </h1>
          <p class="text-sm text-slate-300 leading-relaxed">
            Полнофункциональные компьютерные модели физических явлений в реальном времени. Векторные диаграммы сил, сопряжённые аналитические графики с интерактивным перетаскиванием параметров и встроенные расчётные задачи с автопроверкой.
          </p>
        </div>

        <!-- Переключатели разделов -->
        <div class="flex flex-wrap gap-2 z-10">
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="$emit('select-category', cat.id)"
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5',
              activeCategory === cat.id
                ? 'bg-sky-500 text-slate-950 font-semibold shadow-lg shadow-sky-500/20'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80'
            ]"
          >
            {{ cat.title }}
          </button>
        </div>
      </div>

      <!-- Сетка карточек лабораторий -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="topic in filteredTopics"
          :key="topic.id"
          @click="$emit('select-lab', topic.id)"
          class="glass-panel rounded-2xl p-5 cursor-pointer flex flex-col justify-between group hover:border-sky-500/60 hover:shadow-2xl hover:shadow-sky-500/10 transition-all duration-300"
        >
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span class="text-xs font-mono uppercase tracking-wider text-slate-400">{{ topic.section }}</span>
              <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                {{ topic.badge }}
              </span>
            </div>

            <h2 class="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
              {{ topic.title }}
            </h2>

            <p class="text-xs text-slate-400 mt-2.5 leading-relaxed line-clamp-3">
              {{ topic.description }}
            </p>
          </div>

          <div class="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span class="text-slate-300 text-[11px] bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-sky-400 font-semibold">
              {{ topic.formula }}
            </span>
            <span class="text-sky-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Открыть →
            </span>
          </div>
        </div>
      </div>
    </div>
  `
};
