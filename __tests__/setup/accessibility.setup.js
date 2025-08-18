/**
 * Accessibility Testing Setup
 * Configures jest-axe for accessibility violations testing
 */

import { configureAxe } from 'jest-axe';

// Configure axe for React Native
const axe = configureAxe({
  rules: {
    // Disable rules that don't apply to React Native
    'color-contrast': { enabled: false },
    'image-alt': { enabled: false },
    'landmark-one-main': { enabled: false },
    'page-has-heading-one': { enabled: false },
    region: { enabled: false },

    // Enable important mobile accessibility rules
    'aria-allowed-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    'duplicate-id': { enabled: true },
    'focusable-content': { enabled: true },
    label: { enabled: true },
    'link-name': { enabled: true },
    list: { enabled: true },
    listitem: { enabled: true },
    'nested-interactive': { enabled: true },
    'valid-lang': { enabled: true },
  },
});

export default axe;
