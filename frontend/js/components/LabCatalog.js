export default {
  name: 'LabCatalog',
  props: { topics: { type: Array, required: true }, activeCategory: { type: String, default: 'all' } },
  emits: ['select-lab', 'select-category'],
  computed: {
    categories() {
      return [
        { id: 'all', title: 'Все разделы' },
        { id: 'mechanics', title: 'Механика' },
        { id: 'thermo', title: 'Термодинамика и МКТ' },
        { id: 'electrodynamics', title: 'Электродинамика' },
        { id: 'optics', title: 'Оптика' }
      ];
    },
    filteredTopics() {
      return this.activeCategory === 'all' ? this.topics : this.topics.filter(t => t.category === this.activeCategory);
    }
  },
  template: `
    <section class="catalog">
      <div class="catalog-intro">
        <div><p class="eyebrow">PhysLab / Практикум</p><h1>Физические лаборатории</h1><p>Изменяйте параметры, наблюдайте за моделями и решайте задачи по физике</p></div>
        <span class="catalog-count">{{ topics.length }} лабораторий</span>
      </div>
      <div class="category-list" aria-label="Разделы">
        <button v-for="cat in categories" :key="cat.id" @click="$emit('select-category', cat.id)" :class="{ selected: activeCategory === cat.id }">{{ cat.title }}</button>
      </div>
      <div class="catalog-grid">
        <button v-for="(topic, index) in filteredTopics" :key="topic.id" class="lab-card" @click="$emit('select-lab', topic.id)">
          <span class="lab-meta">{{ topic.section }} <span>{{ String(index + 1).padStart(2, '0') }}</span></span>
          <strong>{{ topic.title }}</strong><span class="lab-description">{{ topic.description }}</span>
          <span class="lab-bottom"><span>{{ topic.formula }}</span><span aria-hidden="true">↗</span></span>
        </button>
      </div>
    </section>
  `
};
