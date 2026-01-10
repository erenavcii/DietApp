import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import axios from 'axios';
import { auth } from '../firebaseConfig';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function ReportScreen() {
  const SERVER_IP = '172.20.10.2'; // IP ADRESİNİ YAZ
  const API_URL = `http://${SERVER_IP}:8000`;
  const screenWidth = Dimensions.get("window").width;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchReport();
    }, [])
  );

  const fetchReport = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const response = await axios.get(`${API_URL}/rapor/${user.uid}`);
      if (response.data.success) {
        setData({
          labels: response.data.labels,
          datasets: [{ data: response.data.data }]
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#e74c3c" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Haftalık Rapor 📈</Text>
        <Text style={styles.subtitle}>Son 7 günlük kalori değişimi</Text>
      </View>

      {data && (
        <View style={styles.chartContainer}>
            <LineChart
                data={data}
                width={screenWidth - 40}
                height={220}
                yAxisSuffix=""
                chartConfig={{
                backgroundColor: "#e74c3c",
                backgroundGradientFrom: "#ff7675",
                backgroundGradientTo: "#e74c3c",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: { r: "6", strokeWidth: "2", stroke: "#fff" }
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
            />
        </View>
      )}

      <View style={styles.statsRow}>
          <View style={styles.statCard}>
             <Ionicons name="flame" size={30} color="#e74c3c" />
             <Text style={styles.statVal}>
                {data ? Math.round(data.datasets[0].data.reduce((a, b) => a + b, 0) / 7) : 0}
             </Text>
             <Text style={styles.statLabel}>Ort. Kalori</Text>
          </View>
          <View style={styles.statCard}>
             <Ionicons name="trophy" size={30} color="#f1c40f" />
             <Text style={styles.statVal}>7</Text>
             <Text style={styles.statLabel}>Günlük Seri</Text>
          </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingTop: 50, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50' },
  subtitle: { fontSize: 16, color: '#95a5a6' },
  chartContainer: { alignItems: 'center', marginTop: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30, paddingHorizontal: 20 },
  statCard: { width: '45%', backgroundColor: '#f8f9fa', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 2 },
  statVal: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginTop: 10 },
  statLabel: { color: '#7f8c8d' },
});