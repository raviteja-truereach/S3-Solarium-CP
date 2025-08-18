/**
 * ErrorBoundary Tests
 * Unit tests for error boundary component
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ErrorBoundary } from '@components/common/ErrorBoundary';

// Create a component that throws an error
const ThrowErrorComponent: React.FC<{ shouldThrow: boolean }> = ({
  shouldThrow,
}) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <Text testID="normal-content">Normal content</Text>;
};

// Mock RNRestart
const mockRestart = jest.fn();
jest.mock('react-native-restart', () => ({
  default: {
    restart: mockRestart,
  },
}));

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  it('should render children when no error occurs', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByTestId('normal-content')).toBeTruthy();
  });

  it('should render fallback UI when error occurs', () => {
    const { getByText, getByTestId } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByTestId('restart-button')).toBeTruthy();
    expect(getByTestId('try-again-button')).toBeTruthy();
  });

  it('should render custom fallback when provided', () => {
    const customFallback = (
      <Text testID="custom-fallback">Custom Error UI</Text>
    );

    const { getByTestId } = render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByTestId('custom-fallback')).toBeTruthy();
  });

  it('should log error details when error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(mockConsoleError).toHaveBeenCalledWith(
      'ErrorBoundary caught an error:',
      expect.objectContaining({
        error: 'Test error message',
        stack: expect.any(String),
        componentStack: expect.any(String),
        timestamp: expect.any(String),
      })
    );
  });

  it('should call RNRestart.restart when restart button is pressed', async () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const restartButton = getByTestId('restart-button');
    fireEvent.press(restartButton);

    await waitFor(() => {
      expect(mockRestart).toHaveBeenCalled();
    });
  });

  it('should reset error state when try again button is pressed', async () => {
    const TestComponent = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      React.useEffect(() => {
        const timer = setTimeout(() => setShouldThrow(false), 100);
        return () => clearTimeout(timer);
      }, []);

      return <ThrowErrorComponent shouldThrow={shouldThrow} />;
    };

    const { getByTestId, queryByText } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    // Should show error UI initially
    expect(getByTestId('try-again-button')).toBeTruthy();

    // Press try again
    fireEvent.press(getByTestId('try-again-button'));

    // Error UI should be gone
    await waitFor(() => {
      expect(queryByText('Something went wrong')).toBeNull();
    });
  });

  it('should handle restart failure gracefully', async () => {
    mockRestart.mockImplementationOnce(() => {
      throw new Error('Restart failed');
    });

    const { getByTestId } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const restartButton = getByTestId('restart-button');

    // Should not crash when restart fails
    expect(() => fireEvent.press(restartButton)).not.toThrow();
  });

  it('should show error details in development mode', () => {
    // Mock __DEV__ to true
    (global as any).__DEV__ = true;

    const { getByText } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Error Details (Debug)')).toBeTruthy();
    expect(getByText('Test error message')).toBeTruthy();
  });

  it('should have correct accessibility properties', () => {
    const { getByTestId } = render(
      <ErrorBoundary>
        <ThrowErrorComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const restartButton = getByTestId('restart-button');
    const tryAgainButton = getByTestId('try-again-button');

    expect(restartButton.props.accessibilityRole).toBe('button');
    expect(restartButton.props.accessibilityLabel).toBe('Restart App');
    expect(tryAgainButton.props.accessibilityRole).toBe('button');
    expect(tryAgainButton.props.accessibilityLabel).toBe('Try Again');
  });

  it('should handle missing RNRestart gracefully', () => {
    // Mock RNRestart to not be available
    jest.doMock('react-native-restart', () => {
      throw new Error('Module not found');
    });

    // This should not crash the test
    expect(() => {
      render(
        <ErrorBoundary>
          <ThrowErrorComponent shouldThrow={false} />
        </ErrorBoundary>
      );
    }).not.toThrow();
  });
});
