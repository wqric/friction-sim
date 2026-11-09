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
    <div class="lab-panel p-5 mt-6">
      <div class="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div>
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-300">Контрольные задачи с автопроверкой</h3>
          <p class="text-xs text-slate-400 mt-0.5">Решите задачу с помощью модели или аналитических формул</p>
        </div>
        <span class="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
          Задач: {{ tasks.length }}
        </span>
      </div>

      <div v-if="loading" class="text-xs text-slate-400 py-4 font-mono">
        Загрузка задач...
      </div>

      <div v-else class="space-y-4">
        <div
          v-for="(task, index) in tasks"
          :key="task.id"
          class="p-4 rounded border"
          :class="[
            results[task.id]?.is_correct === true
              ? 'bg-emerald-950/20 border-emerald-500/30'
              : results[task.id]?.is_correct === false
                ? 'bg-rose-950/20 border-rose-500/30'
                : 'bg-slate-900/40 border-white/5'
          ]"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 mr-2">
                Задача {{ index + 1 }}
              </span>
              <p class="text-xs text-slate-200 mt-2 leading-relaxed">
                {{ task.question }}
              </p>

              <!-- Hint toggle -->
              <div class="mt-2.5">
                <button
                  @click="toggleHint(task.id)"
                  class="text-[11px] text-sky-400 hover:text-sky-300 transition-colors font-mono"
                >
                  {{ showHints[task.id] ? 'Скрыть подсказку ↑' : 'Показать подсказку ↓' }}
                </button>
                <p v-if="showHints[task.id]" class="text-[11px] text-slate-400 font-mono mt-1 pl-2 border-l border-sky-500/30">
                  {{ task.hint }}
                </p>
              </div>
            </div>

            <!-- Input and submit -->
            <div class="w-48 shrink-0 flex flex-col items-end gap-2">
              <div class="flex items-center gap-1.5 w-full">
                <input
                  v-model="answers[task.id]"
                  type="number"
                  step="any"
                  placeholder="Ответ"
                  @keyup.enter="checkAnswer(task)"
                  class="w-full bg-[#151a27] border border-white/10 rounded px-2.5 py-1 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-500"
                />
                <span class="text-xs font-mono text-slate-400 w-8">{{ task.unit }}</span>
              </div>
              <button
                @click="checkAnswer(task)"
                class="w-full py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
              >
                Проверить
              </button>
            </div>
          </div>

          <!-- Result feedback -->
          <div v-if="results[task.id]" class="mt-3 pt-2.5 border-t border-white/5 text-xs font-mono">
            <span v-if="results[task.id].is_correct" class="text-emerald-400 flex items-center gap-1.5">
              <span>✓ Верно!</span>
              <span class="text-slate-300 font-sans text-[11px]">{{ results[task.id].explanation }}</span>
            </span>
            <span v-else class="text-rose-400 flex items-center gap-1.5">
              <span>✕ Неверно.</span>
              <span class="text-slate-400 font-sans text-[11px]">{{ results[task.id].explanation }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  `
};
