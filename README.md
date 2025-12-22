# 🥗 SmartDiet: AI Destekli Beslenme ve Sağlık Asistanı

![Status](https://img.shields.io/badge/Status-Completed-success)
![Platform](https://img.shields.io/badge/Platform-iOS%20|%20Android-blue)
![Backend](https://img.shields.io/badge/Backend-Python%20|%20FastAPI-yellow)
![AI](https://img.shields.io/badge/AI-Vision%20Transformer-orange)

## 📖 Proje Hakkında

**SmartDiet**, kullanıcıların fiziksel özelliklerine göre kişiselleştirilmiş beslenme planları oluşturan ve **Yapay Zeka (Computer Vision)** teknolojisi ile kalori takibini otomatize eden uçtan uca bir mobil sağlık uygulamasıdır.

Kullanıcılar manuel veri girişiyle uğraşmaz; sadece yemek fotoğrafı çekerek besin değerlerini (Kalori, Protein, Karbonhidrat, Yağ) saniyeler içinde kaydeder. Sistem hem Türk mutfağı (Adana Kebap, Lahmacun vb.) hem de Dünya mutfağı (Sushi, Ramen, Pizza vb.) lezzetlerini yüksek doğrulukla tanır.

## ✨ Temel Özellikler

### 🧬 1. Kişiselleştirilmiş Sağlık Analitiği
* **BMR & TDEE Hesaplama:** Kullanıcının boy, kilo, yaş ve cinsiyetine göre *Bazal Metabolizma Hızı* ve *Günlük Enerji İhtiyacı* hesaplanır.
* **Dinamik Hedefleme:** Kilo verme/alma hedeflerine göre günlük makro planı (Protein/Karb/Yağ) otomatik oluşturulur.

### 🧠 2. AI Destekli Görsel Tanıma (Smart Lens)
* **Teknoloji:** Google Vision Transformer (ViT) mimarisi ile Transfer Learning.
* **Kapsam:** 21 farklı yemek sınıfını (Global ve Yerel) %99 başarı oranıyla tanıma.
* **Anlık Analiz:** Fotoğraf çekildiği an kalori ve besin değerleri veritabanından çekilir.

### 📊 3. 360° Aktivite Takibi
* **Egzersiz Takibi:** Yapılan spora ve süreye göre yakılan kaloriyi (MET değeri ile) hesaplar.
* **Su Takibi:** Günlük su tüketim hedefini takip eder.
* **Raporlama:** Günlük alınan/yakılan kalorileri grafiklerle sunar.

## 🛠️ Kullanılan Teknolojiler

| Alan | Teknoloji | Açıklama |
| :--- | :--- | :--- |
| **Mobil** | React Native (Expo) | Cross-platform mobil arayüz. |
| **Backend** | Python (FastAPI) | Yüksek performanslı REST API. |
| **Yapay Zeka** | PyTorch & Transformers | Görüntü işleme ve sınıflandırma. |
| **Veritabanı** | Firebase Firestore | Gerçek zamanlı veri ve kullanıcı yönetimi. |

## 🚀 Kurulum

1. **Gereksinimleri Yükle:**
   ```bash
   pip install -r requirements.txt
