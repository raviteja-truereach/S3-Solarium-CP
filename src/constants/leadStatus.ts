/**
 * Lead Status Constants
 * Valid lead statuses as per the system status matrix
 */

export const LEAD_STATUSES = [
  'New Lead',
  'In Discussion',
  'Physical Meeting Assigned',
  'Customer Accepted',
  'Won',
  'Pending at Solarium',
  'Under Execution',
  'Executed',
  'Not Responding',
  'Not Interested',
  'Other Territory',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Terminal statuses - leads in these states are considered closed
 */
export const TERMINAL_STATUSES: LeadStatus[] = [
  'Executed',
  'Not Responding',
  'Not Interested',
  'Other Territory',
];

/**
 * Active statuses - leads still in progress
 */
export const ACTIVE_STATUSES: LeadStatus[] = LEAD_STATUSES.filter(
  (status) => !TERMINAL_STATUSES.includes(status)
);

/**
 * Status colors for UI display
 */
export const STATUS_COLORS: Record<LeadStatus, string> = {
  'New Lead': '#007AFF',
  'In Discussion': '#FF9500',
  'Physical Meeting Assigned': '#5856D6',
  'Customer Accepted': '#30B0C7',
  Won: '#34C759',
  'Pending at Solarium': '#FFCC00',
  'Under Execution': '#FF6B35',
  Executed: '#34C759',
  'Not Responding': '#8E8E93',
  'Not Interested': '#FF3B30',
  'Other Territory': '#8E8E93',
};

/**
 * Status transition matrix - defines sequential flow and terminal states
 */
export const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  'New Lead': [
    'In Discussion',
    'Not Responding',
    'Not Interested',
    'Other Territory',
  ],
  'In Discussion': [
    'Physical Meeting Assigned',
    'Not Responding',
    'Not Interested',
    'Other Territory',
  ],
  'Physical Meeting Assigned': [
    'Customer Accepted',
    'Not Responding',
    'Not Interested',
    'Other Territory',
  ],
  'Customer Accepted': [
    'Won',
    'Not Responding',
    'Not Interested',
    'Other Territory',
  ],
  Won: [
    'Pending at Solarium',
    'Not Responding',
    'Not Interested',
    'Other Territory',
  ],
  'Pending at Solarium': [
    'Under Execution',
    'Not Responding',
    'Not Interested',
    'Other Territory',
  ],
  'Under Execution': [
    'Executed',
    'Not Responding',
    'Not Interested',
    'Other Territory',
  ],
  Executed: [], // Terminal state
  'Not Responding': [], // Terminal state
  'Not Interested': [], // Terminal state
  'Other Territory': [], // Terminal state
};

/**
 * Status-specific field requirements
 */
export const STATUS_FIELD_REQUIREMENTS: Record<LeadStatus, string[]> = {
  'New Lead': [],
  'In Discussion': [],
  'Physical Meeting Assigned': [],
  'Customer Accepted': [],
  Won: ['quotationRef'],
  'Pending at Solarium': ['quotationRef'],
  'Under Execution': ['tokenNumber'],
  Executed: ['tokenNumber'],
  'Not Responding': [],
  'Not Interested': [],
  'Other Territory': [],
};

/**
 * Statuses that require follow-up dates
 */
export const FOLLOW_UP_REQUIRED_STATUSES: LeadStatus[] = [
  'In Discussion',
  'Physical Meeting Assigned',
  'Customer Accepted',
  'Pending at Solarium',
];

/**
 * Maximum follow-up days allowed
 */
export const MAX_FOLLOW_UP_DAYS = 30;

/**
 * Minimum remarks length
 */
export const MIN_REMARKS_LENGTH = 10;
