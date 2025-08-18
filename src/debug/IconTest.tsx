import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';

const IconTest = () => {
  const testIcons = [
    'magnify',
    'search',
    'search-web',
    'close',
    'clear',
    'close-circle',
    'close-circle-outline',
    'account-search',
    'file-search',
    'home-search',
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Icon Test</Text>
      {testIcons.map((iconName) => (
        <View key={iconName} style={styles.iconRow}>
          <IconButton
            icon={iconName}
            size={24}
            onPress={() => console.log(`${iconName} pressed`)}
          />
          <Text style={styles.iconLabel}>{iconName}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  iconLabel: {
    marginLeft: 10,
    fontSize: 16,
  },
});

export default IconTest;
