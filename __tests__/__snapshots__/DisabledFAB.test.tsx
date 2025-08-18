/**
 * Disabled FAB Visual Tests
 * Snapshot tests for disabled FAB appearance
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import FloatingActionButton from '../../src/components/common/FloatingActionButton';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <PaperProvider>{children}</PaperProvider>
);

describe('DisabledFAB Snapshots', () => {
  it('matches snapshot for enabled FAB', () => {
    const tree = render(
      <TestWrapper>
        <FloatingActionButton disabled={false} />
      </TestWrapper>
    ).toJSON();

    expect(tree).toMatchSnapshot();
  });

  it('matches snapshot for disabled FAB', () => {
    const tree = render(
      <TestWrapper>
        <FloatingActionButton disabled={true} />
      </TestWrapper>
    ).toJSON();

    expect(tree).toMatchSnapshot();
  });
});
