from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import ViTImageProcessor, ViTForImageClassification
from PIL import Image
import torch
import io
import json
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, date, timedelta
from pydantic import BaseModel

app = FastAPI()

# --- 1. CORS AYARLARI (TELEFON BAĞLANTISI İÇİN ŞART) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tüm kaynaklara izin ver
    allow_credentials=True,
    allow_methods=["*"],  # Tüm metodlara izin ver (GET, POST, DELETE...)
    allow_headers=["*"],
)

# --- 2. FIREBASE BAĞLANTISI ---
try:
    if not firebase_admin._apps:
        cred = credentials.Certificate("firebase_key.json")
        firebase_admin.initialize_app(cred)
        print("☁️ Firebase Bağlandı")
except Exception as e:
    print(f"❌ Firebase Hatası: {e}")

db = firestore.client()

# --- 3. AI MODELİ (21 SINIFLI YENİ BEYİN) ---
MODEL_PATH = "./yeni_model"  # Eğittiğimiz model klasörü

print("🧠 Model yükleniyor...")
try:
    # AutoModel yerine eğitimde kullandığımız ViT sınıflarını kullanıyoruz
    processor = ViTImageProcessor.from_pretrained(MODEL_PATH)
    model = ViTForImageClassification.from_pretrained(MODEL_PATH)
    print("✅ Model Başarıyla Yüklendi! (21 Yemek Tanınıyor)")
except Exception as e:
    print(f"❌ HATA: Model yüklenemedi! {e}")
    print("⚠️ YEDEK: Google'ın temel modeli yükleniyor...")
    processor = ViTImageProcessor.from_pretrained("google/vit-base-patch16-224-in21k")
    model = ViTForImageClassification.from_pretrained("google/vit-base-patch16-224-in21k")

# Veritabanlarını Oku
try:
    with open("foods.json", "r", encoding="utf-8") as f:
        food_database = json.load(f)
except:
    food_database = {}

try:
    with open("exercises.json", "r", encoding="utf-8") as f:
        exercise_database = json.load(f)
except:
    exercise_database = {}

# --- 4. DATA MODELLERİ (Pydantic) ---
class YemekKayit(BaseModel):
    yemek_adi: str
    kalori: int
    protein: int = 0
    karbonhidrat: int = 0
    yag: int = 0
    porsiyon: str
    kullanici_id: str
    tarih_str: str = None
    ogun: str = None

class SuKayit(BaseModel):
    miktar: int
    kullanici_id: str

class SporKayit(BaseModel):
    egzersiz_id: str
    sure_dk: int
    kullanici_id: str
    tarih_str: str = None

# --- 5. ENDPOINTLER ---

@app.get("/")
def home():
    return {"durum": "Sunucu Aktif 🚀", "model": "21 Sınıflı ViT"}

# --- YAPAY ZEKA TAHMİNİ ---
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        # Resmi oku ve RGB'ye çevir (PNG transparanlığı hatasını önler)
        contents = await file.read()
        img = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Modele ver
        inputs = processor(images=img, return_tensors="pt")
        
        with torch.no_grad():
            outputs = model(**inputs)
            # En yüksek olasılıklı sınıfı bul
            predicted_class_idx = outputs.logits.argmax(-1).item()
            label = model.config.id2label[predicted_class_idx]
        
        print(f"📸 Tahmin Edilen: {label}")

        # Etiketi veritabanından bul
        # Eğer foods.json'da yoksa varsayılan boş veri dön
        info = food_database.get(label)
        
        if not info:
            # Veritabanında yoksa sadece ismini döndür
            info = {"isim": label.replace("_", " ").title(), "kalori": 0, "birim": "?", "protein":0, "karbonhidrat":0, "yag":0}

        return {"success": True, "prediction": label, "data": info}
        
    except Exception as e:
        print(f"Hata: {e}")
        return {"success": False, "error": str(e)}

# --- YEMEK KAYIT ---
@app.post("/kaydet")
def save(k: YemekKayit):
    try:
        if k.tarih_str:
            kayit_tarihi = datetime.strptime(k.tarih_str, "%Y-%m-%d")
            simdi = datetime.now()
            kayit_tarihi = kayit_tarihi.replace(hour=simdi.hour, minute=simdi.minute)
        else:
            kayit_tarihi = datetime.now()

        veri = {
            **k.dict(), 
            "tarih": kayit_tarihi,
            "tur": "yemek",
            "ogun": k.ogun if k.ogun else "Atıştırmalık"
        }
        if "tarih_str" in veri: del veri["tarih_str"]

        db.collection("yemek_gunlugu").add(veri)
        return {"success": True}
    except Exception as e: return {"success": False, "error": str(e)}

