from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image
import torch

# 1. Modeli Tanımla (Bu herkese açık bir modeldir, şifre istemez)
# nateraw/food: Food-101 veri setiyle eğitilmiş popüler bir modeldir.
model_name = "nateraw/food"

print(f"'{model_name}' modeli Hugging Face'den indiriliyor...")
try:
    processor = AutoImageProcessor.from_pretrained(model_name)
    model = AutoModelForImageClassification.from_pretrained(model_name)
except Exception as e:
    print("Model indirilirken hata oldu. İnternet bağlantını kontrol et.")
    print(f"Hata detayı: {e}")
    exit()

# 2. Resmi Yükle
image_path = "test.jpg"  # Klasöründeki resmin adı bu olmalı!

try:
    print(f"'{image_path}' dosyası açılıyor...")
    image = Image.open(image_path)
    
    # 3. Resmi İşle
    inputs = processor(images=image, return_tensors="pt")

    # 4. Tahmin Yap
    print("Yapay zeka düşünüyor...")
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        predicted_class_idx = logits.argmax(-1).item()

    # 5. Sonucu Yazdır
    prediction = model.config.id2label[predicted_class_idx]
    print("\n" + "="*40)
    print(f"SONUÇ: {prediction}")
    print("="*40 + "\n")

except FileNotFoundError:
    print(f"\nUYARI: Klasörde '{image_path}' bulamadım!")
    print("Lütfen indirdiğin yemek resminin adını 'test.jpg' yapıp klasöre at.\n")
except Exception as e:
    print(f"Beklenmedik bir hata: {e}")