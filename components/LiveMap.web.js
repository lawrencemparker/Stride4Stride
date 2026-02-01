// components/LiveMap.web.js (WEB VERSION)
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LiveMap() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🗺️</Text>
      <Text style={styles.text}>Live GPS Map</Text>
      <Text style={styles.subText}>(Visible on Phone Only)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center' },
  text: { color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 5 },
  subText: { color: '#666', fontSize: 14 }
});