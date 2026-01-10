import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore'; 
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width;

export default function SignupScreen({ navigation }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form Verileri
  const [formData, setFormData] = useState({
    name: '', email: '', password: '',
    gender: 'male', age: '', height: '', weight: '',
    activityLevel: 'moderate',
    targetWeight: '',
    selectedPlan: null 
  });

  // Hesaplanan Veriler
  const [calculatedData, setCalculatedData] = useState({
    tdee: 0,
    bmr: 0,
    plans: [],
    idealMin: 0,
    idealMax: 0
  });

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // İdeal Kilo Hesapla
  useEffect(() => {
    if(step === 4 && formData.height) {
        const h = parseFloat(formData.height) / 100;
        const min = (18.5 * h * h).toFixed(1);
        const max = (24.9 * h * h).toFixed(1);
        setCalculatedData(prev => ({ ...prev, idealMin: min, idealMax: max }));
    }
  }, [step, formData.height]);

  // Planları Hesapla
  const calculatePlans = () => {
    const { weight, height, age, gender, activityLevel, targetWeight } = formData;
    const kg = parseFloat(weight);
    const targetKg = parseFloat(targetWeight);
    const cm = parseFloat(height);
    const yas = parseInt(age);

    const multipliers = { 'low': 1.2, 'moderate': 1.375, 'high': 1.55, 'extreme': 1.725 };
    let bmr = (10 * kg) + (6.25 * cm) - (5 * yas) + (gender === 'male' ? 5 : -161);
    let tdee = Math.round(bmr * multipliers[activityLevel]);

    const diff = targetKg - kg; 
    const isLosing = diff < 0;
    const totalCalDiff = Math.abs(diff) * 7700; 

    const speeds = [0.25, 0.5, 1.0]; 
    const generatedPlans = speeds.map((speed, index) => {
      const dailyChange = Math.round((speed * 7700) / 7);
      let targetCal = isLosing ? tdee - dailyChange : tdee + dailyChange;
      
      const minLimit = gender === 'male' ? 1500 : 1200;
      let warning = null;
      if (isLosing && targetCal < minLimit) {
        targetCal = minLimit; 
        warning = "Minimum sınır";
      }

      const actualDailyChange = Math.abs(targetCal - tdee);
      const days = actualDailyChange > 0 ? Math.round(totalCalDiff / actualDailyChange) : 0;
      const weeks = Math.round(days / 7);
      let label = index === 0 ? "Rahat" : index === 1 ? "Önerilen" : "Hızlı";
      
      return { id: index, speed, targetCal, weeks, label, warning };
    });

    setCalculatedData(prev => ({ ...prev, tdee, plans: generatedPlans }));
    // Varsayılan seçim
    if(!formData.selectedPlan) updateForm('selectedPlan', generatedPlans[1]);
  };

  // Dinamik Grafik Datası
  const getChartData = () => {
    const startKg = parseFloat(formData.weight) || 0;
    const targetKg = parseFloat(formData.targetWeight) || 0;
    
    if(!formData.selectedPlan) return [startKg, targetKg];

    // Haftalık değişim (kg)
    let speed = formData.selectedPlan.speed; 
    if(startKg > targetKg) speed = -speed; // Kilo veriyorsa negatif

    // 1. Ay (4 hafta) ve 2. Ay (8 hafta) tahmini
    let m1 = startKg + (speed * 4);
    let m2 = startKg + (speed * 8);

    // Hedefi geçmesin
    if(startKg > targetKg) { // Kilo verme
        if(m1 < targetKg) m1 = targetKg;
        if(m2 < targetKg) m2 = targetKg;
    } else { // Kilo alma
        if(m1 > targetKg) m1 = targetKg;
        if(m2 > targetKg) m2 = targetKg;
    }

    return [startKg, m1, m2, targetKg];
  };

  const handleNext = () => {
    if (step === 1 && (!formData.name || !formData.email || !formData.password)) return Alert.alert("Eksik", "Lütfen tüm alanları doldur.");
    if (step === 2 && (!formData.age || !formData.gender)) return Alert.alert("Eksik", "Yaş ve cinsiyet gerekli.");
    if (step === 3 && (!formData.weight || !formData.height)) return Alert.alert("Eksik", "Boy ve kilo gerekli.");
    
    if (step === 4) {
        if (!formData.targetWeight) return Alert.alert("Eksik", "Hedef kilonu girmelisin.");
        const h = parseFloat(formData.height)/100;
        const targetBMI = parseFloat(formData.targetWeight) / (h*h);
        
        if (targetBMI < 18.5) {
            Alert.alert("⚠️ Riskli Hedef", `Bu hedef çok düşük (BMI: ${targetBMI.toFixed(1)}). En az ${calculatedData.idealMin} kg olmalı.`);
            return;
        }
        calculatePlans();
    }
    setStep(prev => prev + 1);
  };

  const handleSignup = async () => {
    if (!formData.selectedPlan) return Alert.alert("Hata", "Lütfen bir plan seç.");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;
      await setDoc(doc(db, "users", user.uid), {
        ad_soyad: formData.name, email: formData.email, olusturulma_tarihi: new Date(),
        yas: formData.age, kilo: formData.weight, boy: formData.height, cinsiyet: formData.gender,
        hedef_kilo: formData.targetWeight, hedef_kalori: formData.selectedPlan.targetCal,
        plan_tipi: formData.selectedPlan.label,
        su_hedefi: Math.round(formData.weight * 0.033 * 10) / 10 
      });
      Alert.alert("Başarılı 🎉", "Planın oluşturuldu!", [{ text: "Tamam" }]);
    } catch (error) { Alert.alert("Hata", error.message); } finally { setLoading(false); }
  };

  // --- RENDER ---
  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Merhaba! 👋</Text>
      <Text style={styles.stepSub}>Seni tanımaya başlayalım.</Text>
      <TextInput style={styles.input} placeholder="Adın Soyadın" value={formData.name} onChangeText={t => updateForm('name', t)} />
      <TextInput style={styles.input} placeholder="E-Posta Adresin" keyboardType="email-address" autoCapitalize="none" value={formData.email} onChangeText={t => updateForm('email', t)} />
      <TextInput style={styles.input} placeholder="Şifren" secureTextEntry value={formData.password} onChangeText={t => updateForm('password', t)} />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Senin Hakkında 👤</Text>
      <Text style={styles.stepSub}>Doğru hesaplama için önemli.</Text>
      <Text style={styles.label}>Cinsiyet</Text>
      <View style={{flexDirection:'row', marginBottom:20}}>
         <TouchableOpacity style={[styles.selectBtn, formData.gender === 'male' && styles.activeBtn]} onPress={() => updateForm('gender', 'male')}><Text style={[styles.selectText, formData.gender === 'male' && styles.activeText]}>Erkek 👨</Text></TouchableOpacity>
         <TouchableOpacity style={[styles.selectBtn, formData.gender === 'female' && styles.activeBtn]} onPress={() => updateForm('gender', 'female')}><Text style={[styles.selectText, formData.gender === 'female' && styles.activeText]}>Kadın 👩</Text></TouchableOpacity>
      </View>
      <Text style={styles.label}>Yaşın</Text>
      <TextInput style={styles.input} placeholder="Örn: 25" keyboardType="numeric" value={formData.age} onChangeText={t => updateForm('age', t)} />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Vücut Analizi 📏</Text>
      <Text style={styles.stepSub}>Mevcut durumunu girelim.</Text>
      <View style={{flexDirection:'row'}}>
        <View style={{flex:1, marginRight:10}}><Text style={styles.label}>Boy (cm)</Text><TextInput style={styles.input} placeholder="180" keyboardType="numeric" value={formData.height} onChangeText={t => updateForm('height', t)} /></View>
        <View style={{flex:1}}><Text style={styles.label}>Kilo (kg)</Text><TextInput style={styles.input} placeholder="80" keyboardType="numeric" value={formData.weight} onChangeText={t => updateForm('weight', t)} /></View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>Hareket & Hedef 🔥</Text>
      <Text style={styles.stepSub}>Günlük hayatın nasıl geçiyor?</Text>
      {['low', 'moderate', 'high', 'extreme'].map((level) => (
        <TouchableOpacity key={level} style={[styles.optionCard, formData.activityLevel === level && styles.activeCard]} onPress={() => updateForm('activityLevel', level)}>
            <Ionicons name={level === 'low' ? 'desktop-outline' : level === 'moderate' ? 'walk-outline' : 'fitness-outline'} size={24} color={formData.activityLevel === level ? '#fff' : '#34495e'} />
            <View style={{marginLeft:15}}>
                <Text style={[styles.optionTitle, formData.activityLevel === level && {color:'#fff'}]}>
                    {level === 'low' ? 'Masa Başı (Az Hareket)' : level === 'moderate' ? 'Orta (Haftada 1-3 spor)' : level === 'high' ? 'Aktif (Haftada 3-5 spor)' : 'Çok Aktif (Ağır İş/Spor)'}
                </Text>
            </View>
        </TouchableOpacity>
      ))}
      <Text style={[styles.label, {marginTop:20}]}>Hedef Kilon Kaç? (Şu an: {formData.weight}kg)</Text>
      {calculatedData.idealMin > 0 && (
          <View style={{backgroundColor:'#eafaf1', padding:10, borderRadius:8, marginBottom:10, borderLeftWidth:4, borderLeftColor:'#27ae60'}}>
              <Text style={{color:'#27ae60', fontSize:12, fontWeight:'bold'}}>💡 İdeal Kilo Rehberi</Text>
              <Text style={{color:'#2c3e50', fontSize:12}}>Senin boyuna göre sağlıklı aralık: <Text style={{fontWeight:'bold'}}>{calculatedData.idealMin}kg - {calculatedData.idealMax}kg</Text></Text>
          </View>
      )}
      <TextInput style={styles.input} placeholder="Örn: 70" keyboardType="numeric" value={formData.targetWeight} onChangeText={t => updateForm('targetWeight', t)} />
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text style={styles.stepTitle}>Planın Hazır! 🚀</Text>
      <Text style={styles.stepSub}>Normalde günde <Text style={{fontWeight:'bold', color:'#e74c3c'}}>{calculatedData.tdee} kcal</Text> yakıyorsun.</Text>

      {/* GRAFİK */}
      <View style={{marginVertical:10, alignItems:'center'}}>
        <LineChart
            data={{
            labels: ["Başla", "1 Ay", "2 Ay", "Hedef"],
            datasets: [{ data: getChartData() }]
            }}
            width={screenWidth - 60} height={180}
            chartConfig={{
            backgroundColor: "#fff", backgroundGradientFrom: "#fff", backgroundGradientTo: "#fff",
            decimalPlaces: 0, color: (opacity = 1) => `rgba(39, 174, 96, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: { borderRadius: 16 }, propsForDots: { r: "5", strokeWidth: "2", stroke: "#27ae60" }
            }}
            bezier style={{ marginVertical: 8, borderRadius: 16, elevation:3 }}
        />
      </View>

      <Text style={styles.label}>Bir Hız Seç:</Text>
      {calculatedData.plans.map((plan) => (
          <TouchableOpacity 
            key={plan.id} 
            style={[styles.planCard, formData.selectedPlan?.id === plan.id && styles.activePlanCard]}
            onPress={() => updateForm('selectedPlan', plan)}
          >
              <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                  <View>
                      <Text style={[styles.planTitle, formData.selectedPlan?.id === plan.id && {color:'#fff'}]}>{plan.label} ({plan.speed}kg/hft)</Text>
                      <Text style={[styles.planSub, formData.selectedPlan?.id === plan.id && {color:'#ecf0f1'}]}>{plan.weeks} hafta sürecek</Text>
                  </View>
                  <Text style={[styles.planCal, formData.selectedPlan?.id === plan.id && {color:'#fff'}]}>{plan.targetCal} kcal</Text>
              </View>
              {plan.warning && <Text style={{color:'#f1c40f', fontSize:10, marginTop:5, fontWeight:'bold'}}>⚠️ {plan.warning}</Text>}
          </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.finishButton} onPress={handleSignup} disabled={loading}><Text style={styles.buttonText}>{loading ? 'Hesap Oluşturuluyor...' : 'Bu Planla Başla 🏁'}</Text></TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.progressBar}><View style={{width: `${(step/5)*100}%`, height:6, backgroundColor:'#27ae60', borderRadius:3}} /></View>
        <View style={styles.content}>
            {/* HATA ÇÖZÜMÜ BURADA: Bloklar arasında boşluk bırakmadık */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
        </View>
        
        {step < 5 && (
            <View style={styles.footer}>
                {step > 1 && (<TouchableOpacity onPress={() => setStep(prev => prev - 1)} style={styles.backButton}><Text style={styles.backText}>Geri</Text></TouchableOpacity>)}
                <TouchableOpacity onPress={handleNext} style={styles.nextButton}><Text style={styles.nextText}>İleri</Text><Ionicons name="arrow-forward" size={20} color="#fff" style={{marginLeft:5}} /></TouchableOpacity>
            </View>
        )}
        <View style={styles.loginLink}><Text style={{color:'#95a5a6'}}>Zaten hesabın var mı? </Text><TouchableOpacity onPress={() => navigation.navigate('Login')}><Text style={{color:'#27ae60', fontWeight:'bold'}}>Giriş Yap</Text></TouchableOpacity></View>
        <View style={{height:50}} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  progressBar: { height:6, backgroundColor:'#ecf0f1', marginHorizontal:20, borderRadius:3, marginBottom:30 },
  content: { paddingHorizontal: 24 },
  stepTitle: { fontSize: 28, fontWeight: 'bold', color: '#2c3e50', marginBottom: 10 },
  stepSub: { fontSize: 16, color: '#7f8c8d', marginBottom: 30 },
  label: { fontSize: 14, fontWeight:'600', color:'#34495e', marginBottom:8, marginTop:10 },
  input: { backgroundColor: '#f5f6fa', padding: 15, borderRadius: 12, fontSize: 16, color: '#2c3e50', marginBottom: 15, borderWidth:1, borderColor:'#f1f2f6' },
  selectBtn: { flex: 1, padding: 15, backgroundColor: '#f5f6fa', alignItems: 'center', borderRadius: 12, marginHorizontal: 5, borderWidth:1, borderColor:'transparent' },
  activeBtn: { backgroundColor: '#eafaf1', borderColor: '#27ae60' },
  selectText: { fontWeight: '600', color: '#7f8c8d' },
  activeText: { color: '#27ae60' },
  optionCard: { flexDirection:'row', alignItems:'center', padding:15, backgroundColor:'#fff', borderRadius:12, marginBottom:10, borderWidth:1, borderColor:'#ecf0f1', elevation:1 },
  activeCard: { backgroundColor:'#2c3e50', borderColor:'#2c3e50' },
  optionTitle: { fontWeight:'600', color:'#34495e' },
  planCard: { padding:15, backgroundColor:'#fff', borderRadius:12, marginBottom:10, borderWidth:1, borderColor:'#ecf0f1', elevation:2 },
  activePlanCard: { backgroundColor:'#27ae60', borderColor:'#27ae60' },
  planTitle: { fontSize:16, fontWeight:'bold', color:'#2c3e50' },
  planSub: { fontSize:12, color:'#95a5a6' },
  planCal: { fontSize:18, fontWeight:'bold', color:'#27ae60' },
  footer: { flexDirection:'row', justifyContent:'flex-end', marginTop:30, alignItems:'center' },
  backButton: { marginRight:20, padding:10 },
  backText: { color:'#95a5a6', fontWeight:'600' },
  nextButton: { flexDirection:'row', backgroundColor:'#27ae60', paddingVertical:12, paddingHorizontal:25, borderRadius:30, alignItems:'center', elevation:3 },
  nextText: { color:'#fff', fontWeight:'bold', fontSize:16 },
  finishButton: { backgroundColor:'#27ae60', padding:18, borderRadius:15, alignItems:'center', marginTop:20, elevation:5 },
  buttonText: { color:'#fff', fontWeight:'bold', fontSize:18 },
  loginLink: { flexDirection:'row', justifyContent:'center', marginTop:30 },
});