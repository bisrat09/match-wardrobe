import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";

export default function MinimalTestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Closy Test Build 8</Text>
        <Text style={styles.subtitle}>Minimal version without database</Text>
        <Text style={styles.info}>If you can see this, the app launched!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#EA580C",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: "#666666",
    marginBottom: 20,
  },
  info: {
    fontSize: 16,
    color: "#333333",
    textAlign: "center",
  },
});