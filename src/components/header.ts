import { ScreenRoute } from '../types';

export interface HeaderOptions {
  onNavigate(route: ScreenRoute): void;
  onHome(): void;
  onSearchChange(value: string): void;
  onSearchSubmit(): void;
  onSearchFocus?(): void;
  onSearchBlur?(): void;
  onSearchKeyDown?(event: KeyboardEvent): void;
}

export interface HeaderHandles {
  element: HTMLElement;
  searchInput: HTMLInputElement;
  dialogHost: HTMLDivElement;
  setActiveRoute(route: ScreenRoute): void;
  setMonetarySearchMode(isMonetary: boolean): void;
}

export function createHeader(options: HeaderOptions): HeaderHandles {
  const header = document.createElement('header');
  header.className = 'app-header';

  const nav = document.createElement('nav');
  nav.className = 'app-nav';

  const brand = document.createElement('div');
  brand.className = 'brand';

  const searchArea = document.createElement('div');
  searchArea.className = 'search-area';

  const searchForm = document.createElement('form');
  searchForm.className = 'search-form';
  searchForm.setAttribute('role', 'search');

  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.name = 'global-search';
  searchInput.id = 'global-search';
  searchInput.placeholder = 'Search projects, invoices, documents…';
  searchInput.autocomplete = 'off';

  const dialogHost = document.createElement('div');
  dialogHost.className = 'search-dialog-host';

  searchForm.append(searchInput);
  searchArea.append(searchForm, dialogHost);

  const navActions = document.createElement('div');
  navActions.className = 'nav-actions';

  const homeButton = document.createElement('button');
  homeButton.type = 'button';
  homeButton.className = 'home-button';
  homeButton.textContent = 'Home';

  const resultsButton = document.createElement('button');
  resultsButton.type = 'button';
  resultsButton.dataset.route = 'results';
  resultsButton.textContent = 'Results';

  const settingsButton = document.createElement('button');
  settingsButton.type = 'button';
  settingsButton.dataset.route = 'settings';
  settingsButton.textContent = 'Settings';

  navActions.append(homeButton, resultsButton, settingsButton);
  nav.append(brand, searchArea, navActions);
  header.append(nav);

  searchInput.addEventListener('input', () => {
    options.onSearchChange(searchInput.value);
  });

  searchInput.addEventListener('focus', () => {
    options.onSearchFocus?.();
  });

  searchInput.addEventListener('blur', () => {
    options.onSearchBlur?.();
  });

  searchInput.addEventListener('keydown', (event) => {
    options.onSearchKeyDown?.(event);
  });

  searchForm.addEventListener('submit', (event) => {
    event.preventDefault();
    options.onSearchSubmit();
  });

  homeButton.addEventListener('click', () => {
    options.onHome();
  });

  navActions.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    const route = target.dataset.route as ScreenRoute | undefined;
    if (!route) {
      return;
    }

    options.onNavigate(route);
  });

  const setActiveRoute = (route: ScreenRoute) => {
    // Handle Home button
    const isHomeActive = route === 'home';
    homeButton.classList.toggle('is-active', isHomeActive);
    homeButton.setAttribute('aria-pressed', String(isHomeActive));

    // Handle other navigation buttons
    for (const button of navActions.querySelectorAll<HTMLButtonElement>('button[data-route]')) {
      const isActive = button.dataset.route === route;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }
  };

  const setMonetarySearchMode = (isMonetary: boolean) => {
    searchForm.classList.toggle('monetary-search', isMonetary);
    searchInput.classList.toggle('monetary-search', isMonetary);
  };

  return {
    element: header,
    searchInput,
    dialogHost,
    setActiveRoute,
    setMonetarySearchMode,
  };
}
