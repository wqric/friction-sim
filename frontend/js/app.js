import Navbar from './components/Navbar.js';
import LabCatalog from './components/LabCatalog.js';
import TaskPanel from './components/TaskPanel.js';
import FrictionLab from './labs/FrictionLab.js';
import BallisticsLab from './labs/BallisticsLab.js';
import PendulumLab from './labs/PendulumLab.js';
import CollisionLab from './labs/CollisionLab.js';
import GasLawsLab from './labs/GasLawsLab.js';
import CircuitsLab from './labs/CircuitsLab.js';
import OpticsLab from './labs/OpticsLab.js';

const { createApp } = Vue;

const app = createApp({
  components: {
    Navbar,
    LabCatalog,
    TaskPanel,
    FrictionLab,
    BallisticsLab,
    PendulumLab,
    CollisionLab,
    GasLawsLab,
    CircuitsLab,
    OpticsLab
  },
  data() {
    return {
      topics: [],
      activeLab: null,
      activeCategory: 'all',
      loading: true,
      error: null
    };
  },
  computed: {
    currentTopic() {
      return this.topics.find(t => t.id === this.activeLab);
    }
  },
  async mounted() {
    this.handleHashChange();
    window.addEventListener('hashchange', this.handleHashChange);

    try {
      const res = await fetch('/api/simulations');
      if (!res.ok) throw new Error('Не удалось загрузить каталог');
      this.topics = await res.json();
    } catch (err) {
      this.error = err.message;
    } finally {
      this.loading = false;
    }
  },
  beforeUnmount() {
    window.removeEventListener('hashchange', this.handleHashChange);
  },
  methods: {
    handleHashChange() {
      const hash = window.location.hash.replace('#', '').replace('/', '');
      this.activeLab = hash || null;
    },
    selectLab(id) {
      this.activeLab = id;
      window.location.hash = `#/${id}`;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    selectCategory(catId) {
      this.activeCategory = catId;
      this.activeLab = null;
      window.location.hash = '';
    },
    goHome() {
      this.activeLab = null;
      window.location.hash = '';
    }
  },
  template: `
    <div class="min-h-screen flex flex-col font-sans antialiased selection:bg-sky-500 selection:text-white">
      <Navbar
        :active-lab="activeLab"
        :active-category="activeCategory"
        :topics="topics"
        @select-lab="selectLab"
        @select-category="selectCategory"
        @go-home="goHome"
      />

      <main class="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6">
        <!-- Главный каталог лабораторий с разделением по темам -->
        <LabCatalog
          v-if="!activeLab"
          :topics="topics"
          :active-category="activeCategory"
          @select-lab="selectLab"
          @select-category="selectCategory"
        />

        <!-- Выбранная лаборатория -->
        <div v-else class="space-y-6">
          <!-- Шапка текущей симуляции -->
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path>
                </svg>
              </div>
              <div>
                <h1 class="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  {{ currentTopic?.title }}
                  <span class="hidden md:inline-block text-xs font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {{ currentTopic?.section }}
                  </span>
                </h1>
                <p class="text-xs text-slate-400">{{ currentTopic?.description }}</p>
              </div>
            </div>

            <!-- Индикатор состояния -->
            <div class="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border bg-sky-950/60 border-sky-500/40 text-sky-300">
              <span class="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
              <span class="font-mono">{{ currentTopic?.formula }}</span>
            </div>
          </div>

          <!-- Динамический компонент симуляции -->
          <component
            :is="activeLab === 'friction' ? 'FrictionLab' :
                 activeLab === 'ballistics' ? 'BallisticsLab' :
                 activeLab === 'pendulum' ? 'PendulumLab' :
                 activeLab === 'collision' ? 'CollisionLab' :
                 activeLab === 'gas-laws' ? 'GasLawsLab' :
                 activeLab === 'circuits' ? 'CircuitsLab' :
                 activeLab === 'optics' ? 'OpticsLab' : 'div'"
          />

          <!-- Блок интерактивных задач -->
          <TaskPanel :topic-id="activeLab" />
        </div>
      </main>

      <footer class="border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md py-4 text-center text-xs text-slate-400 font-mono">
        PhysLab &bull; Интерактивный виртуальный физический практикум &bull; FastAPI + Vue 3
      </footer>
    </div>
  `
});

app.mount('#app');
