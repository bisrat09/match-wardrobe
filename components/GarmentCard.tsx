import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import type { Garment } from "~/lib/types";

export default function GarmentCard({ garment }: { garment: Garment }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: garment.imageUri }} style={styles.img}/>
      <Text style={styles.name}>{garment.name ?? garment.type}</Text>
      <Text style={styles.meta}>{garment.colors.join(", ")} · w{garment.warmth}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex:1, backgroundColor:"#fff", borderRadius:12, borderWidth:1, borderColor:"#eee", padding:8 },
  img: { width: "100%", aspectRatio: 1, borderRadius: 8, backgroundColor:"#f2f2f2" },
  name: { marginTop: 6, fontWeight:"600" },
  meta: { marginTop: 2, fontSize:12, color:"#666" }
});