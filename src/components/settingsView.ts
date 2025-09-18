import { settingsStore, LineItemBehavior } from '../state/settingsStore';
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

  // Overall Settings Section
  const overallSection = document.createElement('fieldset');
  overallSection.className = 'settings-group';
  overallSection.innerHTML = `
    <legend>Overall</legend>
  `;

  const delayField = document.createElement('div');
  delayField.className = 'settings-field';
  delayField.innerHTML = `
    <label for="search-delay">Simulated search delay mean (ms)</label>
  `;

  const delayInput = document.createElement('input');
  delayInput.id = 'search-delay';
  delayInput.type = 'number';
  delayInput.min = '0';
  delayInput.step = '10';

  delayField.append(delayInput);
  overallSection.append(delayField);

  const varianceField = document.createElement('div');
  varianceField.className = 'settings-field';
  varianceField.innerHTML = `
    <label for="search-delay-variance">Search delay variance (ms)</label>
  `;

  const varianceInput = document.createElement('input');
  varianceInput.id = 'search-delay-variance';
  varianceInput.type = 'number';
  varianceInput.min = '0';
  varianceInput.step = '1';

  varianceField.append(varianceInput);
  overallSection.append(varianceField);

  const recentSearchesField = document.createElement('div');
  recentSearchesField.className = 'settings-field';
  recentSearchesField.innerHTML = `
    <label for="recent-searches-limit">Recent searches to display</label>
  `;

  const recentSearchesSelect = document.createElement('select');
  recentSearchesSelect.id = 'recent-searches-limit';
  recentSearchesSelect.innerHTML = `
    <option value="3">3 searches</option>
    <option value="5">5 searches</option>
    <option value="7">7 searches</option>
    <option value="10">10 searches</option>
    <option value="15">15 searches</option>
  `;

  recentSearchesField.append(recentSearchesSelect);
  overallSection.append(recentSearchesField);

  // Full Results Page Settings Section
  const resultsSection = document.createElement('fieldset');
  resultsSection.className = 'settings-group';
  resultsSection.innerHTML = `
    <legend>Full Results Page</legend>
  `;


  const lineItemBehaviorField = document.createElement('div');
  lineItemBehaviorField.className = 'settings-field';
  lineItemBehaviorField.innerHTML = `
    <label for="line-item-behavior">Line item behavior on results page</label>
  `;

  const lineItemBehaviorSelect = document.createElement('select');
  lineItemBehaviorSelect.id = 'line-item-behavior';
  lineItemBehaviorSelect.innerHTML = `
    <option value="show-matched-only">Show only matched line items</option>
    <option value="show-matched-with-context-1">Show matched line items with 1 additional line of context before/after</option>
    <option value="show-matched-with-context-2">Show matched line items with 2 additional lines of context before/after</option>
    <option value="show-matched-with-context-3">Show matched line items with 3 additional lines of context before/after</option>
    <option value="show-matched-with-context-5">Show matched line items with 5 additional lines of context before/after</option>
    <option value="show-all-always">Always show all line items</option>
    <option value="hide-all-always">Always hide all line items, including matched</option>
  `;

  lineItemBehaviorField.append(lineItemBehaviorSelect);
  resultsSection.append(lineItemBehaviorField);

  const collapseLineItemsField = document.createElement('div');
  collapseLineItemsField.className = 'settings-field settings-field--checkbox';

  const collapseLineItemsCheckbox = document.createElement('input');
  collapseLineItemsCheckbox.id = 'collapse-irrelevant-line-items';
  collapseLineItemsCheckbox.type = 'checkbox';

  const collapseLineItemsLabel = document.createElement('label');
  collapseLineItemsLabel.htmlFor = 'collapse-irrelevant-line-items';
  collapseLineItemsLabel.textContent = 'Collapse irrelevant line items between results (shows "..." for large gaps between matches)';

  collapseLineItemsField.append(collapseLineItemsCheckbox, collapseLineItemsLabel);
  resultsSection.append(collapseLineItemsField);

  const collapseThresholdField = document.createElement('div');
  collapseThresholdField.className = 'settings-field';
  collapseThresholdField.innerHTML = `
    <label for="line-items-collapse-threshold">Collapse threshold</label>
  `;

  const collapseThresholdSelect = document.createElement('select');
  collapseThresholdSelect.id = 'line-items-collapse-threshold';
  collapseThresholdSelect.innerHTML = `
    <option value="3">3 items</option>
    <option value="5">5 items</option>
    <option value="7">7 items</option>
    <option value="10">10 items</option>
  `;

  collapseThresholdField.append(collapseThresholdSelect);
  resultsSection.append(collapseThresholdField);

  const maxFacetValuesField = document.createElement('div');
  maxFacetValuesField.className = 'settings-field';
  maxFacetValuesField.innerHTML = `
    <label for="max-facet-values">Max facet values to show</label>
  `;

  const maxFacetValuesSelect = document.createElement('select');
  maxFacetValuesSelect.id = 'max-facet-values';
  maxFacetValuesSelect.innerHTML = `
    <option value="3">3 values</option>
    <option value="5">5 values</option>
    <option value="7">7 values</option>
    <option value="10">10 values</option>
    <option value="15">15 values</option>
    <option value="20">20 values</option>
    <option value="0">Show all</option>
  `;

  maxFacetValuesField.append(maxFacetValuesSelect);
  resultsSection.append(maxFacetValuesField);

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

  form.append(overallSection, resultsSection, groupSection, actions);
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
    varianceInput.value = String(state.searchDelayVarianceMs);
    recentSearchesSelect.value = String(state.recentSearchesDisplayLimit);
    lineItemBehaviorSelect.value = state.lineItemBehavior;
    collapseLineItemsCheckbox.checked = state.collapseIrrelevantLineItems;
    collapseThresholdSelect.value = String(state.lineItemsCollapseThreshold);
    maxFacetValuesSelect.value = String(state.maxFacetValues);
    renderGroupInputs(state.groupLimits);
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const nextDelay = Number.parseInt(delayInput.value, 10);
    const resolvedDelay = Number.isFinite(nextDelay) && nextDelay >= 0 ? nextDelay : 0;

    const nextVariance = Number.parseInt(varianceInput.value, 10);
    const resolvedVariance = Number.isFinite(nextVariance) && nextVariance >= 0 ? nextVariance : 10;

    const collapseThreshold = Number.parseInt(collapseThresholdSelect.value, 10);
    const resolvedCollapseThreshold = Number.isFinite(collapseThreshold) && collapseThreshold >= 0 ? collapseThreshold : 5;

    const maxFacetValues = Number.parseInt(maxFacetValuesSelect.value, 10);
    const resolvedMaxFacetValues = Number.isFinite(maxFacetValues) && maxFacetValues >= 0 ? maxFacetValues : 5;

    const recentSearchesLimit = Number.parseInt(recentSearchesSelect.value, 10);
    const resolvedRecentSearchesLimit = Number.isFinite(recentSearchesLimit) && recentSearchesLimit >= 0 ? recentSearchesLimit : 5;

    const groupLimits: Record<string, number> = {};
    groupInputs.forEach((input, key) => {
      const parsed = Number.parseInt(input.value, 10);
      groupLimits[key] = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    });

    settingsStore.update({
      searchDelayMs: resolvedDelay,
      searchDelayVarianceMs: resolvedVariance,
      lineItemBehavior: lineItemBehaviorSelect.value as LineItemBehavior,
      collapseIrrelevantLineItems: collapseLineItemsCheckbox.checked,
      lineItemsCollapseThreshold: resolvedCollapseThreshold,
      maxFacetValues: resolvedMaxFacetValues,
      recentSearchesDisplayLimit: resolvedRecentSearchesLimit,
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
