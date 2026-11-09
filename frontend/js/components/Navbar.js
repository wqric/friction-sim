export default {
  name: 'Navbar',
  props: {
    activeLab: {
      type: String,
      default: null
    },
    topics: {
      type: Array,
      default: () => []
    }
  },
  emits: ['select-lab', 'go-home'],
  template: `
    <header class="hairline-b bg-[#0e121b] sticky top-0 z-40">
      <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <!-- Brand -->
        <div class="flex items-center gap-6">
          <button @click="$emit('go-home')" class="flex items-center gap-2.5 text-left group">
            <span class="w-6 h-6 rounded bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 font-mono text-xs font-bold">Φ</span>
            <div class="flex flex-col">
              <span class="text-sm font-semibold tracking-tight text-slate-100 group-hover:text-sky-300 transition-colors">PhysLab</span>
              <span class="text-[10px] text-slate-400 font-mono leading-none">Механика</span>
            </div>
          </button>

          <!-- Navigation Pills -->
          <nav class="hidden md:flex items-center gap-1 border-l border-white/10 pl-5">
            <button
              v-for="topic in topics"
              :key="topic.id"
              @click="$emit('select-lab', topic.id)"
              :class="[
                'px-2.5 py-1 text-xs rounded transition-colors font-medium',
                activeLab === topic.id
                  ? 'bg-slate-800 text-sky-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              ]"
            >
              {{ topic.section }}
            </button>
          </nav>
        </div>

        <!-- Right indicators -->
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-white/5">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>SI units</span>
          </div>
          <button
            v-if="activeLab"
            @click="$emit('go-home')"
            class="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition"
          >
            ← Каталог
          </button>
        </div>
      </div>
    </header>
  `
};
