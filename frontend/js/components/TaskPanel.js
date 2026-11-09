export default {
  name: 'TaskPanel',
  props: {
    topicId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      tasks: [],
      answers: {},
      results: {},
      showHints: {},
      loading: false,
      error: null
    };
  },
  watch: {
    topicId: {
      immediate: true,
      handler(newId) {
        if (newId) this.fetchTasks(newId);
      }
    }
  },
  methods: {
    async fetchTasks(id) {
      this.loading = true;
      this.results = {};
      this.answers = {};
      this.showHints = {};
      try {
        const res = await fetch(`/api/tasks/${id}`);
        if (!res.ok) throw new Error('Ошибка загрузки задач');
        this.tasks = await res.json();
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    toggleHint(taskId) {
      this.showHints[taskId] = !this.showHints[taskId];
    },
    async checkAnswer(task) {
      const val = parseFloat(this.answers[task.id]);
      if (isNaN(val)) return;

      try {
        const res = await fetch(`/api/tasks/${this.topicId}/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task_id: task.id,
            user_answer: val
          })
        });
        const data = await res.json();
        this.results[task.id] = data;
      } catch (err) {
        console.error(err);
      }
    }
  },
  template: `
    <div class="lab-panel p-4 mt-6">
      <div class="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
        <div>
          <h3 class="text-xs font-medium text-[#eef0f5]">Контрольные расчётные задачи</h3>
          <p class="text-[11px] text-[#7a8296] mt-0.5">Численная проверка решений с допустимой погрешностью</p>
        </div>
        <span class="text-[11px] font-mono text-[#7a8296]">
          Задач: {{ tasks.length }}
        </span>
      </div>

      <div v-if="loading" class="text-xs text-[#7a8296] py-3 font-mono">
        Загрузка задач...
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(task, index) in tasks"
          :key="task.id"
          class="p-3.5 rounded-[4px] border transition-colors"
          :class="[
            results[task.id]?.is_correct === true
              ? 'bg-[#181d28] border-[#34d399]/40'
              : results[task.id]?.is_correct === false
                ? 'bg-[#181d28] border-[#f43f5e]/40'
                : 'bg-[#11141c] border-white/[0.06]'
          ]"
        >
          <div class="flex flex-col sm:flex-row items-start justify-between gap-3">
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] bg-[#181d28] text-[#a3a9b8] border border-white/[0.06]">
                  Задача {{ index + 1 }}
                </span>
              </div>
              <p class="text-xs text-[#eef0f5] mt-1.5 leading-relaxed">
                {{ task.question }}
              </p>

              <!-- Hint toggle -->
              <div class="mt-2">
                <button
                  @click="toggleHint(task.id)"
                  class="text-[11px] text-[#7a8296] hover:text-[#a3a9b8] transition-colors font-mono"
                >
                  {{ showHints[task.id] ? 'Скрыть подсказку' : 'Показать подсказку' }}
                </button>
                <p v-if="showHints[task.id]" class="text-[11px] text-[#a3a9b8] font-mono mt-1 pl-2 border-l border-white/[0.12]">
                  {{ task.hint }}
                </p>
              </div>
            </div>

            <!-- Input and action -->
            <div class="w-full sm:w-44 shrink-0 flex flex-col items-end gap-1.5">
              <div class="flex items-center gap-1.5 w-full">
                <input
                  v-model="answers[task.id]"
                  type="number"
                  step="any"
                  placeholder="Ответ"
                  @keyup.enter="checkAnswer(task)"
                  class="w-full bg-[#181d28] border border-white/[0.1] rounded-[3px] px-2.5 py-1 text-xs font-mono text-[#eef0f5] placeholder-[#7a8296] focus:border-white/30"
                />
                <span class="text-xs font-mono text-[#7a8296] w-6 shrink-0">{{ task.unit }}</span>
              </div>
              <button
                @click="checkAnswer(task)"
                class="w-full py-1 text-xs font-normal rounded-[3px] bg-[#181d28] hover:bg-[#1f2533] text-[#eef0f5] border border-white/[0.08] transition"
              >
                Проверить
              </button>
            </div>
          </div>

          <!-- Result feedback -->
          <div v-if="results[task.id]" class="mt-2.5 pt-2 border-t border-white/[0.06] text-xs font-mono">
            <span v-if="results[task.id].is_correct" class="text-[#34d399] flex items-center gap-1.5">
              <span>✓ Верно.</span>
              <span class="text-[#a3a9b8] font-sans text-[11px]">{{ results[task.id].explanation }}</span>
            </span>
            <span v-else class="text-[#f43f5e] flex items-center gap-1.5">
              <span>✕ Неверно.</span>
              <span class="text-[#7a8296] font-sans text-[11px]">{{ results[task.id].explanation }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  `
};
