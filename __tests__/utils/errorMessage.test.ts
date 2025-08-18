/**
 * Error Message Utility Tests
 */
import {
  getFriendlyMessage,
  shouldAutoLogout,
  shouldShowToast,
} from '@utils/errorMessage';

describe('Error Message Utilities', () => {
  describe('getFriendlyMessage', () => {
    it('should return correct message for known status codes', () => {
      expect(getFriendlyMessage(400)).toBe(
        'Invalid request. Please check your input and try again.'
      );
      expect(getFriendlyMessage(401)).toBe(
        'Your session has expired. Please log in again.'
      );
      expect(getFriendlyMessage(404)).toBe(
        'The requested resource was not found.'
      );
      expect(getFriendlyMessage(500)).toBe(
        'Something went wrong on our end. Please try again later.'
      );
    });

    it('should return correct message for network errors', () => {
      expect(getFriendlyMessage('FETCH_ERROR')).toBe(
        'Network error. Please check your internet connection.'
      );
      expect(getFriendlyMessage('TIMEOUT_ERROR')).toBe(
        'Request timed out. Please try again.'
      );
    });

    it('should return generic message for unknown status codes', () => {
      expect(getFriendlyMessage(999)).toBe(
        'Something went wrong. Please try again.'
      );
      expect(getFriendlyMessage('UNKNOWN')).toBe(
        'Something went wrong. Please try again.'
      );
    });

    it('should handle 4xx range errors', () => {
      expect(getFriendlyMessage(418)).toBe(
        'There was an issue with your request. Please try again.'
      );
    });

    it('should handle 5xx range errors', () => {
      expect(getFriendlyMessage(550)).toBe(
        'Server error. Please try again later.'
      );
    });
  });

  describe('shouldAutoLogout', () => {
    it('should return true for 401 and 403', () => {
      expect(shouldAutoLogout(401)).toBe(true);
      expect(shouldAutoLogout(403)).toBe(true);
    });

    it('should return false for other status codes', () => {
      expect(shouldAutoLogout(400)).toBe(false);
      expect(shouldAutoLogout(404)).toBe(false);
      expect(shouldAutoLogout(500)).toBe(false);
      expect(shouldAutoLogout('FETCH_ERROR')).toBe(false);
    });
  });

  describe('shouldShowToast', () => {
    it('should return false for auth errors (they trigger logout)', () => {
      expect(shouldShowToast(401)).toBe(false);
      expect(shouldShowToast(403)).toBe(false);
    });

    it('should return true for other errors', () => {
      expect(shouldShowToast(400)).toBe(true);
      expect(shouldShowToast(404)).toBe(true);
      expect(shouldShowToast(500)).toBe(true);
      expect(shouldShowToast('FETCH_ERROR')).toBe(true);
    });
  });
});
