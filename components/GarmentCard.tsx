import React from "react";
import { View, Image, Text, StyleSheet, TouchableOpacity } from "react-native";
import type { Garment } from "~/lib/types";

interface GarmentCardProps {
  garment: Garment;
  onLongPress?: () => void;
  onPress?: () => void;
}

export default function GarmentCard({ garment, onLongPress, onPress }: GarmentCardProps) {
  return (
    <TouchableOpacity 
      style={[styles.card, garment.isDirty && styles.dirtyCard]}
      onLongPress={onLongPress}
      onPress={onPress}
      delayLongPress={500}
      activeOpacity={0.7}
    >
      <Image source={{ uri: garment.imageUri }} style={styles.img}/>
      {garment.isDirty && (
        <View style={styles.dirtyBadge}>
          <Text style={styles.dirtyText}>🧺</Text>
        </View>
      )}
      <Text style={styles.name}>{garment.name ?? garment.type}</Text>
      <Text style={styles.meta}>
        {garment.colors.join(", ")} · w{garment.warmth}
        {garment.isDirty && " · dirty"}
      </Text>
      <Text style={styles.hint}>Long press to edit</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flex:1, backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:"#eee", padding:8, position: "relative" },
  dirtyCard: { borderColor: "#ff6b6b", backgroundColor: "#fff5f5" },
  img: { width: "100%", aspectRatio: 1, borderRadius: 8, backgroundColor:"#f2f2f2" },
  dirtyBadge: { 
    position: "absolute", 
    top: 4, 
    right: 4, 
    backgroundColor: "#ff6b6b", 
    borderRadius: 12, 
    width: 24, 
    height: 24, 
    alignItems: "center", 
    justifyContent: "center",
    zIndex: 1
  },
  dirtyText: { fontSize: 12 },
  name: { marginTop: 6, fontWeight:"600" },
  meta: { marginTop: 2, fontSize:12, color:"#666" },
  hint: { marginTop: 4, fontSize: 10, color: "#007AFF", fontStyle: "italic", textAlign: "center" }
});