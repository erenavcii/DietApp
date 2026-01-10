import React, { useState, useCallback } from 'react';
import { Text, View, Image, TouchableOpacity, ActivityIndicator, Alert, ScrollView, SafeAreaView, StatusBar, Modal, TextInput, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons'; 
import { useFocusEffect } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '../firebaseConfig';
import { styles } from '../styles/styles';

export default function HomeScreen() {
  const SERVER_IP = '192.168.10.76'; // Sunucu IP adresinizi buraya girin
  const API_URL = `http://${SERVER_IP}:8000`;
  
  const [dailyTarget, setDailyTarget] = useState(2200); 
  const [waterTarget, setWaterTarget] = useState(2500); 
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Hangi öğüne ekleme yapıyoruz? (Manuel için)
  const [currentMealType, setCurrentMealType] = useState(null);

  // AI İçin Seçili Öğün (Otomatik tahmin edecek ama değişebilir)
  const [aiSelectedMeal, setAiSelectedMeal] = useState('Öğle Yemeği');

  const [logs, setLogs] = useState([]); 
  const [totalCalories, setTotalCalories] = useState(0); 
  const [totalBurnt, setTotalBurnt] = useState(0); 
  const [totalProtein, setTotalProtein] = useState(0);
  const [totalCarb, setTotalCarb] = useState(0);
  const [totalFat, setTotalFat] = useState(0);
  const [targetProtein, setTargetProtein] = useState(0);
  const [targetCarb, setTargetCarb] = useState(0);
  const [targetFat, setTargetFat] = useState(0);
  const [waterIntake, setWaterIntake] = useState(0); 

  const [loading, setLoading] = useState(false); 
  
  // Modallar
  const [modalVisible, setModalVisible] = useState(false); // AI Sonuç Modalı
  const [searchModalVisible, setSearchModalVisible] = useState(false); 
  const [sportModalVisible, setSportModalVisible] = useState(false);

  const [currentImage, setCurrentImage] = useState(null);
  const [predictedFood, setPredictedFood] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [duration, setDuration] = useState('');

  const user = auth.currentUser;

  useFocusEffect(
    useCallback(() => {
      if(user) {
        fetchLogs(formatDateForAPI(selectedDate));
        fetchUserData(); 
      }
    }, [user, selectedDate])
  );

  // --- TARİH VE FORMAT ---
  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };
  const formatDateForAPI = (dateObj) => dateObj.toISOString().split('T')[0];
  const formatDateForDisplay = (dateObj) => {
    const today = new Date();
    if(dateObj.toDateString() === today.toDateString()) return "Bugün";
    return dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });
  };

  const calculateMacroTargets = (calories) => {
    const p = Math.round((calories * 0.30) / 4); 
    const c = Math.round((calories * 0.40) / 4); 
    const f = Math.round((calories * 0.30) / 9); 
    setTargetProtein(p); setTargetCarb(c); setTargetFat(f);
  };

  const fetchUserData = async () => {
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.hedef_kalori) { setDailyTarget(data.hedef_kalori); calculateMacroTargets(data.hedef_kalori); }
        if (data.su_hedefi) setWaterTarget(data.su_hedefi * 1000); 
      }
      const response = await axios.get(`${API_URL}/su-durumu/${user.uid}`);
      if(response.data.success) setWaterIntake(response.data.toplam);
    } catch (e) { console.log(e); }
  };

  const fetchLogs = async (dateStr) => {
    try {
      const response = await axios.get(`${API_URL}/gunluk/${user.uid}?tarih=${dateStr}`);
      if (response.data.success) {
        setLogs(response.data.logs);
        setTotalCalories(response.data.total_calories);
        setTotalBurnt(response.data.total_burnt || 0);
        setTotalProtein(response.data.total_protein || 0);
        setTotalCarb(response.data.total_carb || 0);
        setTotalFat(response.data.total_fat || 0);
      }
    } catch (error) { console.log(error); }
  };

  const openSearchForMeal = (mealType) => {
    setCurrentMealType(mealType);
    setSearchText('');
    setSearchResults([]);
    setSearchModalVisible(true);
  };

  const handleFoodSearch = async () => {
    if(searchText.length < 2) return;
    setSearching(true);
    try {
      const response = await axios.get(`${API_URL}/arama/${searchText}`);
      if(response.data.success) setSearchResults(response.data.results);
    } catch (error) { Alert.alert("Hata", "Arama yapılamadı."); } 
    finally { setSearching(false); }
  };

  const saveManualFood = async (item) => {
    try {
      const dataToSend = { 
        yemek_adi: item.isim, kalori: item.kalori, porsiyon: item.birim, 
        kullanici_id: user.uid, protein: item.protein, karbonhidrat: item.karbonhidrat, yag: item.yag,
        tarih_str: formatDateForAPI(selectedDate),
        ogun: currentMealType 
      };
      await axios.post(`${API_URL}/kaydet`, dataToSend);
      setSearchModalVisible(false);
      fetchLogs(formatDateForAPI(selectedDate)); 
      Alert.alert("Eklendi", `${item.isim} ${currentMealType}'ya eklendi.`);
    } catch (error) { Alert.alert("Hata", "Kaydedilemedi."); }
  };

  const handleSportSearch = async () => {
    if(searchText.length < 2) return;
    setSearching(true);
    try {
      const response = await axios.get(`${API_URL}/egzersiz-ara/${searchText}`);
      if(response.data.success) setSearchResults(response.data.results);
    } catch (error) { Alert.alert("Hata", "Arama yapılamadı."); } 
    finally { setSearching(false); }
  };

  const saveSport = async (item) => {
    if(!duration) { Alert.alert("Süre Girin", "Kaç dakika yaptınız?"); return; }
    try {
      await axios.post(`${API_URL}/spor-yap`, {
        egzersiz_id: item.id, sure_dk: parseInt(duration), kullanici_id: user.uid,
        tarih_str: formatDateForAPI(selectedDate)
      });
      setSportModalVisible(false); setSearchText(''); setSearchResults([]); setDuration('');
      fetchLogs(formatDateForAPI(selectedDate)); Alert.alert("Harika! 🔥", `Spor kaydedildi.`);
    } catch (error) { Alert.alert("Hata", "Kaydedilemedi."); }
  };

  // --- AI ANALİZ ---
  const analyzeImage = async (uri) => {
    setLoading(true);
    
    // Saate göre varsayılan öğünü tahmin et (UX İyileştirmesi)
    const hour = new Date().getHours();
    let defaultMeal = 'Atıştırmalık';
    if(hour >= 5 && hour < 11) defaultMeal = 'Kahvaltı';
    else if(hour >= 11 && hour < 17) defaultMeal = 'Öğle Yemeği';
    else if(hour >= 17 && hour < 22) defaultMeal = 'Akşam Yemeği';
    setAiSelectedMeal(defaultMeal); // Varsayılanı ayarla

    let formData = new FormData();
    formData.append('file', { uri: uri, name: 'yemek.jpg', type: 'image/jpeg' });
    try {
      const response = await axios.post(`${API_URL}/predict`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (response.data.success) {
        setPredictedFood({
          yemek_adi: response.data.data.isim || response.data.prediction,
          kalori: response.data.data.kalori, porsiyon: response.data.data.birim || "1 Porsiyon",
          protein: response.data.data.protein, karbonhidrat: response.data.data.karbonhidrat, yag: response.data.data.yag
        });
        setModalVisible(true); // Modalı aç (Şimdi burada öğün seçeceğiz)
      } else { Alert.alert("Bulunamadı", "Tanınmadı."); }
    } catch (error) { Alert.alert("Hata", "Sunucu hatası."); } 
    finally { setLoading(false); }
  };

  const saveFood = async () => {
    if (!predictedFood || !user) return;
    try {
      // AI'dan gelen veriyi, kullanıcının seçtiği öğüne (aiSelectedMeal) kaydet
      await axios.post(`${API_URL}/kaydet`, { 
          ...predictedFood, 
          kullanici_id: user.uid,
          tarih_str: formatDateForAPI(selectedDate),
          ogun: aiSelectedMeal // KULLANICININ SEÇTİĞİ ÖĞÜN
      });
      setModalVisible(false); setCurrentImage(null);
      fetchLogs(formatDateForAPI(selectedDate)); 
      Alert.alert("Kaydedildi", `${predictedFood.yemek_adi} -> ${aiSelectedMeal}`);
    } catch (error) { Alert.alert("Hata", "Kaydedilemedi."); }
  };

  const deleteFood = (item) => {
    Alert.alert("Silinsin mi?", "Silinecek.", [{ text: "İptal", style: "cancel" }, { text: "Sil", style: 'destructive', onPress: async () => {
          try { await axios.delete(`${API_URL}/sil/${item.id}`); fetchLogs(formatDateForAPI(selectedDate)); } catch (e) { Alert.alert("Hata", "Silinemedi."); }}}]);
  };
  const drinkWater = async () => {
    try { await axios.post(`${API_URL}/su-ic`, { miktar: 200, kullanici_id: user.uid }); setWaterIntake(prev => prev + 200); Alert.alert("Harika! 💧", "200ml su içtin."); } catch (error) { Alert.alert("Hata", "Su kaydedilemedi."); }
  };
  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('İzin Gerekli', 'Kamera izni ver.');
    let result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.5 });
    if (!result.canceled) { setCurrentImage(result.assets[0].uri); analyzeImage(result.assets[0].uri); }
  };

  const groupedLogs = { 'Kahvaltı': [], 'Öğle Yemeği': [], 'Akşam Yemeği': [], 'Atıştırmalık': [], 'Spor Aktiviteleri': [] };
  logs.forEach(log => {
    if(log.tur === 'spor') {
        groupedLogs['Spor Aktiviteleri'].push(log);
    } else {
        const meal = log.ogun || 'Atıştırmalık'; 
        if(groupedLogs[meal]) groupedLogs[meal].push(log);
        else {
            if(!groupedLogs['Diğer']) groupedLogs['Diğer'] = [];
            groupedLogs['Diğer'].push(log);
        }
    }
  });

  const netCalories = totalCalories - totalBurnt;
  const progressPercent = Math.min((netCalories / dailyTarget) * 100, 100);
  const remainingCalories = dailyTarget - netCalories;
  const totalGlasses = Math.ceil(waterTarget / 200);
  const drunkGlasses = Math.floor(waterIntake / 200);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={{flexDirection:'row', justifyContent:'center', alignItems:'center', paddingVertical:10, backgroundColor:'#fff'}}>
         <TouchableOpacity onPress={() => changeDate(-1)} style={{padding:10}}><Ionicons name="chevron-back" size={24} color="#34495e" /></TouchableOpacity>
         <Text style={{fontSize:18, fontWeight:'bold', color:'#2c3e50', marginHorizontal:20}}>{formatDateForDisplay(selectedDate)}</Text>
         <TouchableOpacity onPress={() => changeDate(1)} style={{padding:10, opacity: selectedDate.toDateString() === new Date().toDateString() ? 0.3 : 1}} disabled={selectedDate.toDateString() === new Date().toDateString()}><Ionicons name="chevron-forward" size={24} color="#34495e" /></TouchableOpacity>
      </View>

      <View style={{padding: 20, backgroundColor: '#fff', borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 5}}>
        <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 5}}>
          <Text style={{fontSize: 24, fontWeight:'bold', color:'#2d3436'}}>Özet</Text>
          <TouchableOpacity onPress={() => setSportModalVisible(true)} style={{backgroundColor:'#eafaf1', padding:8, borderRadius:20}}>
             <Ionicons name="walk" size={24} color="#27ae60" />
          </TouchableOpacity>
        </View>
        <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom:5}}><Text style={{fontSize: 14, color:'#636e72'}}>Hedef: {dailyTarget} kcal</Text></View>
        <View style={{height: 15, backgroundColor:'#dfe6e9', borderRadius: 10, overflow:'hidden', marginTop:5}}><View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: progressPercent > 100 ? '#e74c3c' : '#2ecc71' }} /></View>
        <View style={{flexDirection:'row', justifyContent:'space-between', marginTop: 5, marginBottom: 15}}>
          <View><Text style={{color:'#636e72', fontSize:12}}>Alınan: <Text style={{fontWeight:'bold', color:'#2d3436'}}>{totalCalories}</Text></Text>{totalBurnt > 0 && <Text style={{color:'#27ae60', fontSize:12}}>Yakılan: -{totalBurnt}</Text>}</View>
          <Text style={{color:'#636e72'}}>Net Kalan: <Text style={{fontWeight:'bold', color:'#2d3436'}}>{remainingCalories}</Text></Text>
        </View>
        <View style={{flexDirection:'row', justifyContent:'space-between'}}>
            <View style={{flex:1, marginRight:10}}><Text style={{fontSize:10, color:'#27ae60', fontWeight:'bold', marginBottom:3}}>Prot: {totalProtein}/{targetProtein}g</Text><View style={{height:6, backgroundColor:'#eafaf1', borderRadius:3}}><View style={{width: `${Math.min((totalProtein/targetProtein)*100, 100)}%`, height:'100%', backgroundColor:'#27ae60', borderRadius:3}} /></View></View>
            <View style={{flex:1, marginRight:10}}><Text style={{fontSize:10, color:'#3498db', fontWeight:'bold', marginBottom:3}}>Karb: {totalCarb}/{targetCarb}g</Text><View style={{height:6, backgroundColor:'#eaf2f8', borderRadius:3}}><View style={{width: `${Math.min((totalCarb/targetCarb)*100, 100)}%`, height:'100%', backgroundColor:'#3498db', borderRadius:3}} /></View></View>
            <View style={{flex:1}}><Text style={{fontSize:10, color:'#f1c40f', fontWeight:'bold', marginBottom:3}}>Yağ: {totalFat}/{targetFat}g</Text><View style={{height:6, backgroundColor:'#fef9e7', borderRadius:3}}><View style={{width: `${Math.min((totalFat/targetFat)*100, 100)}%`, height:'100%', backgroundColor:'#f1c40f', borderRadius:3}} /></View></View>
        </View>
        <View style={{marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderColor: '#f1f2f6'}}>
           <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:10}}><Text style={{fontSize: 16, fontWeight:'bold', color:'#3498db'}}>Su Takibi 💧</Text><Text style={{fontSize: 12, color:'#95a5a6'}}>{waterIntake} / {waterTarget} ml</Text></View>
           <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection:'row'}}>
              {Array.from({ length: totalGlasses }).map((_, index) => (<TouchableOpacity key={index} onPress={drinkWater} style={{marginRight: 15, alignItems:'center'}}><Ionicons name={index < drunkGlasses ? "water" : "water-outline"} size={30} color={index < drunkGlasses ? "#3498db" : "#bdc3c7"} /><Text style={{fontSize:10, color:'#95a5a6'}}>200ml</Text></TouchableOpacity>))}
           </ScrollView>
        </View>
      </View>

      <ScrollView style={{flex:1, padding: 15}}>
        {groupedLogs['Spor Aktiviteleri'].length > 0 && (<View style={{marginBottom: 20}}><Text style={{fontSize: 18, fontWeight:'bold', color:'#27ae60', marginBottom:10}}>Spor Aktiviteleri 🏃‍♂️</Text>{groupedLogs['Spor Aktiviteleri'].map((item, index) => (<TouchableOpacity key={index} style={[styles.logItem, {borderLeftWidth:4, borderLeftColor:'#27ae60'}]} onLongPress={() => deleteFood(item)}><View style={styles.iconContainer}><Ionicons name="flame" size={20} color="#e74c3c" /></View><View style={styles.infoContainer}><Text style={styles.foodName}>{item.aktivite_adi}</Text><Text style={{fontSize:12, color:'#95a5a6'}}>{item.sure_dk} dakika</Text></View><Text style={[styles.calorieText, {color:'#27ae60'}]}>-{item.kalori}</Text></TouchableOpacity>))}</View>)}
        {['Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği', 'Atıştırmalık'].map((mealType) => (
          <View key={mealType} style={{marginBottom: 20}}>
            <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 10, alignItems:'center'}}><Text style={{fontSize: 18, fontWeight:'bold', color:'#2d3436'}}>{mealType}</Text><TouchableOpacity onPress={() => openSearchForMeal(mealType)}><Ionicons name="add-circle" size={28} color="#2ecc71" /></TouchableOpacity></View>
            {(groupedLogs[mealType] && groupedLogs[mealType].length > 0) ? (groupedLogs[mealType].map((item, index) => (<TouchableOpacity key={index} style={styles.logItem} onLongPress={() => deleteFood(item)}><View style={styles.iconContainer}><Ionicons name="fast-food" size={20} color="#f39c12" /></View><View style={styles.infoContainer}><Text style={styles.foodName}>{item.yemek_adi}</Text><Text style={{fontSize:12, color:'#95a5a6'}}>{item.porsiyon}</Text></View><Text style={styles.calorieText}>{item.kalori}</Text></TouchableOpacity>))) : (<View style={{backgroundColor:'#fff', padding: 15, borderRadius: 10, alignItems:'center', borderStyle:'dashed', borderWidth:1, borderColor:'#bdc3c7'}}><Text style={{color:'#b2bec3'}}>Boş</Text></View>)}
          </View>
        ))}
        {groupedLogs['Diğer'] && groupedLogs['Diğer'].length > 0 && (<View style={{marginBottom: 20}}><Text style={{fontSize: 18, fontWeight:'bold', color:'#95a5a6', marginBottom:10}}>Diğer</Text>{groupedLogs['Diğer'].map((item, index) => (<TouchableOpacity key={index} style={styles.logItem} onLongPress={() => deleteFood(item)}><View style={styles.iconContainer}><Ionicons name="help" size={20} color="#95a5a6" /></View><View style={styles.infoContainer}><Text style={styles.foodName}>{item.yemek_adi}</Text><Text style={{fontSize:12, color:'#95a5a6'}}>{item.porsiyon}</Text></View><Text style={styles.calorieText}>{item.kalori}</Text></TouchableOpacity>))}</View>)}
        <View style={{height: 80}} />
      </ScrollView>

      <View style={styles.fabContainer}><TouchableOpacity style={styles.fab} onPress={pickImage} disabled={loading}><Ionicons name="camera" size={32} color="#fff" /></TouchableOpacity></View>

      <Modal animationType="fade" visible={searchModalVisible} onRequestClose={() => setSearchModalVisible(false)}>
        <SafeAreaView style={{flex:1, backgroundColor:'#fff'}}>
            <View style={{padding:20, flexDirection:'row', alignItems:'center', borderBottomWidth:1, borderColor:'#f1f2f6'}}><TouchableOpacity onPress={() => setSearchModalVisible(false)}><Ionicons name="arrow-back" size={24} color="#34495e" /></TouchableOpacity><TextInput style={{flex:1, marginLeft:15, fontSize:18, backgroundColor:'#f5f6fa', padding:10, borderRadius:10}} placeholder={`${currentMealType} için ara... (Örn: Risotto)`} value={searchText} onChangeText={setSearchText} onSubmitEditing={handleFoodSearch} autoFocus /><TouchableOpacity onPress={handleFoodSearch} style={{marginLeft:10}}><Ionicons name="search" size={24} color="#e74c3c" /></TouchableOpacity></View>
            {searching ? <ActivityIndicator size="large" color="#e74c3c" style={{marginTop:50}} /> : <FlatList data={searchResults} keyExtractor={(item) => item.id} contentContainerStyle={{padding:20}} renderItem={({item}) => (<TouchableOpacity style={{flexDirection:'row', padding:15, borderBottomWidth:1, borderColor:'#f1f2f6', alignItems:'center'}} onPress={() => saveManualFood(item)}><View style={{width:40, height:40, backgroundColor:'#eafaf1', borderRadius:20, justifyContent:'center', alignItems:'center', marginRight:15}}><Text>🥗</Text></View><View style={{flex:1}}><Text style={{fontSize:16, fontWeight:'bold', color:'#2c3e50'}}>{item.isim}</Text><Text style={{fontSize:10, color:'#95a5a6'}}>P:{item.protein} K:{item.karbonhidrat} Y:{item.yag}</Text></View><Text style={{fontWeight:'bold', color:'#27ae60'}}>{item.kalori} kcal</Text><Ionicons name="add-circle" size={24} color="#2ecc71" style={{marginLeft:10}} /></TouchableOpacity>)} ListEmptyComponent={<View style={{alignItems:'center', marginTop:50}}><Text style={{color:'#bdc3c7'}}>Aradığınızı bulun...</Text></View>} />}
        </SafeAreaView>
      </Modal>

      <Modal animationType="fade" visible={sportModalVisible} onRequestClose={() => setSportModalVisible(false)}>
        <SafeAreaView style={{flex:1, backgroundColor:'#fff'}}><View style={{padding:20, flexDirection:'row', alignItems:'center', borderBottomWidth:1, borderColor:'#f1f2f6'}}><TouchableOpacity onPress={() => setSportModalVisible(false)}><Ionicons name="arrow-back" size={24} color="#34495e" /></TouchableOpacity><TextInput style={{flex:1, marginLeft:15, fontSize:18, backgroundColor:'#f5f6fa', padding:10, borderRadius:10}} placeholder="Spor ara... (Örn: Yüzme)" value={searchText} onChangeText={setSearchText} onSubmitEditing={handleSportSearch} autoFocus /><TouchableOpacity onPress={handleSportSearch} style={{marginLeft:10}}><Ionicons name="search" size={24} color="#27ae60" /></TouchableOpacity></View><View style={{padding:20, backgroundColor:'#f9f9f9', borderBottomWidth:1, borderColor:'#eee'}}><Text style={{marginBottom:10, fontWeight:'bold', color:'#2c3e50'}}>Süre (Dakika):</Text><TextInput style={{backgroundColor:'#fff', padding:10, borderRadius:10, borderWidth:1, borderColor:'#ddd'}} placeholder="Örn: 30" keyboardType="numeric" value={duration} onChangeText={setDuration} /></View>{searching ? <ActivityIndicator size="large" color="#27ae60" style={{marginTop:50}} /> : <FlatList data={searchResults} keyExtractor={(item) => item.id} contentContainerStyle={{padding:20}} renderItem={({item}) => (<TouchableOpacity style={{flexDirection:'row', padding:15, borderBottomWidth:1, borderColor:'#f1f2f6', alignItems:'center'}} onPress={() => saveSport(item)}><View style={{width:40, height:40, backgroundColor:'#eafaf1', borderRadius:20, justifyContent:'center', alignItems:'center', marginRight:15}}><Ionicons name="flame" size={24} color="#e74c3c" /></View><View style={{flex:1}}><Text style={{fontSize:16, fontWeight:'bold', color:'#2c3e50'}}>{item.isim}</Text><Text style={{fontSize:12, color:'#95a5a6'}}>Zorluk: {item.met} MET</Text></View><Ionicons name="add-circle" size={24} color="#2ecc71" style={{marginLeft:10}} /></TouchableOpacity>)} ListEmptyComponent={<View style={{alignItems:'center', marginTop:50}}><Text style={{color:'#bdc3c7'}}>Spor ara...</Text></View>} />}</SafeAreaView>
      </Modal>

      {/* --- GÜNCELLENEN AI MODALI (ÖĞÜN SEÇİMLİ) --- */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {currentImage && <Image source={{ uri: currentImage }} style={styles.modalImage} />}
            <Text style={styles.modalTitle}>{predictedFood?.yemek_adi}</Text>
            
            <View style={{flexDirection:'row', justifyContent:'space-around', width:'100%', marginBottom:5}}>
                <Text style={{color:'#27ae60', fontWeight:'bold'}}>{predictedFood?.protein}g Prot</Text>
                <Text style={{color:'#3498db', fontWeight:'bold'}}>{predictedFood?.karbonhidrat}g Karb</Text>
                <Text style={{color:'#f1c40f', fontWeight:'bold'}}>{predictedFood?.yag}g Yağ</Text>
            </View>
            <Text style={styles.modalCalories}>{predictedFood?.kalori} kcal</Text>

            {/* --- ÖĞÜN SEÇİCİ --- */}
            <View style={{width:'100%', marginVertical:15}}>
                <Text style={{fontSize:14, fontWeight:'bold', color:'#34495e', marginBottom:10}}>Hangi Öğün?</Text>
                <View style={{flexDirection:'row', flexWrap:'wrap', justifyContent:'center'}}>
                    {['Kahvaltı', 'Öğle Yemeği', 'Akşam Yemeği', 'Atıştırmalık'].map((m) => (
                        <TouchableOpacity 
                            key={m} 
                            style={{
                                paddingVertical:8, paddingHorizontal:12, borderRadius:20, margin:4,
                                backgroundColor: aiSelectedMeal === m ? '#27ae60' : '#f1f2f6'
                            }}
                            onPress={() => setAiSelectedMeal(m)}
                        >
                            <Text style={{color: aiSelectedMeal === m ? '#fff' : '#34495e', fontSize:12, fontWeight:'bold'}}>{m}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}><Text style={styles.cancelButtonText}>İptal</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveFood}><Text style={styles.saveButtonText}>✅ Kaydet</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}