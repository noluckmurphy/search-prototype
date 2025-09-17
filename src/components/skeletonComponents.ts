/**
 * Reusable skeleton screen components for loading states
 * Based on the Nielsen Norman Group skeleton screen guidelines
 * https://www.nngroup.com/articles/skeleton-screens/
 */

export interface SkeletonOptions {
  width?: string;
  height?: string;
  className?: string;
  animated?: boolean;
}

/**
 * Creates a skeleton line element
 */
export function createSkeletonLine(options: SkeletonOptions = {}): HTMLElement {
  const { width = '100%', height = '1rem', className = '', animated = true } = options;
  
  const line = document.createElement('div');
  line.className = `skeleton-line ${animated ? 'skeleton-animated' : ''} ${className}`.trim();
  line.style.width = width;
  line.style.height = height;
  
  return line;
}

/**
 * Creates a skeleton rectangle element
 */
export function createSkeletonRect(options: SkeletonOptions = {}): HTMLElement {
  const { width = '100%', height = '4rem', className = '', animated = true } = options;
  
  const rect = document.createElement('div');
  rect.className = `skeleton-rect ${animated ? 'skeleton-animated' : ''} ${className}`.trim();
  rect.style.width = width;
  rect.style.height = height;
  
  return rect;
}

/**
 * Creates a skeleton circle element
 */
export function createSkeletonCircle(options: SkeletonOptions = {}): HTMLElement {
  const { width = '2rem', height = '2rem', className = '', animated = true } = options;
  
  const circle = document.createElement('div');
  circle.className = `skeleton-circle ${animated ? 'skeleton-animated' : ''} ${className}`.trim();
  circle.style.width = width;
  circle.style.height = height;
  
  return circle;
}

/**
 * Creates a skeleton card with multiple elements
 */
export function createSkeletonCard(options: {
  title?: boolean;
  subtitle?: boolean;
  content?: number; // number of content lines
  avatar?: boolean;
  actions?: number; // number of action buttons
  className?: string;
} = {}): HTMLElement {
  const { title = true, subtitle = true, content = 2, avatar = false, actions = 1, className = '' } = options;
  
  const card = document.createElement('div');
  card.className = `skeleton-card ${className}`.trim();
  
  const header = document.createElement('div');
  header.className = 'skeleton-card__header';
  
  if (avatar) {
    const avatarEl = createSkeletonCircle({ width: '2.5rem', height: '2.5rem' });
    header.appendChild(avatarEl);
  }
  
  const headerContent = document.createElement('div');
  headerContent.className = 'skeleton-card__header-content';
  
  if (title) {
    const titleEl = createSkeletonLine({ width: '60%', height: '1.25rem' });
    headerContent.appendChild(titleEl);
  }
  
  if (subtitle) {
    const subtitleEl = createSkeletonLine({ width: '40%', height: '0.875rem' });
    headerContent.appendChild(subtitleEl);
  }
  
  header.appendChild(headerContent);
  card.appendChild(header);
  
  if (content > 0) {
    const contentEl = document.createElement('div');
    contentEl.className = 'skeleton-card__content';
    
    for (let i = 0; i < content; i++) {
      const lineWidth = i === content - 1 ? '75%' : '100%';
      const lineEl = createSkeletonLine({ width: lineWidth, height: '0.875rem' });
      contentEl.appendChild(lineEl);
    }
    
    card.appendChild(contentEl);
  }
  
  if (actions > 0) {
    const actionsEl = document.createElement('div');
    actionsEl.className = 'skeleton-card__actions';
    
    for (let i = 0; i < actions; i++) {
      const buttonEl = createSkeletonRect({ width: '4rem', height: '2rem' });
      actionsEl.appendChild(buttonEl);
    }
    
    card.appendChild(actionsEl);
  }
  
  return card;
}

/**
 * Creates a skeleton list with multiple items
 */
export function createSkeletonList(options: {
  items?: number;
  avatar?: boolean;
  title?: boolean;
  subtitle?: boolean;
  className?: string;
} = {}): HTMLElement {
  const { items = 3, avatar = false, title = true, subtitle = true, className = '' } = options;
  
  const list = document.createElement('div');
  list.className = `skeleton-list ${className}`.trim();
  
  for (let i = 0; i < items; i++) {
    const item = document.createElement('div');
    item.className = 'skeleton-list__item';
    
    if (avatar) {
      const avatarEl = createSkeletonCircle({ width: '2rem', height: '2rem' });
      item.appendChild(avatarEl);
    }
    
    const content = document.createElement('div');
    content.className = 'skeleton-list__content';
    
    if (title) {
      const titleEl = createSkeletonLine({ width: '70%', height: '1rem' });
      content.appendChild(titleEl);
    }
    
    if (subtitle) {
      const subtitleEl = createSkeletonLine({ width: '50%', height: '0.75rem' });
      content.appendChild(subtitleEl);
    }
    
    item.appendChild(content);
    list.appendChild(item);
  }
  
  return list;
}

/**
 * Creates a skeleton grid layout
 */
export function createSkeletonGrid(options: {
  columns?: number;
  rows?: number;
  gap?: string;
  className?: string;
} = {}): HTMLElement {
  const { columns = 3, rows = 2, gap = '1rem', className = '' } = options;
  
  const grid = document.createElement('div');
  grid.className = `skeleton-grid ${className}`.trim();
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  grid.style.gap = gap;
  
  for (let i = 0; i < columns * rows; i++) {
    const card = createSkeletonCard({ content: 1, actions: 0 });
    grid.appendChild(card);
  }
  
  return grid;
}

/**
 * Creates a skeleton table
 */
export function createSkeletonTable(options: {
  rows?: number;
  columns?: number;
  header?: boolean;
  className?: string;
} = {}): HTMLElement {
  const { rows = 5, columns = 4, header = true, className = '' } = options;
  
  const table = document.createElement('div');
  table.className = `skeleton-table ${className}`.trim();
  
  if (header) {
    const headerRow = document.createElement('div');
    headerRow.className = 'skeleton-table__header';
    
    for (let i = 0; i < columns; i++) {
      const headerCell = createSkeletonLine({ width: '80%', height: '1rem' });
      headerRow.appendChild(headerCell);
    }
    
    table.appendChild(headerRow);
  }
  
  for (let row = 0; row < rows; row++) {
    const tableRow = document.createElement('div');
    tableRow.className = 'skeleton-table__row';
    
    for (let col = 0; col < columns; col++) {
      const cell = createSkeletonLine({ width: '90%', height: '0.875rem' });
      tableRow.appendChild(cell);
    }
    
    table.appendChild(tableRow);
  }
  
  return table;
}

/**
 * Creates a skeleton sidebar layout
 */
export function createSkeletonSidebar(options: {
  sections?: number;
  className?: string;
} = {}): HTMLElement {
  const { sections = 3, className = '' } = options;
  
  const sidebar = document.createElement('div');
  sidebar.className = `skeleton-sidebar ${className}`.trim();
  
  for (let i = 0; i < sections; i++) {
    const section = document.createElement('div');
    section.className = 'skeleton-sidebar__section';
    
    const title = createSkeletonLine({ width: '60%', height: '1rem' });
    section.appendChild(title);
    
    const list = createSkeletonList({ items: 3, avatar: false, title: true, subtitle: false });
    section.appendChild(list);
    
    sidebar.appendChild(section);
  }
  
  return sidebar;
}
