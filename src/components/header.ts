import { ScreenRoute } from '../types';
import { createShortcutPill } from './shortcutPill';

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
  
  const logoLink = document.createElement('button');
  logoLink.type = 'button';
  logoLink.className = 'logo-link';
  logoLink.setAttribute('aria-label', 'Go to Home');
  
  const logoSvg = document.createElement('div');
  logoSvg.className = 'logo-svg';
  logoSvg.innerHTML = `<svg id="btLogoIcon" aria-label="Logo SVG" fill="none" viewBox="0 0 78 97" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M32.058 18.013H15.706V.026H0V49.726c0 17.513 14.198 31.71 31.711 31.71 17.514 0 31.711-14.198 31.711-31.711 0-17.398-14.01-31.525-31.364-31.712Zm-.347 47.67c-8.813 0-15.958-7.145-15.958-15.958 0-8.814 7.145-15.958 15.958-15.958 8.814 0 15.958 7.144 15.958 15.958 0 8.813-7.144 15.958-15.958 15.958Z" fill="#001A43"></path><path d="m54.336 9.411-3.19 5.524c12.206 6.823 20.46 19.87 20.46 34.846 0 22.033-17.861 39.895-39.895 39.895-7.48 0-14.477-2.06-20.46-5.641l-3.188 5.523A46.004 46.004 0 0 0 31.71 96.07C57.235 96.07 78 75.305 78 49.781c0-17.311-9.554-32.43-23.664-40.37Z" fill="#00D8D8"></path></svg>`;
  
  logoLink.appendChild(logoSvg);
  brand.appendChild(logoLink);

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

  const searchIcon = document.createElement('i');
  searchIcon.className = 'search-icon';
  searchIcon.setAttribute('data-lucide', 'search');

  // Create shortcut pill
  const shortcutPill = createShortcutPill();
  shortcutPill.element.className += ' search-shortcut-pill';

  const dialogHost = document.createElement('div');
  dialogHost.className = 'search-dialog-host';

  searchForm.append(searchIcon, searchInput, shortcutPill.element);
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
    // Hide shortcut pill when search input is focused
    shortcutPill.element.style.display = 'none';
    options.onSearchFocus?.();
  });

  searchInput.addEventListener('blur', () => {
    // Show shortcut pill when search input loses focus
    shortcutPill.element.style.display = 'inline-flex';
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

  logoLink.addEventListener('click', () => {
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
