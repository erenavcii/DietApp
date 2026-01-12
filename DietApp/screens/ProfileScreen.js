import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';

export default function ProfileScreen({ navigation }) {
  const { isDark, theme, toggleTheme } = useTheme();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Düzenleme Modalı İçin
  const [modalVisible, setModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');

  const activityLevels = {
    'low': { label: 'Düşük (Hareketsiz)', multiplier: 1.2 },
    'moderate': { label: 'Orta (Haftada 3-5 gün)', multiplier: 1.375 },
    'high': { label: 'Yüksek (Haftada 6-7 gün)', multiplier: 1.55 },
    'extreme': { label: 'Çok Yüksek (Günde 2 kez)', multiplier: 1.725 }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
    }, [])
  );

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
          setNewWeight(docSnap.data().kilo.toString()); // Mevcut kiloyu inputa koy
        }
      } catch (error) {
        console.log("Hata:", error);
      } finally {
        setLoading(false);
      }
    }
  };


  const updateWeight = async () => {
    if (!newWeight) return;
    const kg = parseFloat(newWeight);
    if (isNaN(kg) || kg < 30 || kg > 300) {
      Alert.alert("Hata", "Geçerli bir kilo giriniz.");
      return;
    }

    try {
      const user = auth.currentUser;
      const docRef = doc(db, "users", user.uid);

      // Kullanıcı verilerini al (boy, yaş, cinsiyet için)
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        Alert.alert("Hata", "Kullanıcı verileri bulunamadı.");
        return;
      }

      const currentData = docSnap.data();
      const boy = parseFloat(currentData.boy);
      const yas = parseInt(currentData.yas);
      const cinsiyet = currentData.cinsiyet;
      const activityLevel = currentData.activity_level || 'moderate';

      // BMR ve TDEE hesapla
      const multipliers = { 'low': 1.2, 'moderate': 1.375, 'high': 1.55, 'extreme': 1.725 };
      let bmr = (10 * kg) + (6.25 * boy) - (5 * yas) + (cinsiyet === 'male' ? 5 : -161);
      let tdee = Math.round(bmr * multipliers[activityLevel]);

      // Yeni su hedefini de hesapla (Kilo x 0.033 litre)
      const newWaterTarget = Math.round(kg * 0.033 * 10) / 10;

      await updateDoc(docRef, {
        kilo: kg,  // Number olarak kaydet
        su_hedefi: newWaterTarget,
        hedef_kalori: tdee  // ✅ Kalori hedefini de güncelle!
      });

      Alert.alert("Güncellendi ✅", `Yeni kilon: ${kg}kg\nYeni kalori hedefin: ${tdee} kcal\nYeni su hedefin: ${newWaterTarget} Lt`);
      setModalVisible(false);
      fetchUserData(); // Ekranı yenile
    } catch (error) {
      console.log("Güncelleme hatası:", error);
      Alert.alert("Hata", "Güncellenemedi.");
    }
  };


  const handleSignOut = () => {
    Alert.alert("Çıkış Yap", "Emin misin?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Evet, Çık",
        onPress: () => {
          signOut(auth)
            .then(() => console.log("Çıkış yapıldı"))
            .catch(error => Alert.alert("Hata", error.message));
        }
      }
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#e74c3c" /></View>;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.cardBg }]}>
        <View style={styles.avatarContainer}>
          <Ionicons
            name={userData?.cinsiyet === 'female' ? "woman" : "man"}
            size={50}
            color="#fff"
          />
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{userData?.ad_soyad || 'Kullanıcı'}</Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>{userData?.email || auth.currentUser?.email}</Text>

        <View style={styles.tagContainer}>
          <Text style={styles.tagText}>{userData?.hedef_kalori} kcal Hedef ({userData?.plan_tipi || 'Özel'})</Text>
        </View>
      </View>

      <View style={[styles.statsContainer, { backgroundColor: theme.cardBg }]}>
        {/* KİLO KUTUSU - TIKLANABİLİR YAPTIK */}
        <TouchableOpacity style={styles.statBox} onPress={() => setModalVisible(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.statNumber, { color: theme.text }]}>{userData?.kilo || '-'}</Text>
            <Ionicons name="pencil" size={14} color="#3498db" style={{ marginLeft: 4 }} />
          </View>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Kilo (kg)</Text>
        </TouchableOpacity>

        <View style={styles.statLine} />

        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{userData?.boy || '-'}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Boy (cm)</Text>
        </View>

        <View style={styles.statLine} />

        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{userData?.yas || '-'}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Yaş</Text>
        </View>
      </View>

      {/* HEDEF İLERLEMESİ */}
      {userData?.hedef_kilo && (
        <View style={[styles.goalProgressContainer, { backgroundColor: theme.cardBg }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={[styles.goalTitle, { color: theme.text }]}>🎯 Hedef İlerleme</Text>
            <Text style={styles.goalSubtitle}>
              {userData.kilo > userData.hedef_kilo ? 'Kilo Verme' : 'Kilo Alma'}
            </Text>
          </View>

          {(() => {
            const current = parseFloat(userData.kilo);
            const target = parseFloat(userData.hedef_kilo);
            const diff = Math.abs(current - target);
            const isLosing = current > target;
            const progress = isLosing
              ? Math.min((current - target) / (current - target + 10) * 100, 100)
              : Math.min((target - current) / (target - current + 10) * 100, 100);

            return (
              <>
                <View style={styles.goalProgressBar}>
                  <View style={[styles.goalProgressFill, { width: `${100 - diff * 10}%` }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={styles.goalText}>Şu an: {current}kg</Text>
                  <Text style={[styles.goalRemaining, { color: diff <= 2 ? '#27ae60' : '#e74c3c' }]}>
                    {diff <= 0.5 ? '✅ Hedefe ulaştın!' : `${diff.toFixed(1)}kg kaldı`}
                  </Text>
                  <Text style={styles.goalText}>Hedef: {target}kg</Text>
                </View>
              </>
            );
          })()}
        </View>
      )}

      <View style={styles.menuContainer}>
        <View style={[styles.menuItem, { backgroundColor: theme.cardBg }]}>
          <View style={[styles.menuIcon, { backgroundColor: '#e8f8f5' }]}>
            <Ionicons name="water-outline" size={22} color="#2ecc71" />
          </View>
          <View>
            <Text style={[styles.menuText, { color: theme.text }]}>Su Hedefi</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>{userData?.su_hedefi || 2.5} Litre (Kilona göre)</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.cardBg }]} onPress={toggleTheme}>
          <View style={[styles.menuIcon, { backgroundColor: isDark ? '#fff3cd' : '#2c3e50' }]}>
            <Ionicons name={isDark ? "sunny" : "moon"} size={22} color={isDark ? "#f1c40f" : "#fff"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuText, { color: theme.text }]}>Dark Mode</Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
              {isDark ? 'Açık' : 'Kapalı'}
            </Text>
          </View>
          <Ionicons name={isDark ? "toggle" : "toggle-outline"} size={32} color={isDark ? "#27ae60" : "#95a5a6"} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.cardBg }]} onPress={() => setSettingsModalVisible(true)}>
          <View style={[styles.menuIcon, { backgroundColor: '#fef9e7' }]}>
            <Ionicons name="settings-outline" size={22} color="#f1c40f" />
          </View>
          <Text style={[styles.menuText, { color: theme.text }]}>Ayarlar</Text>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: theme.cardBg }]} onPress={handleSignOut}>
          <View style={[styles.menuIcon, { backgroundColor: '#fdedec' }]}>
            <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
          </View>
          <Text style={[styles.menuText, { color: '#e74c3c' }]}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

      {/* KİLO GÜNCELLEME PENCERESİ (MODAL) */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Kilo Güncelle ⚖️</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>Yeni kilonuzu giriniz:</Text>

            <TextInput
              style={styles.input}
              value={newWeight}
              onChangeText={setNewWeight}
              keyboardType="numeric"
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={updateWeight}>
                <Text style={styles.saveButtonText}>Güncelle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AYARLAR MODALI */}
      <Modal animationType="slide" transparent={false} visible={settingsModalVisible} onRequestClose={() => setSettingsModalVisible(false)}>
        <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.settingsHeader, { backgroundColor: theme.cardBg }]}>
            <TouchableOpacity onPress={() => setSettingsModalVisible(false)} style={{ padding: 10 }}>
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.settingsTitle, { color: theme.text }]}>⚙️ Ayarlar</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Hesap Bilgileri */}
          <View style={[styles.settingsSection, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>📋 Hesap Bilgileri</Text>
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: theme.textSecondary }]}>Email:</Text>
              <Text style={[styles.settingsValue, { color: theme.text }]}>{userData?.email}</Text>
            </View>
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: theme.textSecondary }]}>Kayıt Tarihi:</Text>
              <Text style={[styles.settingsValue, { color: theme.text }]}>
                {userData?.olusturulma_tarihi?.toDate?.().toLocaleDateString('tr-TR') || 'Bilinmiyor'}
              </Text>
            </View>
          </View>

          {/* Aktivite Seviyesi */}
          <View style={[styles.settingsSection, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>🏃 Aktivite Seviyesi</Text>
            <Text style={[styles.settingsHelper, { color: theme.textSecondary }]}>
              Günlük kalori hedefinizi etkiler
            </Text>
            {Object.entries(activityLevels).map(([key, value]) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.activityOption,
                  {
                    backgroundColor: theme.background,
                    borderColor: userData?.activity_level === key ? '#3498db' : theme.border,
                    borderWidth: userData?.activity_level === key ? 2 : 1
                  }
                ]}
                onPress={async () => {
                  try {
                    const user = auth.currentUser;
                    const docRef = doc(db, "users", user.uid);

                    // TDEE'yi yeniden hesapla
                    const boy = parseFloat(userData.boy);
                    const kilo = parseFloat(userData.kilo);
                    const yas = parseInt(userData.yas);
                    const cinsiyet = userData.cinsiyet;

                    let bmr = (10 * kilo) + (6.25 * boy) - (5 * yas) + (cinsiyet === 'male' ? 5 : -161);
                    let tdee = Math.round(bmr * value.multiplier);

                    await updateDoc(docRef, {
                      activity_level: key,
                      hedef_kalori: tdee
                    });

                    Alert.alert("✅ Güncellendi", `Yeni kalori hedefin: ${tdee} kcal`);
                    fetchUserData();
                  } catch (error) {
                    Alert.alert("Hata", "Güncellenemedi.");
                  }
                }}
              >
                <Text style={[styles.activityLabel, { color: theme.text }]}>{value.label}</Text>
                {userData?.activity_level === key && (
                  <Ionicons name="checkmark-circle" size={20} color="#3498db" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Hedef Kilo */}
          <View style={[styles.settingsSection, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>🎯 Hedef Kilo</Text>
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: theme.textSecondary }]}>Mevcut Hedef:</Text>
              <Text style={[styles.settingsValue, { color: theme.text }]}>{userData?.hedef_kilo} kg</Text>
            </View>
            <TouchableOpacity
              style={[styles.changeButton, { backgroundColor: '#3498db' }]}
              onPress={() => {
                Alert.prompt(
                  "Hedef Kilo Değiştir",
                  "Yeni hedef kilonuzu girin:",
                  async (text) => {
                    const newTarget = parseFloat(text);
                    if (!isNaN(newTarget) && newTarget > 0) {
                      try {
                        const user = auth.currentUser;
                        await updateDoc(doc(db, "users", user.uid), {
                          hedef_kilo: newTarget
                        });
                        Alert.alert("✅ Güncellendi", `Yeni hedef: ${newTarget}kg`);
                        fetchUserData();
                      } catch (error) {
                        Alert.alert("Hata", "Güncellenemedi.");
                      }
                    }
                  },
                  'plain-text',
                  userData?.hedef_kilo?.toString()
                );
              }}
            >
              <Text style={styles.changeButtonText}>Hedef Kiloyu Değiştir</Text>
            </TouchableOpacity>
          </View>

          {/* Uygulama Hakkında */}
          <View style={[styles.settingsSection, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>ℹ️ Uygulama Hakkında</Text>
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: theme.textSecondary }]}>Versiyon:</Text>
              <Text style={[styles.settingsValue, { color: theme.text }]}>1.0.0</Text>
            </View>
            <View style={styles.settingsRow}>
              <Text style={[styles.settingsLabel, { color: theme.textSecondary }]}>Geliştirici:</Text>
              <Text style={[styles.settingsValue, { color: theme.text }]}>DietApp Team</Text>
            </View>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#34495e', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  email: { fontSize: 14, color: '#95a5a6', marginBottom: 10 },
  tagContainer: { backgroundColor: '#e74c3c', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20 },
  tagText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },

  statsContainer: { flexDirection: 'row', backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 20, justifyContent: 'space-around', alignItems: 'center', elevation: 2 },
  statBox: { alignItems: 'center', padding: 10 }, // Tıklama alanı genişlesin diye padding
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50' },
  statLabel: { color: '#95a5a6', fontSize: 12 },
  statLine: { width: 1, height: 30, backgroundColor: '#ecf0f1' },

  menuContainer: { paddingHorizontal: 20 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuText: { fontSize: 16, color: '#34495e', fontWeight: '500' },

  // HEDEF İLERLEME STİLLERİ
  goalProgressContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 20,
    elevation: 2
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  goalSubtitle: {
    fontSize: 12,
    color: '#95a5a6',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10
  },
  goalProgressBar: {
    height: 10,
    backgroundColor: '#ecf0f1',
    borderRadius: 5,
    overflow: 'hidden'
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 5
  },
  goalText: {
    fontSize: 12,
    color: '#7f8c8d'
  },
  goalRemaining: {
    fontSize: 14,
    fontWeight: 'bold'
  },

  // MODAL STİLLERİ
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  modalSub: { color: '#7f8c8d', marginBottom: 15 },
  input: { width: '100%', backgroundColor: '#f5f6fa', padding: 15, borderRadius: 10, fontSize: 18, textAlign: 'center', marginBottom: 20, color: '#2c3e50', fontWeight: 'bold' },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 15, backgroundColor: '#ecf0f1', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  saveButton: { flex: 1, padding: 15, backgroundColor: '#3498db', borderRadius: 10, alignItems: 'center' },
  cancelButtonText: { color: '#7f8c8d', fontWeight: 'bold' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },

  // SETTINGS MODAL STYLES
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1'
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  settingsSection: {
    margin: 15,
    padding: 15,
    borderRadius: 15,
    elevation: 2
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  settingsHelper: {
    fontSize: 12,
    marginBottom: 15,
    fontStyle: 'italic'
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6'
  },
  settingsLabel: {
    fontSize: 14
  },
  settingsValue: {
    fontSize: 14,
    fontWeight: '600'
  },
  activityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10
  },
  activityLabel: {
    fontSize: 14,
    flex: 1
  },
  changeButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10
  },
  changeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  }
});