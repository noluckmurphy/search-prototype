import { settingsStore } from '../state/settingsStore';
import { formatEntityType } from '../utils/format';
import { SearchEntityType } from '../types';

export interface SettingsViewHandles {
  element: HTMLElement;
  render(): void;
}

export function createSettingsView(): SettingsViewHandles {
  const container = document.createElement('section');
  container.className = 'settings-view';

  const heading = document.createElement('header');
  heading.innerHTML = `
    <h1>Prototype Settings</h1>
    <p>Adjust prototype behaviors. Changes save to the browser local storage and reload the experience.</p>
  `;

  const form = document.createElement('form');
  form.className = 'settings-form';

  const delayField = document.createElement('div');
  delayField.className = 'settings-field';
  delayField.innerHTML = `
    <label for="search-delay">Simulated search delay (ms)</label>
  `;

  const delayInput = document.createElement('input');
  delayInput.id = 'search-delay';
  delayInput.type = 'number';
  delayInput.min = '0';
  delayInput.step = '10';

  delayField.append(delayInput);

  const groupSection = document.createElement('fieldset');
  groupSection.className = 'settings-group';
  groupSection.innerHTML = `
    <legend>Mini results group sizes</legend>
  `;

  const groupFields = document.createElement('div');
  groupFields.className = 'settings-group__grid';
  groupSection.append(groupFields);

  const actions = document.createElement('div');
  actions.className = 'settings-actions';

  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.className = 'primary';
  saveButton.textContent = 'Save & Reload';

  const resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'secondary';
  resetButton.textContent = 'Restore defaults';

  actions.append(saveButton, resetButton);

  form.append(delayField, groupSection, actions);
  container.append(heading, form);

  const groupInputs = new Map<string, HTMLInputElement>();

  const renderGroupInputs = (groupLimits: Record<string, number>) => {
    groupFields.innerHTML = '';
    groupInputs.clear();

    Object.entries(groupLimits).forEach(([key, value]) => {
      const field = document.createElement('label');
      field.className = 'settings-field';
      field.htmlFor = `group-${key}`;

      const title = document.createElement('span');
      title.textContent = formatEntityType(key as SearchEntityType, { plural: true });

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '1';
      input.step = '1';
      input.id = `group-${key}`;
      input.value = String(value);

      field.append(title, input);
      groupFields.append(field);
      groupInputs.set(key, input);
    });
  };

  const render = () => {
    const state = settingsStore.getState();
    delayInput.value = String(state.searchDelayMs);
    renderGroupInputs(state.groupLimits);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nextDelay = Number.parseInt(delayInput.value, 10);
    const resolvedDelay = Number.isFinite(nextDelay) && nextDelay >= 0 ? nextDelay : 0;

    const groupLimits: Record<string, number> = {};
    groupInputs.forEach((input, key) => {
      const parsed = Number.parseInt(input.value, 10);
      groupLimits[key] = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    });

    settingsStore.update({
      searchDelayMs: resolvedDelay,
      groupLimits,
    });

    window.location.reload();
  });

  resetButton.addEventListener('click', () => {
    settingsStore.reset();
    render();
    window.location.reload();
  });

  render();

  return {
    element: container,
    render,
  };
}
