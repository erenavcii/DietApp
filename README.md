# 🍎 DietApp - AI Destekli Beslenme Takip Uygulaması

Yapay zeka ile yemek tanıma ve kişiselleştirilmiş beslenme takibi sunan mobil uygulama.

## 📋 Özellikler

### 🤖 AI Yemek Tanıma
- Vision Transformer (ViT) modeli ile 21 farklı yemek tanıma
- Fotoğraf çekerek otomatik kalori ve besin değeri hesaplama
- Güven skoru ile tahmin doğruluğu

### 📊 Gelişmiş Analitik Dashboard
- Haftalık kalori trend grafiği
- Makro besin dağılım analizi (Protein, Karb, Yağ)
- Hedef ilerleme takibi
- İstatistiksel özetler

### 🎯 Kişiselleştirilmiş Planlama
- BMR ve TDEE hesaplama
- Aktivite seviyesine göre kalori hedefi
- Kilo alma/verme planları
- Dinamik hedef güncelleme

### 💧 Su Takibi
- Kiloya göre otomatik su hedefi
- Görsel bardak gösterimi
- Hızlı kayıt

### 🌙 Dark Mode
- Tam ekran dark mode desteği
- Göz yorgunluğunu azaltır
- Modern ve şık tasarım

### ⚙️ Ayarlar
- Aktivite seviyesi değiştirme
- Hedef kilo güncelleme
- Hesap bilgileri görüntüleme

---

## 🚀 Kurulum

### Gereksinimler

**Backend:**
- Python 3.8+
- Firebase Admin SDK
- FastAPI
- PyTorch (AI model için)

**Frontend:**
- Node.js 14+
- Expo CLI
- React Native

### 1️⃣ Backend Kurulumu

```bash
cd e:\BitirmePojesi

# Sanal ortam oluştur
python -m venv venv
.\venv\Scripts\activate

# Bağımlılıkları yükle
pip install -r requirements.txt
```

**Firebase Ayarları:**
- `firebase_key.json` dosyasını proje kök dizinine ekleyin
- Firestore veritabanını aktif edin
- Authentication için Email/Password'ü etkinleştirin

**Firestore Güvenlik Kuralları:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /yemek_gunlugu/{logId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.kullanici_id;
    }
    match /su_takibi/{trackId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.kullanici_id;
    }
  }
}
```

**Gerekli Composite Index'ler:**
- Collection: `yemek_gunlugu`
  - Fields: `kullanici_id` (Ascending), `tarih` (Ascending)
  - Fields: `kullanici_id` (Ascending), `tarih` (Descending)

**Backend'i Başlat:**
```bash
uvicorn main:app --reload --host 0.0.0.0
```

### 2️⃣ Frontend Kurulumu

```bash
cd e:\BitirmePojesi\DietApp

# Bağımlılıkları yükle
npm install

# IP adresini güncelle
# HomeScreen.js ve ReportScreen.js içinde SERVER_IP değişkenini 
# bilgisayarınızın yerel IP'sine göre güncelleyin
```

**Firebase Config (`firebaseConfig.js`):**
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

**Expo'yu Başlat:**
```bash
npx expo start
```

---

## 📱 Kullanım

### İlk Kayıt
1. Uygulamayı açın
2. "Kayıt Ol" → Email ve şifre girin
3. 5 adımlı kişiselleştirme:
   - Ad Soyad
   - Boy, Kilo, Yaş, Cinsiyet
   - Aktivite Seviyesi
   - Hedef Kilo
   - Plan Seçimi (Kilo ver/al/koru)

### Yemek Ekleme
**Kamera ile:**
1. Ana ekranda kamera butonuna dokunun
2. Yemeğin fotoğrafını çekin
3. AI tahmini gelecek
4. Öğün seçin (Kahvaltı/Öğle/Akşam/Atıştırmalık)
5. Kaydet

**Manuel:**
1. İlgili öğünde "+" butonuna dokunun
2. Yemek ismi arayın
3. Seçip kaydedin

### Grafikler
- **Raporlar** tab'ına gidin
- Haftalık trend, makro dağılım, hedef ilerleme görüntüleyin
- Pull-to-refresh ile güncelleyin

### Ayarlar
- **Profil** → **Ayarlar**
- Aktivite seviyesi, hedef kilo değiştirin
- Hesap bilgilerinizi görüntüleyin

---

## 🗂️ Proje Yapısı

```
BitirmePojesi/
├── main.py                 # FastAPI backend
├── model.pth              # AI model
├── foods.json             # Yemek veritabanı
├── exercises.json         # Egzersiz veritabanı
├── firebase_key.json      # Firebase credentials
├── demo_veri_hizli.py     # Demo veri oluşturucu
└── DietApp/
    ├── screens/
    │   ├── HomeScreen.js       # Ana ekran
    │   ├── ProfileScreen.js    # Profil ve ayarlar
    │   ├── ReportScreen.js     # Analitik dashboard
    │   ├── LoginScreen.js      # Giriş
    │   └── SignupScreen.js     # Kayıt
    ├── ThemeContext.js         # Dark mode yönetimi
    ├── firebaseConfig.js       # Firebase ayarları
    └── App.js                  # Ana uygulama
```

---

## 🧪 Test Verisi Oluşturma

Demo veri scripti ile 30 günlük test verisi oluşturabilirsiniz:

```bash
cd e:\BitirmePojesi
python demo_veri_hizli.py
```

Kullanıcı seçin ve otomatik veri oluşturulacak.

---

## 🛠️ Teknik Detaylar

### AI Model
- **Mimari:** Vision Transformer (ViT)
- **Dataset:** 21 yemek sınıfı
- **Girdi:** 224x224 RGB görüntü
- **Çıktı:** Yemek sınıfı + güven skoru

### Backend API Endpoints
- `POST /predict` - Yemek tahmini
- `POST /kaydet` - Yemek/egzersiz kaydet
- `GET /gunluk/{uid}` - Günlük logları getir
- `GET /istatistik-haftalik/{uid}` - Haftalık kalori
- `GET /makro-dagilim/{uid}` - Makro dağılımı
- `GET /hedef-ozeti/{uid}` - Hedef özeti
- `POST /su-ic` - Su tüketimi kaydet
- `GET /su-durumu/{uid}` - Su takibi

### Veritabanı (Firestore)
- **users** - Kullanıcı profilleri
- **yemek_gunlugu** - Yemek/egzersiz kayıtları
- **su_takibi** - Su tüketim kayıtları

---

## 📝 Lisans

Bu proje bitirme projesi amaçlı geliştirilmiştir.

---

## 👨‍💻 Geliştirici

**DietApp Team**  
Versiyon: 1.0.0
