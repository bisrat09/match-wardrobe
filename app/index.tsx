import React, { useEffect, useState } from "react";
import { View, Text, Button, ScrollView, Image, StyleSheet, Alert } from "react-native";
import { getAllGarments } from "~/lib/db";
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

  useEffect(() => { load(); }, []);
  useEffect(() => { if (garments.length && weather) build(); }, [garments, weather, dressCode]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Today</Text>
      <View style={styles.weatherRow}>
        <Text style={styles.weatherText}>
          {weather ? `${Math.round(weather.tempC)}°C · Rain ${(weather.chanceOfRain*100)|0}% · Wind ${weather.windKph}kph`
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
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>Suggestion #{i+1}</Text>
          <View style={styles.row}>
            <ItemPreview label="Top" uri={o.top.imageUri}/>
            <ItemPreview label="Bottom" uri={o.bottom.imageUri}/>
            {o.outerwear ? <ItemPreview label="Outer" uri={o.outerwear.imageUri}/> : null}
            <ItemPreview label="Shoes" uri={o.shoe.imageUri}/>
          </View>
          <View style={styles.btnRow}>
            <Button title="Wear" onPress={() => Alert.alert("Wear", "Log wear (todo: implement in db)")} />
            <Button title="Shuffle" onPress={() => setOutfits(prev => [...prev.slice(1), prev[0]])} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ItemPreview({ label, uri }: { label: string; uri?: string }) {
  return (
    <View style={{ alignItems:"center", marginRight: 12 }}>
      {uri ? <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 8, backgroundColor:"#eee" }}/>
           : <View style={{ width:72, height:72, borderRadius:8, backgroundColor:"#eee" }}/>}    
      <Text style={{ marginTop: 6, fontSize: 12, color:"#555" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "600" },
  weatherRow: { marginTop: 8, flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  weatherText: { fontSize: 14, color:"#333" },
  card: { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor:"#fafafa", borderWidth:1, borderColor:"#eee" },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection:"row", alignItems:"center" },
  btnRow: { marginTop: 8, flexDirection:"row", gap: 8, justifyContent:"flex-end" }
});