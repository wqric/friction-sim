export default {
  name: 'Navbar',
  props: { activeLab: String, activeCategory: String, topics: Array },
  emits: ['select-lab', 'go-home', 'select-category'],
  data() {
    return { categories: [
      { id: 'all', title: 'Все разделы' },
      { id: 'mechanics', title: 'Механика' },
      { id: 'thermo', title: 'Термодинамика' },
      { id: 'electrodynamics', title: 'Электродинамика' },
      { id: 'optics', title: 'Оптика' }
    ] };
  },
  template: `
    <header class="site-header">
      <div class="site-header-inner">
        <button class="site-brand" @click="$emit('go-home')">PhysLab <span>Физический практикум</span></button>
        <nav class="site-nav" aria-label="Разделы физики">
          <button v-for="cat in categories" :key="cat.id" @click="$emit('select-category', cat.id)" :class="{ selected: activeCategory === cat.id && !activeLab }">{{ cat.title }}</button>
        </nav>
        <button v-if="activeLab" class="back-link" @click="$emit('go-home')">← Каталог</button>
      </div>
    </header>
  `
};
