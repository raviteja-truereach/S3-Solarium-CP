describe('Floating Action Button', () => {
  it('renders disabled FAB', async () => {
    const mockLeads = generateMockLeads(5);
    const store = createMockStore(mockLeads);

    render(
      <TestWrapper store={store}>
        <MyLeadsScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    await waitFor(() => {
      const fab = screen.getByTestId('add-lead-fab');
      expect(fab).toBeTruthy();
      expect(fab.props.accessibilityLabel).toBe('Add Lead – disabled');
    });
  });

  it('does not navigate when FAB is pressed (disabled)', async () => {
    const mockLeads = generateMockLeads(5);
    const store = createMockStore(mockLeads);

    render(
      <TestWrapper store={store}>
        <MyLeadsScreen navigation={mockNavigation as any} />
      </TestWrapper>
    );

    await waitFor(() => {
      const fab = screen.getByTestId('add-lead-fab');
      fireEvent.press(fab);
      // Should not call navigation
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });
});
