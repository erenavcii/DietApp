"""
HIZLI DEMO VERİ OLUŞTURMA

1. Firebase Console'a git
2. Authentication > Users
3. Kullanıcının UID'sini kopyala

Ardından:
"""
import firebase_admin
from firebase_admin import credentials, firestore, auth as admin_auth
from datetime import datetime, timedelta
import random
import json

# Firebase bağlantısı
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate("firebase_key.json")
        firebase_admin.initialize_app(cred)
        print("✅ Firebase Bağlandı")
except Exception as e:
    print(f"❌ Firebase Hatası: {e}")

db = firestore.client()

# Önce kayıtlı kullanıcıları listele
print("\n📋 KAYITLI KULLANICILAR:\n")
try:
    users = admin_auth.list_users().users
    for idx, user in enumerate(users, 1):
        print(f"{idx}. Email: {user.email}")
        print(f"   UID: {user.uid}\n")
    
    if not users:
        print("❌ Hiç kullanıcı yok! Önce uygulamada kayıt olun.\n")
        exit()
        
    # Kullanıcıdan seçim iste
    secim = input("Hangi kullanıcı için veri oluşturulsun? (Numara girin veya UID yapıştırın): ")
    
    if secim.isdigit() and 1 <= int(secim) <= len(users):
        kullanici_uid = users[int(secim) - 1].uid
        kullanici_email = users[int(secim) - 1].email
    else:
        kullanici_uid = secim.strip()
        kullanici_email = "Manuel girildi"
    
    print(f"\n✅ Seçilen: {kullanici_email}")
    print(f"   UID: {kullanici_uid}")
    
except Exception as e:
    print(f"❌ Kullanıcılar listelenemedi: {e}")
    kullanici_uid = input("\nUID'yi manuel yapıştırın: ").strip()

# Veri oluştur
gun_sayisi = 30

# Veritabanlarını oku
try:
    with open("foods.json", "r", encoding="utf-8") as f:
        food_database = json.load(f)
    print(f"✅ {len(food_database)} yemek yüklendi")
except:
    print("❌ foods.json bulunamadı!")
    exit()

try:
    with open("exercises.json", "r", encoding="utf-8") as f:
        exercise_database = json.load(f)
    print(f"✅ {len(exercise_database)} egzersiz yüklendi\n")
except:
    print("❌ exercises.json bulunamadı!")
    exit()

OGUNLER = ["Kahvaltı", "Öğle Yemeği", "Akşam Yemeği", "Atıştırmalık"]

bugun = datetime.now()
yemek_listesi = list(food_database.keys())
egzersiz_listesi = list(exercise_database.keys())

toplam_kayit = 0

print(f"🚀 {gun_sayisi} günlük demo veri oluşturuluyor...\n")

for gun in range(gun_sayisi):
    tarih = bugun - timedelta(days=gun_sayisi - gun - 1)
    
    # Her gün için öğünler (max 4 öğün var, 5 seçemeyiz!)
    gunun_ogunleri = random.sample(OGUNLER, random.randint(3, 4))
    
    # Yemek kayıtları
    for ogun in gunun_ogunleri:
        yemek_sayisi = random.randint(1, 2)
        
        for _ in range(yemek_sayisi):
            yemek_key = random.choice(yemek_listesi)
            yemek_data = food_database[yemek_key]
            
            if ogun == "Kahvaltı":
                saat = random.randint(7, 9)
            elif ogun == "Öğle Yemeği":
                saat = random.randint(12, 14)
            elif ogun == "Akşam Yemeği":
                saat = random.randint(18, 21)
            else:
                saat = random.randint(10, 22)
            
            dakika = random.randint(0, 59)
            kayit_zamani = tarih.replace(hour=saat, minute=dakika, second=0)
            
            veri = {
                "yemek_adi": yemek_data["isim"],
                "kalori": yemek_data["kalori"],
                "protein": yemek_data.get("protein", 0),
                "karbonhidrat": yemek_data.get("karbonhidrat", 0),
                "yag": yemek_data.get("yag", 0),
                "porsiyon": yemek_data["birim"],
                "kullanici_id": kullanici_uid,
                "tarih": kayit_zamani,
                "tur": "yemek",
                "ogun": ogun
            }
            
            db.collection("yemek_gunlugu").add(veri)
            toplam_kayit += 1
    
    # Egzersiz kayıtları
    if random.random() < 0.6:
        egzersiz_sayisi = random.randint(1, 2)
        
        for _ in range(egzersiz_sayisi):
            egzersiz_key = random.choice(egzersiz_listesi)
            egzersiz_data = exercise_database[egzersiz_key]
            
            saat = random.randint(8, 20)
            dakika = random.randint(0, 59)
            kayit_zamani = tarih.replace(hour=saat, minute=dakika, second=0)
            
            sure_dk = random.randint(15, 60)
            kilo = 70
            yakilan = int(egzersiz_data["met"] * float(kilo) * (sure_dk / 60))
            
            veri = {
                "aktivite_adi": egzersiz_data["isim"],
                "sure_dk": sure_dk,
                "kalori": yakilan,
                "tarih": kayit_zamani,
                "kullanici_id": kullanici_uid,
                "tur": "spor"
            }
            
            db.collection("yemek_gunlugu").add(veri)
            toplam_kayit += 1
    
    # Su takibi
    su_miktari = random.randint(1500, 3000)
    db.collection("su_takibi").add({
        "miktar": su_miktari,
        "kullanici_id": kullanici_uid,
        "tarih": tarih,
        "tarih_str": tarih.strftime("%Y-%m-%d")
    })
    toplam_kayit += 1
    
    print(f"✅ {tarih.strftime('%Y-%m-%d')} - {len(gunun_ogunleri)} öğün oluşturuldu")

print(f"\n🎉 Tamamlandı! Toplam {toplam_kayit} kayıt oluşturuldu.")
print(f"📊 Şimdi uygulamayı açıp Raporlar tab'ına gidin!")
print(f"🔄 Expo terminalinde 'R' tuşuna basarak reload yapın.\n")
