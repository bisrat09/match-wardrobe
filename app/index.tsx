import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity, SafeAreaView, RefreshControl, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { getAllGarments, updateWear } from "~/lib/db";
import { suggestOutfits } from "~/lib/rules";
import { fetchWeather, getLocationOrAsk } from "~/lib/weather";
import type { Garment, DressCode } from "~/lib/types";

// Color palette - Burnt Orange Theme
const colors = {
  primary: "#EA580C",      // Burnt orange
  accent: "#C2410C",       // Dark orange
  background: "#FFFFFF",   // White
  text: "#333333",         // Dark gray
  secondary: "#F0F0F0",    // Light gray
  lightText: "#666666",    // Medium gray
  success: "#EA580C",      // Burnt orange for wear button
  border: "#E5E5E5"        // Light border
};

export default function TodayScreen() {
  const [garments, setGarments] = useState<Garment[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [dressCode, setDressCode] = useState<DressCode>("casual");
  const [outfits, setOutfits] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Load garments first (safer, local operation)
      try {
        const data = await getAllGarments();
        setGarments(data);
      } catch (dbError: any) {
        console.error("Database error:", dbError);
        setGarments([]); // Fallback to empty array
      }
      
      // Set default weather immediately to prevent crashes
      setWeather({ tempC: 20, chanceOfRain: 0.1, windKph: 8, isSnow: false });
      
      // Try to get real weather in background (don't block UI)
      setTimeout(async () => {
        try {
          const loc = await getLocationOrAsk();
          const w = await fetchWeather(loc.latitude, loc.longitude);
          setWeather(w);
        } catch (e: any) {
          console.log("Weather fetch failed, using defaults:", e.message);
          // Keep default weather, no alert on startup
        }
      }, 1000);
      
    } catch (error: any) {
      console.error("Load data error:", error);
      // Set safe defaults
      setGarments([]);
      setWeather({ tempC: 20, chanceOfRain: 0.1, windKph: 8, isSnow: false });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const build = () => {
    if (!weather) return;
    const res = suggestOutfits(garments, weather, { dressCode, daysNoRepeat: 2 }, 3);
    setOutfits(res);
  };

  const shuffleOutfit = (index: number) => {
    if (!weather) return;
    
    const currentOutfit = outfits[index];
    const cleanGarments = garments.filter(g => !g.isDirty && g.dressCodes.includes(dressCode));
    
    const tops = cleanGarments.filter(g => g.type === "top");
    const bottoms = cleanGarments.filter(g => g.type === "bottom");
    const shoes = cleanGarments.filter(g => g.type === "shoe");
    
    let newTop = currentOutfit.top;
    let newBottom = currentOutfit.bottom;
    let newShoe = currentOutfit.shoe;
    
    const differentTops = tops.filter(t => t.id !== currentOutfit.top.id);
    const differentBottoms = bottoms.filter(b => b.id !== currentOutfit.bottom.id);
    const differentShoes = shoes.filter(s => s.id !== currentOutfit.shoe.id);
    
    const changeTop = Math.random() > 0.3 && differentTops.length > 0;
    const changeBottom = Math.random() > 0.3 && differentBottoms.length > 0;
    const changeShoe = Math.random() > 0.3 && differentShoes.length > 0;
    
    if (!changeTop && !changeBottom && !changeShoe) {
      if (differentTops.length > 0) {
        newTop = differentTops[Math.floor(Math.random() * differentTops.length)];
      } else if (differentBottoms.length > 0) {
        newBottom = differentBottoms[Math.floor(Math.random() * differentBottoms.length)];
      } else if (differentShoes.length > 0) {
        newShoe = differentShoes[Math.floor(Math.random() * differentShoes.length)];
      }
    } else {
      if (changeTop && differentTops.length > 0) {
        newTop = differentTops[Math.floor(Math.random() * differentTops.length)];
      }
      if (changeBottom && differentBottoms.length > 0) {
        newBottom = differentBottoms[Math.floor(Math.random() * differentBottoms.length)];
      }
      if (changeShoe && differentShoes.length > 0) {
        newShoe = differentShoes[Math.floor(Math.random() * differentShoes.length)];
      }
    }
    
    const newOutfit = {
      top: newTop,
      bottom: newBottom,
      shoe: newShoe,
      outerwear: currentOutfit.outerwear
    };
    
    setOutfits(prev => {
      const updated = [...prev];
      updated[index] = newOutfit;
      return updated;
    });
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
        "🎉 Outfit Worn!", 
        "Great choice! Your outfit has been logged. Clothing items are now in your laundry basket (shoes stay clean).",
        [
          { text: "Perfect!", onPress: () => load() }
        ]
      );
    } catch (error: any) {
      console.error("Wear outfit error:", error);
      Alert.alert(
        "Oops! Something went wrong", 
        "We couldn't log your outfit right now. Please try again in a moment.",
        [
          { text: "Try Again", onPress: () => handleWearOutfit(outfit) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (garments.length && weather) build(); }, [garments, weather, dressCode]);

  const dressCodes: DressCode[] = ["casual", "smart_casual", "business", "sport"];

  const onRefresh = () => {
    load(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your wardrobe...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.navButton} onPress={() => router.push('/closet')}>
            <Text style={styles.navIcon}>☰</Text>
            <Text style={styles.navLabel}>Closet</Text>
          </TouchableOpacity>
          
          <Text style={styles.title}>Today</Text>
          
          <TouchableOpacity style={styles.navButton} onPress={() => router.push('/settings')}>
            <Text style={styles.navIcon}>⚙</Text>
            <Text style={styles.navLabel}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Weather Card */}
        {weather && (
          <View style={styles.weatherCard}>
            <View style={styles.weatherMain}>
              <Text style={styles.weatherTemp}>🌤 {Math.round(weather.tempC)}°C / {Math.round(weather.tempC * 9/5 + 32)}°F</Text>
            </View>
            <View style={styles.weatherDetails}>
              <Text style={styles.weatherDetail}>💧 Rain: {(weather.chanceOfRain*100)|0}%</Text>
              <Text style={styles.weatherDetail}>🌬 Wind: {weather.windKph}kph</Text>
            </View>
          </View>
        )}

        {/* Dress Code Selector */}
        <View style={styles.dressCodeContainer}>
          <Text style={styles.sectionLabel}>👔 Dress Code</Text>
          <View style={styles.segmentedControl}>
            {dressCodes.map((code) => (
              <TouchableOpacity
                key={code}
                style={[
                  styles.segment,
                  dressCode === code && styles.segmentActive
                ]}
                onPress={() => setDressCode(code)}
              >
                <Text style={[
                  styles.segmentText,
                  dressCode === code && styles.segmentTextActive
                ]}>
                  {code.replace('_', ' ').split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Outfit Suggestions */}
        {outfits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No outfits available</Text>
            <Text style={styles.emptySubtext}>Add more items or try a different dress code</Text>
          </View>
        ) : (
          outfits.map((outfit, index) => (
            <SuggestionCard
              key={index}
              outfit={outfit}
              number={index + 1}
              onWear={() => handleWearOutfit(outfit)}
              onShuffle={() => shuffleOutfit(index)}
              onDetails={() => {
                router.push({
                  pathname: '/outfit-detail',
                  params: {
                    outfit: JSON.stringify(outfit),
                    weather: JSON.stringify(weather),
                    dressCode: dressCode
                  }
                });
              }}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SuggestionCard({ outfit, number, onWear, onShuffle, onDetails }: any) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Suggestion #{number}</Text>
        <TouchableOpacity onPress={onDetails}>
          <Text style={styles.detailsLink}>Details ↗</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.garmentRow}>
        <GarmentPreview label="Top" uri={outfit.top.imageUri} />
        <GarmentPreview label="Bottom" uri={outfit.bottom.imageUri} />
        <GarmentPreview label="Shoes" uri={outfit.shoe.imageUri} />
      </View>

      {outfit.outerwear && (
        <View style={styles.outerwearRow}>
          <GarmentPreview label="Outerwear" uri={outfit.outerwear.imageUri} />
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.shuffleButton} onPress={onShuffle}>
          <Text style={styles.shuffleText}>🔄 Shuffle</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.wearButton} onPress={onWear}>
          <Text style={styles.wearText}>Wear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function GarmentPreview({ label, uri }: { label: string; uri?: string }) {
  return (
    <View style={styles.garmentPreview}>
      {uri ? (
        <Image source={{ uri }} style={styles.garmentImage} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.garmentImage, styles.garmentPlaceholder]} />
      )}
      <Text style={styles.garmentLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
  },
  navButton: {
    alignItems: "center",
    padding: 8,
  },
  navIcon: {
    fontSize: 20,
    color: colors.accent,
  },
  navLabel: {
    fontSize: 11,
    color: colors.accent,
    marginTop: 2,
  },
  
  // Weather Card
  weatherCard: {
    backgroundColor: colors.secondary,
    borderRadius: 16,
    padding: 16,
    margin: 16,
    marginBottom: 8,
  },
  weatherMain: {
    marginBottom: 8,
  },
  weatherTemp: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  weatherDetails: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weatherDetail: {
    fontSize: 14,
    color: colors.lightText,
  },
  
  // Dress Code Selector
  dressCodeContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.lightText,
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: colors.secondary,
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    color: colors.lightText,
    fontWeight: "500",
  },
  segmentTextActive: {
    color: colors.background,
    fontWeight: "600",
  },
  
  // Suggestion Cards
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    margin: 16,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  detailsLink: {
    fontSize: 14,
    color: colors.accent,
  },
  
  // Garment Preview
  garmentRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  outerwearRow: {
    alignItems: "center",
    marginBottom: 12,
  },
  garmentPreview: {
    alignItems: "center",
  },
  garmentImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    marginBottom: 6,
  },
  garmentPlaceholder: {
    backgroundColor: colors.secondary,
  },
  garmentLabel: {
    fontSize: 12,
    color: colors.lightText,
  },
  
  // Action Buttons
  actionRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    paddingHorizontal: "12.5%", // Reduces button width by 25%
  },
  shuffleButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  shuffleText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  wearButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  wearText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.background,
  },
  
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.lightText,
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.lightText,
    textAlign: "center",
  },
});