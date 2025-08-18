import React from 'react';
import { render } from '@testing-library/react-native';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Text, View } from 'react-native';

expect.extend(toHaveNoViolations);

// Mock notification badge component
const NotificationBadge: React.FC<{ count: number }> = ({ count }) => (
  <View>
    <Text
      accessibilityLabel={`${count} unread notification${
        count !== 1 ? 's' : ''
      }`}
      accessibilityRole="text"
    >
      {count}
    </Text>
  </View>
);

describe('NotificationBadge Accessibility', () => {
  it('should have proper aria-label for unread count', async () => {
    const { getByLabelText } = render(<NotificationBadge count={5} />);

    const badge = getByLabelText('5 unread notifications');
    expect(badge).toBeTruthy();
  });

  it('should handle singular notification correctly', async () => {
    const { getByLabelText } = render(<NotificationBadge count={1} />);

    const badge = getByLabelText('1 unread notification');
    expect(badge).toBeTruthy();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<NotificationBadge count={3} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
