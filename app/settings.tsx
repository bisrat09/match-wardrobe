import React from "react";
import { View, Text, Button, Alert } from "react-native";
import { router } from "expo-router";
import { clearAllGarments, updateAllGarmentsWithMultipleDressCodes } from "~/lib/db";

export default function SettingsScreen() {
  const handleClearAll = () => {
    Alert.alert(
      "Clear All Garments",
      "This will delete all your garments and wear history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllGarments();
              Alert.alert("Success", "All garments have been cleared.");
            } catch (error: any) {
              Alert.alert("Error", error?.message ?? "Failed to clear garments");
            }
          }
        }
      ]
    );
  };

  const handleUpdateDressCodes = async () => {
    try {
      const result = await updateAllGarmentsWithMultipleDressCodes();
      Alert.alert(
        "Success!", 
        `Updated ${result.updated} garments with multiple dress codes. Now try switching between casual/business/sport modes!`
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to update garments");
    }
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <Text style={{ fontSize:22, fontWeight:"600" }}>Settings</Text>
      
      <View style={{ flexDirection:"row", gap:12, marginTop:12, justifyContent:"center" }}>
        <Button title="Today" onPress={() => router.push('/')} />
        <Button title="Closet" onPress={() => router.push('/closet')} />
      </View>
      
      <Text style={{ marginTop: 16, color:"#444" }}>
        (Later) Set location, default dress code, repeat window, notifications…
      </Text>
      
      <View style={{ marginTop: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: "500", marginBottom: 16 }}>Development</Text>
        
        <View style={{ gap: 12 }}>
          <Button 
            title="Fix Dress Codes (One-Time Fix)" 
            onPress={handleUpdateDressCodes}
            color="#007AFF"
          />
          
          <Button 
            title="Clear All Garments" 
            onPress={handleClearAll}
            color="#FF3B30"
          />
        </View>
      </View>
    </View>
  );
}