# --- SPOR KAYIT ---
@app.post("/spor-yap")
def add_exercise(kayit: SporKayit):
    try:
        egzersiz = exercise_database.get(kayit.egzersiz_id)
        if not egzersiz: return {"success": False, "error": "Bulunamadı"}

        user_doc = db.collection("users").document(kayit.kullanici_id).get()
        kilo = user_doc.to_dict().get("kilo", 70) if user_doc.exists else 70
        yakilan = int(egzersiz["met"] * float(kilo) * (kayit.sure_dk / 60))
        
        if kayit.tarih_str:
            kayit_tarihi = datetime.strptime(kayit.tarih_str, "%Y-%m-%d")
            simdi = datetime.now()
            kayit_tarihi = kayit_tarihi.replace(hour=simdi.hour, minute=simdi.minute)
        else:
            kayit_tarihi = datetime.now()

        yeni_veri = {
            "aktivite_adi": egzersiz["isim"],
            "sure_dk": kayit.sure_dk,
            "kalori": yakilan,
            "tarih": kayit_tarihi,
            "kullanici_id": kayit.kullanici_id,
            "tur": "spor"
        }
        db.collection("yemek_gunlugu").add(yeni_veri)
        return {"success": True}
    except Exception as e: return {"success": False, "error": str(e)}

# --- GÜNLÜK LİSTELEME ---
@app.get("/gunluk/{uid}")
def get_logs(uid: str, tarih: str = None):
    if not tarih: tarih = date.today().strftime("%Y-%m-%d")
    try:
        start = datetime.strptime(tarih, "%Y-%m-%d")
        end = start + timedelta(days=1)
        docs = db.collection("yemek_gunlugu").where("kullanici_id", "==", uid).where("tarih", ">=", start).where("tarih", "<", end).order_by("tarih", direction=firestore.Query.DESCENDING).stream()
        
        liste = []
        toplam = {"kalori": 0, "yakilan": 0, "protein": 0, "karbonhidrat": 0, "yag": 0}
        
        for doc in docs:
            veri = doc.to_dict()
            veri["id"] = doc.id
            if "tarih" in veri: veri["tarih"] = veri["tarih"].strftime("%d.%m.%Y %H:%M")
            liste.append(veri)
            
            if veri.get("tur") == "spor":
                toplam["yakilan"] += veri.get("kalori", 0)
            else:
                toplam["kalori"] += veri.get("kalori", 0)
                toplam["protein"] += veri.get("protein", 0)
                toplam["karbonhidrat"] += veri.get("karbonhidrat", 0)
                toplam["yag"] += veri.get("yag", 0)
                
        return {"success": True, "logs": liste, "total_calories": toplam["kalori"], "total_burnt": toplam["yakilan"], "total_protein": toplam["protein"], "total_carb": toplam["karbonhidrat"], "total_fat": toplam["yag"]}
    except Exception as e: return {"success": False, "error": str(e)}

# --- ARAMA İŞLEMLERİ ---
@app.get("/arama/{terim}")
def search_food(terim: str):
    try:
        res = []
        for k, v in food_database.items():
            if terim.lower() in k.lower() or terim.lower() in v['isim'].lower():
                res.append({"id": k, **v})
        return {"success": True, "results": res[:20]}
    except Exception as e: return {"success": False, "error": str(e)}

@app.get("/egzersiz-ara/{terim}")
def search_exercise(terim: str):
    try:
        res = []
        for k, v in exercise_database.items():
            if terim.lower() in v['isim'].lower():
                res.append({"id": k, "isim": v["isim"], "met": v["met"]})
        return {"success": True, "results": res}
    except Exception as e: return {"success": False, "error": str(e)}

# --- SU TAKİBİ ---
@app.get("/su-durumu/{uid}")
def get_water(uid: str):
    try:
        bugun = date.today().strftime("%Y-%m-%d")
        docs = db.collection("su_takibi").where("kullanici_id", "==", uid).where("tarih_str", "==", bugun).stream()
        return {"success": True, "toplam": sum([d.to_dict().get("miktar", 0) for d in docs])}
    except Exception as e: return {"success": False, "error": str(e)}

@app.post("/su-ic")
def drink(k: SuKayit):
    try:
        db.collection("su_takibi").add({**k.dict(), "tarih": datetime.now(), "tarih_str": date.today().strftime("%Y-%m-%d")})
        return {"success": True}
    except Exception as e: return {"success": False, "error": str(e)}

# --- KAYIT SİLME ---
@app.delete("/sil/{doc_id}")
def delete(doc_id: str):
    try:
        db.collection("yemek_gunlugu").document(doc_id).delete()
        return {"success": True}
    except Exception as e: return {"success": False, "error": str(e)}