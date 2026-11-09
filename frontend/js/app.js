import Navbar from './components/Navbar.js';
import LabCatalog from './components/LabCatalog.js';
import TaskPanel from './components/TaskPanel.js';
import FrictionLab from './labs/FrictionLab.js';
import BallisticsLab from './labs/BallisticsLab.js';
import PendulumLab from './labs/PendulumLab.js';
import CollisionLab from './labs/CollisionLab.js';

const { createApp } = Vue;

const app = createApp({
  components: {
    Navbar,
    LabCatalog,
    TaskPanel,
    FrictionLab,
    BallisticsLab,
    PendulumLab,
    CollisionLab
  },
  data() {
    return {
      topics: [],
      activeLab: null,
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
    // Read route from URL hash
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
    goHome() {
      this.activeLab = null;
      window.location.hash = '';
    }
  },
  template: `
    <div class="min-h-screen flex flex-col bg-[#0a0d14] text-slate-100">
      <Navbar
        :active-lab="activeLab"
        :topics="topics"
        @select-lab="selectLab"
        @go-home="goHome"
      />

      <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        <!-- Catalog View -->
        <LabCatalog
          v-if="!activeLab"
          :topics="topics"
          @select-lab="selectLab"
        />

        <!-- Active Simulation Lab View -->
        <div v-else class="space-y-6">
          <!-- Lab Header -->
          <div class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-mono text-sky-400 uppercase tracking-wider">{{ currentTopic?.section }}</span>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">Лаборатория</span>
              </div>
              <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
                {{ currentTopic?.title }}
              </h1>
              <p class="text-xs text-slate-400 mt-1">
                {{ currentTopic?.description }}
              </p>
            </div>
          </div>

          <!-- Dynamic Component based on active lab -->
          <component
            :is="activeLab === 'friction' ? 'FrictionLab' :
                 activeLab === 'ballistics' ? 'BallisticsLab' :
                 activeLab === 'pendulum' ? 'PendulumLab' :
                 activeLab === 'collision' ? 'CollisionLab' : 'div'"
          />

          <!-- Interactive Tasks with instant autocheck -->
          <TaskPanel :topic-id="activeLab" />
        </div>
      </main>

      <footer class="hairline-t bg-[#0e121b] py-6 text-center text-xs text-slate-400 font-mono">
        PhysLab &bull; Интерактивная платформа обучения физике &bull; FastAPI + Vue 3
      </footer>
    </div>
  `
});

app.mount('#app');
