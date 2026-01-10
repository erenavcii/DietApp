import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../firebaseConfig'; 
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { signOut } from 'firebase/auth'; 
import { useFocusEffect } from '@react-navigation/native'; 

export default function ProfileScreen({ navigation }) { 
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Düzenleme Modalı İçin
  const [modalVisible, setModalVisible] = useState(false);
  const [newWeight, setNewWeight] = useState('');

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
    if(!newWeight) return;
    const kg = parseFloat(newWeight);
    if(isNaN(kg) || kg < 30 || kg > 300) {
        Alert.alert("Hata", "Geçerli bir kilo giriniz.");
        return;
    }

    try {
        const user = auth.currentUser;
        const docRef = doc(db, "users", user.uid);
        
        // Yeni su hedefini de hesapla (Kilo x 0.033 litre)
        const newWaterTarget = Math.round(kg * 0.033 * 10) / 10;

        await updateDoc(docRef, {
            kilo: newWeight,
            su_hedefi: newWaterTarget
        });

        Alert.alert("Güncellendi ✅", `Yeni kilon: ${newWeight}kg\nYeni su hedefin: ${newWaterTarget} Lt`);
        setModalVisible(false);
        fetchUserData(); // Ekranı yenile
    } catch (error) {
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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons 
            name={userData?.cinsiyet === 'female' ? "woman" : "man"} 
            size={50} 
            color="#fff" 
          />
        </View>
        <Text style={styles.name}>{userData?.ad_soyad || 'Kullanıcı'}</Text>
        <Text style={styles.email}>{userData?.email || auth.currentUser?.email}</Text>
        
        <View style={styles.tagContainer}>
          <Text style={styles.tagText}>{userData?.hedef_kalori} kcal Hedef ({userData?.plan_tipi || 'Özel'})</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        {/* KİLO KUTUSU - TIKLANABİLİR YAPTIK */}
        <TouchableOpacity style={styles.statBox} onPress={() => setModalVisible(true)}>
          <View style={{flexDirection:'row', alignItems:'center'}}>
             <Text style={styles.statNumber}>{userData?.kilo || '-'}</Text>
             <Ionicons name="pencil" size={14} color="#3498db" style={{marginLeft:4}} />
          </View>
          <Text style={styles.statLabel}>Kilo (kg)</Text>
        </TouchableOpacity>

        <View style={styles.statLine} />
        
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{userData?.boy || '-'}</Text>
          <Text style={styles.statLabel}>Boy (cm)</Text>
        </View>
        
        <View style={styles.statLine} />
        
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{userData?.yas || '-'}</Text>
          <Text style={styles.statLabel}>Yaş</Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <View style={styles.menuItem}>
          <View style={[styles.menuIcon, {backgroundColor:'#e8f8f5'}]}>
             <Ionicons name="water-outline" size={22} color="#2ecc71" />
          </View>
          <View>
            <Text style={styles.menuText}>Su Hedefi</Text>
            <Text style={{fontSize:12, color:'#95a5a6'}}>{userData?.su_hedefi || 2.5} Litre (Kilona göre)</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.menuItem}>
          <View style={[styles.menuIcon, {backgroundColor:'#fef9e7'}]}>
             <Ionicons name="settings-outline" size={22} color="#f1c40f" />
          </View>
          <Text style={styles.menuText}>Ayarlar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
          <View style={[styles.menuIcon, {backgroundColor:'#fdedec'}]}>
             <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
          </View>
          <Text style={[styles.menuText, { color: '#e74c3c' }]}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>

      {/* KİLO GÜNCELLEME PENCERESİ (MODAL) */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Kilo Güncelle ⚖️</Text>
                <Text style={styles.modalSub}>Yeni kilonuzu giriniz:</Text>
                
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', padding: 30, backgroundColor: '#fff', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 5 },
  avatarContainer: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#34495e', justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation:5 },
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
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor:'#fff', padding: 15, borderRadius: 15, marginBottom: 10, elevation: 1 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, justifyContent:'center', alignItems:'center', marginRight: 15 },
  menuText: { fontSize: 16, color: '#34495e', fontWeight:'500' },

  // MODAL STİLLERİ
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', elevation: 5 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  modalSub: { color: '#7f8c8d', marginBottom: 15 },
  input: { width: '100%', backgroundColor: '#f5f6fa', padding: 15, borderRadius: 10, fontSize: 18, textAlign: 'center', marginBottom: 20, color: '#2c3e50', fontWeight:'bold' },
  modalButtons: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 15, backgroundColor: '#ecf0f1', borderRadius: 10, marginRight: 10, alignItems: 'center' },
  saveButton: { flex: 1, padding: 15, backgroundColor: '#3498db', borderRadius: 10, alignItems: 'center' },
  cancelButtonText: { color: '#7f8c8d', fontWeight: 'bold' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
});