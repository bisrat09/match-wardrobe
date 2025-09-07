import React, { useEffect, useState } from "react";
import { View, Text, Button, ScrollView, Image, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { getAllGarments, updateWear } from "~/lib/db";
import { suggestOutfits } from "~/lib/rules";
import { fetchWeather, getLocationOrAsk } from "~/lib/weather";
import type { Garment, DressCode } from "~/lib/types";

export default function TodayScreen() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [dressCode, setDressCode] = useState<DressCode>("casual");
  const [outfits, setOutfits] = useState<any[]>([]);

  const load = async () => {
    const data = await getAllGarments();
    setGarments(data);
    try {
      const loc = await getLocationOrAsk();
      const w = await fetchWeather(loc.latitude, loc.longitude);
      setWeather(w);
    } catch (e: any) {
      Alert.alert("Weather", e?.message ?? "Failed to fetch weather; using defaults.");
      setWeather({ tempC: 20, chanceOfRain: 0.1, windKph: 8, isSnow: false });
    }
  };

  const build = () => {
    if (!weather) return;
    const res = suggestOutfits(garments, weather, { dressCode, daysNoRepeat: 2 }, 3);
    setOutfits(res);
  };

  const handleWearOutfit = async (outfit: any) => {
    const garmentIds = [
      outfit.top.id,
      outfit.bottom.id,
      outfit.shoe.id,
      ...(outfit.outerwear ? [outfit.outerwear.id] : [])
    ];
    
    try {
      await updateWear(garmentIds, { weather, dressCode });
      Alert.alert(
        "Outfit Logged!", 
        "This outfit has been marked as worn. Items are now marked as dirty.",
        [
          { text: "OK", onPress: () => load() } // Reload to update the data
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to log outfit");
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (garments.length && weather) build(); }, [garments, weather, dressCode]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Today</Text>
      
      <View style={styles.navRow}>
        <Button title="Closet" onPress={() => router.push('/closet')} />
        <Button title="Settings" onPress={() => router.push('/settings')} />
      </View>
      
      <View style={styles.weatherRow}>
        <Text style={styles.weatherText}>
          {weather ? `${Math.round(weather.tempC)}°C / ${Math.round(weather.tempC * 9/5 + 32)}°F · Rain ${(weather.chanceOfRain*100)|0}% · Wind ${weather.windKph}kph`
                   : "Loading weather..."}
        </Text>
        <Button title={`Mode: ${dressCode}`} onPress={() => {
          const order: DressCode[] = ["casual","smart_casual","business","sport"];
          const idx = order.indexOf(dressCode);
          setDressCode(order[(idx+1)%order.length]);
        }}/>
      </View>

      {outfits.length === 0 ? (
        <Text style={{ marginTop: 16 }}>No outfit yet. Add more items or relax constraints.</Text>
      ) : outfits.map((o, i) => (
        <TouchableOpacity 
          key={i} 
          activeOpacity={0.9}
          onPress={() => {
            router.push({
              pathname: '/outfit-detail',
              params: {
                outfit: JSON.stringify(o),
                weather: JSON.stringify(weather),
                dressCode: dressCode
              }
            });
          }}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Suggestion #{i+1}</Text>
              <Text style={styles.tapHint}>Tap to view details →</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              <View style={styles.row}>
                <ItemPreview label="Top" uri={o.top.imageUri}/>
                <ItemPreview label="Bottom" uri={o.bottom.imageUri}/>
                {o.outerwear ? <ItemPreview label="Outer" uri={o.outerwear.imageUri}/> : null}
                <ItemPreview label="Shoes" uri={o.shoe.imageUri}/>
              </View>
            </ScrollView>
            <View style={styles.btnRow}>
              <Button title="Wear" onPress={() => handleWearOutfit(o)} />
              <Button title="Shuffle" onPress={() => setOutfits(prev => [...prev.slice(1), prev[0]])} />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function ItemPreview({ label, uri }: { label: string; uri?: string }) {
  return (
    <View style={{ alignItems:"center", marginHorizontal: 8, marginVertical: 8 }}>
      {uri ? <Image source={{ uri }} style={{ width: 120, height: 120, borderRadius: 12, backgroundColor:"#eee" }}/>
           : <View style={{ width:120, height:120, borderRadius:12, backgroundColor:"#eee" }}/>}    
      <Text style={{ marginTop: 8, fontSize: 14, color:"#333", fontWeight: "500" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "600" },
  navRow: { marginTop: 12, flexDirection:"row", gap: 12, justifyContent:"center" },
  weatherRow: { marginTop: 8, flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  weatherText: { fontSize: 14, color:"#333" },
  card: { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor:"#fafafa", borderWidth:1, borderColor:"#eee" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  tapHint: { fontSize: 12, color: "#007AFF", fontStyle: "italic" },
  row: { flexDirection:"row", alignItems:"center" },
  btnRow: { marginTop: 8, flexDirection:"row", gap: 8, justifyContent:"flex-end" }
});