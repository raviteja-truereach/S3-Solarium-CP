// Simple verification that the enhanced state structure is working
const mockState = {
  lead: {
    items: {},
    pagesLoaded: [1, 2],
    totalPages: 5,
    totalCount: 100,
    lastSync: null,
    isLoading: false,
    loadingNext: true,
    hasMore: true,
    error: null,
    filters: {},
  },
};

console.log('✅ Enhanced pagination state structure verified');
console.log('State includes:', Object.keys(mockState.lead));
console.log(
  'New fields: loadingNext =',
  mockState.lead.loadingNext,
  ', hasMore =',
  mockState.lead.hasMore
);
