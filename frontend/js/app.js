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
    <div class="min-h-screen flex flex-col bg-[#0b0d14] text-[#eef0f5]">
      <Navbar
        :active-lab="activeLab"
        :topics="topics"
        @select-lab="selectLab"
        @go-home="goHome"
      />

      <main class="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
        <!-- Catalog View -->
        <LabCatalog
          v-if="!activeLab"
          :topics="topics"
          @select-lab="selectLab"
        />

        <!-- Active Simulation Lab View -->
        <div v-else class="space-y-4">
          <!-- Lab Header -->
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-mono text-[#7a8296]">{{ currentTopic?.section }}</span>
                <span class="text-[11px] font-mono text-[#a3a9b8] px-1.5 py-0.2 rounded-[2px] bg-[#181d28] border border-white/[0.06]">
                  {{ currentTopic?.badge }}
                </span>
              </div>
              <h1 class="text-lg font-medium text-[#eef0f5] mt-1">
                {{ currentTopic?.title }}
              </h1>
              <p class="text-xs text-[#a3a9b8] mt-0.5">
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

      <footer class="border-t border-white/[0.08] bg-[#07080d] py-5 text-center text-xs text-[#7a8296] font-mono">
        PhysLab &bull; Физическая лаборатория механики &bull; СИ
      </footer>
    </div>
  `
});

app.mount('#app');
