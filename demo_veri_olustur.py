"""
Demo Veri Oluşturma Script'i
Bitirme projesi sunumu için gerçekçi test verileri oluşturur.

Kullanım:
    python demo_veri_olustur.py --gunler 30 --kullanici_id YOUR_USER_ID
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import random
import argparse
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

# Veritabanlarını oku
try:
    with open("foods.json", "r", encoding="utf-8") as f:
        food_database = json.load(f)
    print(f"✅ {len(food_database)} yemek yüklendi")
except:
    print("❌ foods.json bulunamadı!")
    food_database = {}

try:
    with open("exercises.json", "r", encoding="utf-8") as f:
        exercise_database = json.load(f)
    print(f"✅ {len(exercise_database)} egzersiz yüklendi")
except:
    print("❌ exercises.json bulunamadı!")
    exercise_database = {}

# Öğün türleri
OGUNLER = ["Kahvaltı", "Öğle Yemeği", "Akşam Yemeği", "Atıştırmalık"]

def random_ogun_selection():
    """Her gün için rastgele öğünler seçer"""
    ogun_sayisi = random.randint(3, 5)  # 3-5 öğün
    return random.sample(OGUNLER, ogun_sayisi)

def create_demo_data(kullanici_id, gun_sayisi=30):
    """
    Belirtilen kullanıcı için demo veri oluşturur
    
    Args:
        kullanici_id: Firebase kullanıcı ID'si
        gun_sayisi: Kaç günlük veri oluşturulacak
    """
    
    if not food_database or not exercise_database:
        print("❌ Veritabanları yüklenemedi, işlem iptal edildi.")
        return
    
    bugun = datetime.now()
    yemek_listesi = list(food_database.keys())
    egzersiz_listesi = list(exercise_database.keys())
    
    toplam_kayit = 0
    
    print(f"\n🚀 {gun_sayisi} günlük demo veri oluşturuluyor...\n")
    
    for gun in range(gun_sayisi):
        # Geriye doğru git
        tarih = bugun - timedelta(days=gun_sayisi - gun - 1)
        
        # Her gün için öğünler
        gunun_ogunleri = random_ogun_selection()
        
        # Yemek kayıtları
        for ogun in gunun_ogunleri:
            # Her öğün için 1-2 yemek
            yemek_sayisi = random.randint(1, 2)
            
            for _ in range(yemek_sayisi):
                yemek_key = random.choice(yemek_listesi)
                yemek_data = food_database[yemek_key]
                
                # Rastgele saat (kahvaltı 7-9, öğle 12-14, akşam 18-21, atıştırmalık 10-22)
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
                
                # Veriyi kaydet
                veri = {
                    "yemek_adi": yemek_data["isim"],
                    "kalori": yemek_data["kalori"],
                    "protein": yemek_data.get("protein", 0),
                    "karbonhidrat": yemek_data.get("karbonhidrat", 0),
                    "yag": yemek_data.get("yag", 0),
                    "porsiyon": yemek_data["birim"],
                    "kullanici_id": kullanici_id,
                    "tarih": kayit_zamani,
                    "tur": "yemek",
                    "ogun": ogun
                }
                
                db.collection("yemek_gunlugu").add(veri)
                toplam_kayit += 1
        
        # Egzersiz kayıtları (her gün %60 ihtimal)
        if random.random() < 0.6:
            egzersiz_sayisi = random.randint(1, 2)
            
            for _ in range(egzersiz_sayisi):
                egzersiz_key = random.choice(egzersiz_listesi)
                egzersiz_data = exercise_database[egzersiz_key]
                
                saat = random.randint(8, 20)
                dakika = random.randint(0, 59)
                kayit_zamani = tarih.replace(hour=saat, minute=dakika, second=0)
                
                # Rastgele süre (15-60 dakika)
                sure_dk = random.randint(15, 60)
                
                # Kullanıcının kilosu (varsayılan 70kg, gerçek kullanıcıdan çekilebilir)
                kilo = 70
                yakilan = int(egzersiz_data["met"] * float(kilo) * (sure_dk / 60))
                
                veri = {
                    "aktivite_adi": egzersiz_data["isim"],
                    "sure_dk": sure_dk,
                    "kalori": yakilan,
                    "tarih": kayit_zamani,
                    "kullanici_id": kullanici_id,
                    "tur": "spor"
                }
                
                db.collection("yemek_gunlugu").add(veri)
                toplam_kayit += 1
        
        # Su takibi (her gün 1500-3000ml arası)
        su_miktari = random.randint(1500, 3000)
        db.collection("su_takibi").add({
            "miktar": su_miktari,
            "kullanici_id": kullanici_id,
            "tarih": tarih,
            "tarih_str": tarih.strftime("%Y-%m-%d")
        })
        toplam_kayit += 1
        
        print(f"✅ {tarih.strftime('%Y-%m-%d')} - {len(gunun_ogunleri)} öğün oluşturuldu")
    
    print(f"\n🎉 Tamamlandı! Toplam {toplam_kayit} kayıt oluşturuldu.")
    print(f"📊 Şimdi uygulamayı açıp grafikleri kontrol edebilirsiniz!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Demo veri oluştur")
    parser.add_argument("--gunler", type=int, default=30, help="Kaç günlük veri oluşturulacak (varsayılan: 30)")
    parser.add_argument("--kullanici_id", type=str, help="Firebase kullanıcı ID'si")
    
    args = parser.parse_args()
    
    if not args.kullanici_id:
        print("❌ Kullanıcı ID'si gerekli!")
        print("Kullanım: python demo_veri_olustur.py --kullanici_id YOUR_USER_ID --gunler 30")
        print("\n💡 İpucu: Kullanıcı ID'nizi uygulamadan alabilirsiniz (Firebase Auth UID)")
    else:
        create_demo_data(args.kullanici_id, args.gunler)
