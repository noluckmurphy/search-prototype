export interface ShortcutPillOptions {
  onFocus?: () => void;
}

export interface ShortcutPillHandles {
  element: HTMLElement;
}

// Detect OS to show the correct shortcut
function detectOS(): 'mac' | 'windows' | 'linux' | 'other' {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('mac')) {
    return 'mac';
  } else if (userAgent.includes('win')) {
    return 'windows';
  } else if (userAgent.includes('linux')) {
    return 'linux';
  }
  
  return 'other';
}

// Get the appropriate shortcut display based on OS
function getShortcutDisplay(os: 'mac' | 'windows' | 'linux' | 'other'): string {
  switch (os) {
    case 'mac':
      return '⌘K';
    case 'windows':
    case 'linux':
      return 'Ctrl+K';
    case 'other':
      return '⌘K';
    default:
      return '⌘K';
  }
}

// Get tooltip text based on OS
function getTooltipText(os: 'mac' | 'windows' | 'linux' | 'other'): string {
  switch (os) {
    case 'mac':
      return 'Press / or ⌘K to focus search';
    case 'windows':
    case 'linux':
      return 'Press / or Ctrl+K to focus search';
    case 'other':
      return 'Press / or ⌘K to focus search';
    default:
      return 'Press / or ⌘K to focus search';
  }
}

export function createShortcutPill(options: ShortcutPillOptions = {}): ShortcutPillHandles {
  const os = detectOS();
  const shortcutDisplay = getShortcutDisplay(os);
  const tooltipText = getTooltipText(os);

  const pill = document.createElement('div');
  pill.className = 'shortcut-pill';
  pill.setAttribute('title', tooltipText);
  pill.setAttribute('aria-label', tooltipText);
  pill.setAttribute('role', 'img');
  
  // Create the shortcut key elements
  const keys = shortcutDisplay.split('+');
  keys.forEach((key, index) => {
    if (index > 0) {
      const plus = document.createElement('span');
      plus.className = 'shortcut-pill__plus';
      plus.textContent = '+';
      pill.appendChild(plus);
    }
    
    const keyElement = document.createElement('kbd');
    keyElement.className = 'shortcut-pill__key';
    keyElement.textContent = key;
    pill.appendChild(keyElement);
  });

  return {
    element: pill,
  };
}
