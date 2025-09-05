import React, { useEffect, useState } from "react";
import { View, Text, Button, FlatList, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { addGarment, getAllGarments } from "~/lib/db";
import type { Garment, ClothingType } from "~/lib/types";
import GarmentCard from "~/components/GarmentCard";

export default function ClosetScreen() {
  const [items, setItems] = useState<Garment[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => setItems(await getAllGarments());
  useEffect(() => { load(); }, []);

  const add = async () => {
    const img = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (img.canceled) return;
    const quick: Partial<Garment> = {
      type: "top" as ClothingType,
      colors: ["white"],
      warmth: 1, waterResistant: 0, dressCodes: ["casual"],
      imageUri: img.assets[0].uri
    };
    setBusy(true);
    try {
      await addGarment(quick as any);
      await load();
    } catch(e:any) {
      Alert.alert("Add", e?.message ?? "Failed to add");
    } finally { setBusy(false); }
  };

  return (
    <View style={{ flex:1, padding:16 }}>
      <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
        <Text style={{ fontSize:22, fontWeight:"600" }}>Closet</Text>
        <Button title={busy ? "Adding..." : "Add"} onPress={add} disabled={busy}/>
      </View>
      <FlatList
        data={items}
        keyExtractor={(g)=>g.id}
        numColumns={2}
        columnWrapperStyle={{ gap:12 }}
        contentContainerStyle={{ gap:12, paddingTop:12 }}
        renderItem={({ item }) => <GarmentCard garment={item} />}
      />
    </View>
  );
}