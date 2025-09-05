import React from "react";
import { View, Text } from "react-native";

export default function SettingsScreen() {
  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:22, fontWeight:"600" }}>Settings</Text>
      <Text style={{ marginTop: 8, color:"#444" }}>
        (Later) Set location, default dress code, repeat window, notifications…
      </Text>
    </View>
  );
}