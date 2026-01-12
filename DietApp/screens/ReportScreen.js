import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { LineChart, PieChart, ProgressChart } from 'react-native-chart-kit';
import axios from 'axios';
import { auth } from '../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ThemeContext';

export default function ReportScreen() {
  const { theme } = useTheme();
  const SERVER_IP = '192.168.1.108'; // IP adresi güncellendi
  const API_URL = `http://${SERVER_IP}:8000`;
  const screenWidth = Dimensions.get("window").width;

  const [weeklyData, setWeeklyData] = useState(null);
  const [macroData, setMacroData] = useState(null);
  const [goalData, setGoalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchAllData();
    }, [])
  );

  const fetchAllData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Haftalık trend verisi
      const weeklyRes = await axios.get(`${API_URL}/istatistik-haftalik/${user.uid}`);
      if (weeklyRes.data.success) {
        setWeeklyData({
          labels: weeklyRes.data.labels,
          datasets: [{ data: weeklyRes.data.data.map(d => d || 0) }] // 0 değerlerini göster
        });
      }

      // Makro dağılım
      const macroRes = await axios.get(`${API_URL}/makro-dagilim/${user.uid}`);
      if (macroRes.data.success) {
        const { protein, karbonhidrat, yag } = macroRes.data;

        // Pie chart için veri hazırla
        if (protein > 0 || karbonhidrat > 0 || yag > 0) {
          setMacroData([
            {
              name: 'Protein',
              population: protein,
              color: '#3498db',
              legendFontColor: '#7f8c8d',
              legendFontSize: 14
            },
            {
              name: 'Karbonhidrat',
              population: karbonhidrat,
              color: '#f39c12',
              legendFontColor: '#7f8c8d',
              legendFontSize: 14
            },
            {
              name: 'Yağ',
              population: yag,
              color: '#e74c3c',
              legendFontColor: '#7f8c8d',
              legendFontSize: 14
            }
          ]);
        }
      }

      // Hedef özeti
      const goalRes = await axios.get(`${API_URL}/hedef-ozeti/${user.uid}`);
      if (goalRes.data.success) {
        setGoalData(goalRes.data);
      }

    } catch (error) {
      console.log("Rapor yükleme hatası:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Raporlar yükleniyor...</Text>
      </View>
    );
  }

  // Progress bar için yüzdeleri hesapla
  const calculateProgress = () => {
    if (!goalData) return { data: [0, 0, 0, 0] };

    const { hedef, gerceklesen } = goalData;

    return {
      labels: ["Kalori", "Protein", "Karb", "Yağ"],
      data: [
        Math.min(gerceklesen.kalori / hedef.kalori, 1),
        Math.min(gerceklesen.protein / hedef.protein, 1),
        Math.min(gerceklesen.karbonhidrat / hedef.karbonhidrat, 1),
        Math.min(gerceklesen.yag / hedef.yag, 1)
      ]
    };
  };

  const chartConfig = {
    backgroundColor: "#fff",
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "5", strokeWidth: "2", stroke: "#e74c3c" }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#e74c3c']} />
      }
    >
      <View style={[styles.header, { backgroundColor: theme.cardBg }]}>
        <Text style={[styles.title, { color: theme.text }]}>📊 Raporlarım</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Son 7 günlük analiz</Text>
      </View>

      {/* Haftalık Kalori Trend */}
      {weeklyData && (
        <View style={[styles.section, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📈 Haftalık Kalori Trendi</Text>
          <View style={[styles.chartContainer, { backgroundColor: theme.cardBg }]}>
            <LineChart
              data={weeklyData}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                ...chartConfig,
                backgroundGradientFrom: "#ff7675",
                backgroundGradientTo: "#e74c3c",
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </View>
      )}

      {/* Bugünkü Hedef Progress */}
      {goalData && (
        <View style={[styles.section, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🎯 Bugünkü Hedef İlerlemesi</Text>
          <View style={[styles.chartContainer, { backgroundColor: theme.cardBg }]}>
            <ProgressChart
              data={calculateProgress()}
              width={screenWidth - 40}
              height={220}
              strokeWidth={16}
              radius={32}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1, index) => {
                  const colors = ['#e74c3c', '#3498db', '#f39c12', '#9b59b6'];
                  return colors[index] || `rgba(231, 76, 60, ${opacity})`;
                }
              }}
              hideLegend={false}
              style={styles.chart}
            />
          </View>

          {/* Detaylı Hedef Bilgileri */}
          <View style={[styles.goalDetails, { backgroundColor: theme.cardBg }]}>
            <View style={styles.goalRow}>
              <Text style={[styles.goalLabel, { color: theme.text }]}>🔥 Kalori:</Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>
                {goalData.gerceklesen.kalori} / {goalData.hedef.kalori} kal
              </Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={[styles.goalLabel, { color: theme.text }]}>💪 Protein:</Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>
                {goalData.gerceklesen.protein}g / {goalData.hedef.protein}g
              </Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={[styles.goalLabel, { color: theme.text }]}>🍞 Karbonhidrat:</Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>
                {goalData.gerceklesen.karbonhidrat}g / {goalData.hedef.karbonhidrat}g
              </Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={[styles.goalLabel, { color: theme.text }]}>🥑 Yağ:</Text>
              <Text style={[styles.goalValue, { color: theme.text }]}>
                {goalData.gerceklesen.yag}g / {goalData.hedef.yag}g
              </Text>
            </View>
            {goalData.gerceklesen.yakilan > 0 && (
              <View style={styles.goalRow}>
                <Text style={[styles.goalLabel, { color: theme.text }]}>🏃 Yakılan:</Text>
                <Text style={[styles.goalValue, { color: '#27ae60' }]}>
                  {goalData.gerceklesen.yakilan} kal
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Makro Dağılım Pie Chart */}
      {macroData && (
        <View style={[styles.section, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🥗 Bugünkü Makro Dağılımı</Text>
          <View style={[styles.chartContainer, { backgroundColor: theme.cardBg }]}>
            <PieChart
              data={macroData}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
              style={styles.chart}
            />
          </View>
        </View>
      )}

      {/* İstatistik Kartları */}
      {weeklyData && (
        <View style={[styles.statsSection, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 Haftalık Özet</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.background }]}>
              <Ionicons name="flame" size={30} color="#e74c3c" />
              <Text style={styles.statVal}>
                {Math.round(weeklyData.datasets[0].data.reduce((a, b) => a + b, 0) / 7)}
              </Text>
              <Text style={styles.statLabel}>Ort. Kalori</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.background }]}>
              <Ionicons name="trending-up" size={30} color="#3498db" />
              <Text style={styles.statVal}>
                {Math.max(...weeklyData.datasets[0].data)}
              </Text>
              <Text style={styles.statLabel}>En Yüksek</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.background }]}>
              <Ionicons name="trending-down" size={30} color="#27ae60" />
              <Text style={styles.statVal}>
                {Math.min(...weeklyData.datasets[0].data.filter(d => d > 0))}
              </Text>
              <Text style={styles.statLabel}>En Düşük</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.background }]}>
              <Ionicons name="fitness" size={30} color="#9b59b6" />
              <Text style={styles.statVal}>
                {goalData?.gerceklesen?.yakilan || 0}
              </Text>
              <Text style={styles.statLabel}>Yakılan (Bugün)</Text>
            </View>
          </View>
        </View>
      )}

      {/* Boş veri durumu */}
      {!weeklyData && !macroData && (
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={80} color="#bdc3c7" />
          <Text style={styles.emptyText}>Henüz veri yok</Text>
          <Text style={styles.emptySubtext}>
            Yemek eklediğinizde grafikler burada görünecek
          </Text>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa'
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f6fa'
  },
  loadingText: {
    marginTop: 10,
    color: '#7f8c8d',
    fontSize: 16
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  subtitle: {
    fontSize: 16,
    color: '#95a5a6',
    marginTop: 5
  },
  section: {
    marginTop: 20,
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 10
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8
  },
  goalDetails: {
    marginTop: 15,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1'
  },
  goalLabel: {
    fontSize: 16,
    color: '#34495e',
    fontWeight: '500'
  },
  goalValue: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: 'bold'
  },
  statsSection: {
    marginTop: 20,
    paddingHorizontal: 10
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  statVal: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 10
  },
  statLabel: {
    color: '#7f8c8d',
    marginTop: 5,
    fontSize: 14
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginTop: 20
  },
  emptySubtext: {
    fontSize: 14,
    color: '#95a5a6',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40
  }
});