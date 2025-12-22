import os
import requests
from bs4 import BeautifulSoup
import time

# --- AYARLAR ---
# İndirilecek Yemeklerin Listesi (Türk + Dünya Mutfağı)
YEMEKLER = [
    # --- TÜRK MUTFAĞI (8 Eski + 2 Yeni) ---
    "lahmacun", 
    "karniyarik", 
    "manti", 
    "yaprak_sarma", 
    "kuru_fasulye", 
    "iskender_kebap", 
    "mercimek_corbasi", 
    "cig_kofte",
    "adana_kebap",   # YENİ
    "tavuk_doner",   # YENİ

    # --- DÜNYA MUTFAĞI (11 Adet) ---
    "pizza", 
    "hamburger", 
    "sushi", 
    "tacos", 
    "waffle",
    "hot_dog", 
    "fried_chicken", # Kıtır Tavuk
    "ramen", 
    "donuts", 
    "lasagna", 
    "caesar_salad"
]

ADET = 50           # Her yemekten kaç tane insin?
KLASOR = "dataset"  # Ana klasör adı

# --- KLASÖR OLUŞTURMA ---
if not os.path.exists(KLASOR):
    os.makedirs(KLASOR)

def resim_indir(sorgu, limit):
    yol = os.path.join(KLASOR, sorgu.replace(" ", "_"))
    if not os.path.exists(yol):
        os.makedirs(yol)
    
    # Zaten dosyalar varsa, eksik kalan kadar indir veya pas geç
    mevcut_sayi = len(os.listdir(yol))
    if mevcut_sayi >= limit:
        print(f"✅ {sorgu} zaten tam ({mevcut_sayi} adet), geçiliyor...")
        return

    print(f"🔍 {sorgu} aranıyor... (Hedef: {limit})")
    
    # Google Görseller Arama URL'si
    url = f"https://www.google.com/search?q={sorgu}&tbm=isch"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"}
    
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    img_tags = soup.find_all('img')

    count = mevcut_sayi
    for img in img_tags:
        if count >= limit:
            break
        try:
            img_url = img.get('src')
            if img_url and 'http' in img_url:
                res = requests.get(img_url)
                file_path = os.path.join(yol, f"{count}.jpg")
                with open(file_path, "wb") as f:
                    f.write(res.content)
                count += 1
        except:
            pass
    print(f"📥 {sorgu}: {count} adet indirildi.")

# --- ANA DÖNGÜ ---
print("🚀 Veri indirme işlemi başlıyor...")
for yemek in YEMEKLER:
    # Boşlukları alt çizgi yapıp aratalım ki klasör isimleri düzgün olsun
    arama_terimi = yemek.replace("_", " ") 
    resim_indir(yemek, ADET)

print("✅ Tüm indirmeler tamamlandı! Lütfen 'dataset' klasörünü kontrol et.")