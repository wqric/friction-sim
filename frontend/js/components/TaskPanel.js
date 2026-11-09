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
    <div class="glass-panel rounded-2xl p-5 shadow-xl mt-6 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Практикум: контрольные задачи с автопроверкой
          </h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Используйте интерактивную модель и теоретические формулы для решения задач
          </p>
        </div>
        <span class="text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-1 rounded-lg border border-slate-800">
          Задач: {{ tasks.length }}
        </span>
      </div>

      <div v-if="loading" class="text-xs text-slate-400 py-4 font-mono">
        Загрузка задач модуля...
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="(task, index) in tasks"
          :key="task.id"
          class="bg-slate-900/90 p-4 rounded-xl border flex flex-col justify-between transition-all"
          :class="[
            results[task.id]?.is_correct === true
              ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
              : results[task.id]?.is_correct === false
                ? 'border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-500/10'
                : 'border-slate-800/90'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-semibold border border-slate-700/80">
                Задание {{ index + 1 }}
              </span>
              <span v-if="results[task.id]?.is_correct === true" class="text-emerald-400 text-xs font-mono font-bold">
                ✓ Решено
              </span>
              <span v-else-if="results[task.id]?.is_correct === false" class="text-rose-400 text-xs font-mono font-bold">
                ✕ Ошибка
              </span>
            </div>

            <p class="text-xs text-slate-200 leading-relaxed mt-2">
              {{ task.question }}
            </p>

            <!-- Подсказка -->
            <div class="mt-2.5">
              <button
                @click="toggleHint(task.id)"
                class="text-[11px] text-sky-400 hover:text-sky-300 transition font-mono flex items-center gap-1"
              >
                <span>{{ showHints[task.id] ? 'Скрыть подсказку ↑' : 'Подсказка к формуле ↓' }}</span>
              </button>
              <div v-if="showHints[task.id]" class="text-[11px] text-slate-300 font-mono mt-1.5 p-2 rounded-lg bg-slate-950/80 border border-slate-800 leading-relaxed">
                {{ task.hint }}
              </div>
            </div>
          </div>

          <!-- Ввод и проверка -->
          <div class="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
            <div class="flex items-center gap-2">
              <input
                v-model="answers[task.id]"
                type="number"
                step="any"
                placeholder="Ваш ответ"
                @keyup.enter="checkAnswer(task)"
                class="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:border-sky-500 transition"
              />
              <span class="text-xs font-mono text-slate-400 w-10 shrink-0">{{ task.unit }}</span>
            </div>

            <button
              @click="checkAnswer(task)"
              class="w-full py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              Проверить ответ
            </button>

            <!-- Результат проверки -->
            <div v-if="results[task.id]" class="text-xs font-mono pt-1">
              <div v-if="results[task.id].is_correct" class="text-emerald-300 text-[11px] leading-relaxed">
                {{ results[task.id].explanation }}
              </div>
              <div v-else class="text-rose-300 text-[11px] leading-relaxed">
                {{ results[task.id].explanation }}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
};
