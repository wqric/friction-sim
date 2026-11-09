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
    <div class="max-w-5xl mx-auto py-10">
      <!-- Section Intro -->
      <div class="mb-8">
        <h1 class="text-xl font-medium tracking-tight text-[#eef0f5]">Виртуальные лабораторные работы</h1>
        <p class="text-xs text-[#a3a9b8] mt-1.5 max-w-xl leading-relaxed">
          Интерактивное моделирование динамических систем, векторных диаграмм и аналитических законов классической механики.
        </p>
      </div>

      <!-- Compact Industrial Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="topic in topics"
          :key="topic.id"
          @click="$emit('select-lab', topic.id)"
          class="lab-card p-4 cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div class="flex items-center justify-between text-xs mb-2">
              <span class="text-[11px] font-mono text-[#7a8296]">{{ topic.section }}</span>
              <span class="text-[11px] font-mono text-[#a3a9b8] bg-[#181d28] px-2 py-0.5 rounded-[3px] border border-white/[0.06]">
                {{ topic.badge }}
              </span>
            </div>
            
            <h2 class="text-sm font-medium text-[#eef0f5] group-hover:text-white transition-colors">
              {{ topic.title }}
            </h2>
            <p class="text-xs text-[#a3a9b8] mt-1.5 leading-relaxed">
              {{ topic.description }}
            </p>
          </div>

          <div class="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono">
            <span class="text-[11px] text-[#7a8296]">
              {{ topic.formula }}
            </span>
            <span class="text-xs text-[#a3a9b8] group-hover:text-[#eef0f5] transition-colors">
              Открыть →
            </span>
          </div>
        </div>
      </div>
    </div>
  `
};
