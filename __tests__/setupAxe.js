import { configureAxe, toHaveNoViolations } from 'jest-axe';

// Configure jest-axe for critical accessibility testing
configureAxe({
  rules: {
    // Critical rules for mobile apps
    'color-contrast': { enabled: true },
    'focus-management': { enabled: true },
    'keyboard-access': { enabled: true },
    'screen-reader': { enabled: true },
    'touch-target-size': { enabled: true },

    // Disable rules not applicable to React Native
    'html-has-lang': { enabled: false },
    'page-has-heading-one': { enabled: false },
    region: { enabled: false },
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
});

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Global accessibility test helpers
global.testAccessibility = async (component) => {
  const { container } = component;
  const results = await axe(container);
  expect(results).toHaveNoViolations();
};
