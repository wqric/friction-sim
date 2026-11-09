export default {
  name: 'Navbar',
  props: {
    activeLab: {
      type: String,
      default: null
    },
    activeCategory: {
      type: String,
      default: 'all'
    },
    topics: {
      type: Array,
      default: () => []
    }
  },
  emits: ['select-lab', 'go-home', 'select-category'],
  computed: {
    categories() {
      return [
        { id: 'all', title: 'Все разделы' },
        { id: 'mechanics', title: 'Механика' },
        { id: 'thermo', title: 'Термодинамика' },
        { id: 'electrodynamics', title: 'Электродинамика' },
        { id: 'optics', title: 'Оптика' }
      ];
    }
  },
  template: `
    <header class="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div class="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-4">
        <!-- Logo & Title -->
        <div class="flex items-center gap-4">
          <button @click="$emit('go-home')" class="flex items-center gap-3 text-left group">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/25 group-hover:scale-105 transition-transform shrink-0">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path>
              </svg>
            </div>
            <div>
              <div class="text-base font-bold text-white tracking-tight flex items-center gap-2">
                PhysLab
                <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">Виртуальная лаборатория</span>
              </div>
              <p class="text-[11px] text-slate-400 hidden sm:block">Интерактивный физический практикум</p>
            </div>
          </button>

          <!-- Разделы физики -->
          <div class="hidden md:flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-800">
            <button
              v-for="cat in categories"
              :key="cat.id"
              @click="$emit('select-category', cat.id)"
              :class="[
                'px-2.5 py-1 rounded-lg text-xs font-medium transition',
                activeCategory === cat.id && !activeLab
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              ]"
            >
              {{ cat.title }}
            </button>
          </div>
        </div>

        <!-- Кнопки правого меню -->
        <div class="flex items-center gap-2 sm:gap-3">
          <div class="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Физический движок активен</span>
          </div>
          <button
            v-if="activeLab"
            @click="$emit('go-home')"
            class="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Каталог
          </button>
        </div>
      </div>
    </header>
  `
};
