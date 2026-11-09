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
    <header class="border-b border-white/[0.08] bg-[#07080d] sticky top-0 z-40">
      <div class="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        <!-- Brand -->
        <div class="flex items-center gap-6">
          <button @click="$emit('go-home')" class="flex items-center gap-2.5 text-left group">
            <span class="w-5 h-5 rounded-[3px] bg-white/[0.06] border border-white/[0.1] flex items-center justify-center text-[#eef0f5] font-mono text-xs">Φ</span>
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium tracking-normal text-[#eef0f5] group-hover:text-white transition-colors">PhysLab</span>
              <span class="text-[11px] text-[#7a8296] font-mono">/ механика</span>
            </div>
          </button>

          <!-- Navigation Links -->
          <nav class="hidden md:flex items-center gap-1 border-l border-white/[0.08] pl-4">
            <button
              v-for="topic in topics"
              :key="topic.id"
              @click="$emit('select-lab', topic.id)"
              :class="[
                'px-2 py-1 text-xs rounded-[3px] transition-colors',
                activeLab === topic.id
                  ? 'bg-[#181d28] text-[#eef0f5] border border-white/[0.12]'
                  : 'text-[#a3a9b8] hover:text-[#eef0f5] hover:bg-white/[0.04]'
              ]"
            >
              {{ topic.section }}
            </button>
          </nav>
        </div>

        <!-- Right actions -->
        <div class="flex items-center gap-3">
          <span class="text-[11px] font-mono text-[#7a8296]">СИ (SI)</span>
          <button
            v-if="activeLab"
            @click="$emit('go-home')"
            class="px-2.5 py-1 text-xs font-normal text-[#a3a9b8] hover:text-[#eef0f5] bg-[#11141c] hover:bg-[#181d28] rounded-[3px] border border-white/[0.08] transition"
          >
            ← Каталог
          </button>
        </div>
      </div>
    </header>
  `
};
