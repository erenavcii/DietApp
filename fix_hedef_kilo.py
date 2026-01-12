"""
Kullanıcının hedef_kilo verisini kontrol et ve gerekirse ekle
"""
import firebase_admin
from firebase_admin import credentials, firestore

# Firebase bağlantısı
if not firebase_admin._apps:
    cred = credentials.Certificate("firebase_key.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# haso@test.com kullanıcısının UID'si
uid = "QV0IWAPIYIWfZdkQeDJdeAVDUkt1"

# Kullanıcı verisini al
user_ref = db.collection("users").document(uid)
user_doc = user_ref.get()

if user_doc.exists:
    data = user_doc.to_dict()
    print("\n📋 Kullanıcı Verileri:")
    print(f"   Kilo: {data.get('kilo')}")
    print(f"   Hedef Kilo: {data.get('hedef_kilo')}")
    print(f"   Hedef Kalori: {data.get('hedef_kalori')}")
    
    if not data.get('hedef_kilo'):
        print("\n⚠️  HEDEF KİLO YOK! Ekleniyor...")
        
        # Varsayılan hedef: mevcut kilonun %90'ı (kilo verme hedefi)
        current_weight = float(data.get('kilo', 70))
        target_weight = round(current_weight * 0.9, 1)  # %10 kilo verme
        
        user_ref.update({
            'hedef_kilo': target_weight
        })
        
        print(f"✅ Hedef kilo eklendi: {target_weight}kg")
    else:
        print("\n✅ Hedef kilo mevcut!")
else:
    print("❌ Kullanıcı bulunamadı!")
