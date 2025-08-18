/**
 * Lead Model Tests
 * Basic tests for runtime type guards and enum functionality
 */
import {
  Lead,
  LeadStatus,
  LeadPriority,
  SyncStatus,
  isLead,
  assertLead,
  isTerminalStatus,
  getValidNextStatuses,
} from '../../models/LeadModel';

describe('LeadModel', () => {
  const validLead: Lead = {
    id: 'test-lead-1',
    status: LeadStatus.NEW_LEAD,
    priority: LeadPriority.HIGH,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
    sync_status: SyncStatus.SYNCED,
    local_changes: '{}',
  };

  describe('isLead type guard', () => {
    it('should return true for valid lead', () => {
      expect(isLead(validLead)).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(isLead(null)).toBe(false);
      expect(isLead(undefined)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(isLead({})).toBe(false);
      expect(isLead({ id: 'test' })).toBe(false); // missing other required fields
    });

    it('should return false for invalid field types', () => {
      expect(isLead({ ...validLead, id: 123 })).toBe(false);
      expect(isLead({ ...validLead, priority: 'invalid' })).toBe(false);
    });
  });

  describe('assertLead', () => {
    it('should not throw for valid lead', () => {
      expect(() => assertLead(validLead)).not.toThrow();
    });

    it('should throw for invalid lead', () => {
      expect(() => assertLead({})).toThrow('Invalid Lead object');
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for terminal statuses', () => {
      expect(isTerminalStatus(LeadStatus.EXECUTED)).toBe(true);
      expect(isTerminalStatus(LeadStatus.NOT_RESPONDING)).toBe(true);
      expect(isTerminalStatus(LeadStatus.NOT_INTERESTED)).toBe(true);
      expect(isTerminalStatus(LeadStatus.OTHER_TERRITORY)).toBe(true);
    });

    it('should return false for non-terminal statuses', () => {
      expect(isTerminalStatus(LeadStatus.NEW_LEAD)).toBe(false);
      expect(isTerminalStatus(LeadStatus.IN_DISCUSSION)).toBe(false);
      expect(isTerminalStatus(LeadStatus.WON)).toBe(false);
    });
  });

  describe('getValidNextStatuses', () => {
    it('should return correct next statuses for New Lead', () => {
      const nextStatuses = getValidNextStatuses(LeadStatus.NEW_LEAD);
      expect(nextStatuses).toContain(LeadStatus.IN_DISCUSSION);
      expect(nextStatuses).toContain(LeadStatus.PHYSICAL_MEETING_ASSIGNED);
    });

    it('should return empty array for terminal statuses', () => {
      expect(getValidNextStatuses(LeadStatus.EXECUTED)).toEqual([]);
      expect(getValidNextStatuses(LeadStatus.NOT_RESPONDING)).toEqual([]);
    });
  });
});
