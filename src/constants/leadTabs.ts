/**
 * Lead Detail Tabs Configuration
 * Central configuration for lead detail screen tabs
 */

export enum LeadTabKey {
  INFO = 'info',
  QUOTATIONS = 'quotations',
  DOCUMENTS = 'documents',
  TIMELINE = 'timeline',
}

export interface LeadTab {
  key: LeadTabKey;
  title: string;
  enabled: boolean;
  comingSoon?: boolean;
}

export const LEAD_TABS: LeadTab[] = [
  {
    key: LeadTabKey.INFO,
    title: 'Info',
    enabled: true,
  },
  {
    key: LeadTabKey.QUOTATIONS,
    title: 'Quotations',
    enabled: false,
    comingSoon: true,
  },
  {
    key: LeadTabKey.DOCUMENTS,
    title: 'Documents',
    enabled: true,
  },
  // {
  //   key: LeadTabKey.TIMELINE,
  //   title: 'Timeline',
  //   enabled: true,
  //   comingSoon: true,
  // },
];

export const DEFAULT_TAB_KEY = LeadTabKey.INFO;
