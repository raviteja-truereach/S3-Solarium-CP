module.exports = {
  setInternetCredentials: jest.fn().mockResolvedValue(true),
  getInternetCredentials: jest.fn().mockResolvedValue(false),
  resetInternetCredentials: jest.fn().mockResolvedValue(true),
  ACCESS_CONTROL: {
    WHEN_UNLOCKED: 'WhenUnlocked',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED: 'WhenUnlocked',
  },
};
