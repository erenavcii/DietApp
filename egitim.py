import os
import torch
import numpy as np
import evaluate
from datasets import load_dataset
from transformers import (
    ViTImageProcessor, 
    ViTForImageClassification, 
    TrainingArguments, 
    Trainer
)
from torchvision.transforms import (
    Compose, 
    Normalize, 
    RandomResizedCrop, 
    RandomHorizontalFlip, 
    ToTensor, 
    Resize, 
    CenterCrop
)

# --- AYARLAR ---
MODEL_ADI = "google/vit-base-patch16-224-in21k"
DATASET_KLASORU = "dataset"
CIKIS_KLASORU = "yeni_model"

def main():
    print("🚀 Eğitim hazırlığı başlıyor...")

    # 1. Veri Setini Yükle
    try:
        ds = load_dataset("imagefolder", data_dir=DATASET_KLASORU)
        ds = ds['train'].train_test_split(test_size=0.15) 
    except Exception as e:
        print(f"HATA: Veri seti yüklenemedi! Hata: {e}")
        return

    labels = ds['train'].features['label'].names
    print(f"✅ Tespit edilen yemekler ({len(labels)} adet): {labels}")

    # 2. Ön İşleme
    processor = ViTImageProcessor.from_pretrained(MODEL_ADI)
    normalize = Normalize(mean=processor.image_mean, std=processor.image_std)
    
    _train_transforms = Compose([
        RandomResizedCrop(224),
        RandomHorizontalFlip(),
        ToTensor(),
        normalize,
    ])
    
    _val_transforms = Compose([
        Resize(224),
        CenterCrop(224),
        ToTensor(),
        normalize,
    ])

    def preprocess_train(example_batch):
        example_batch["pixel_values"] = [
            _train_transforms(image.convert("RGB")) for image in example_batch["image"]
        ]
        return example_batch

    def preprocess_val(example_batch):
        example_batch["pixel_values"] = [
            _val_transforms(image.convert("RGB")) for image in example_batch["image"]
        ]
        return example_batch

    train_ds = ds['train'].with_transform(preprocess_train)
    val_ds = ds['test'].with_transform(preprocess_val)

    # 3. Model
    print("🧠 Model hazırlanıyor...")
    model = ViTForImageClassification.from_pretrained(
        MODEL_ADI,
        num_labels=len(labels),
        id2label={str(i): c for i, c in enumerate(labels)},
        label2id={c: str(i) for i, c in enumerate(labels)}
    )

    # 4. Eğitim Ayarları (DÜZELTİLEN KISIM BURASI)
    args = TrainingArguments(
        output_dir=CIKIS_KLASORU,
        remove_unused_columns=False,
        eval_strategy="epoch",       # <--- ESKİSİ: evaluation_strategy
        save_strategy="epoch",
        learning_rate=5e-5,
        per_device_train_batch_size=16,
        gradient_accumulation_steps=4,
        per_device_eval_batch_size=16,
        num_train_epochs=25,       
        warmup_ratio=0.1,
        logging_steps=10,
        load_best_model_at_end=True,
        metric_for_best_model="accuracy",
        save_total_limit=2,
    )

    # Metrik
    metric = evaluate.load("accuracy")

    def compute_metrics(p):
        predictions = np.argmax(p.predictions, axis=1)
        return metric.compute(predictions=predictions, references=p.label_ids)

    print("⚙️ Eğitmen başlatılıyor...")
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        tokenizer=processor,
        compute_metrics=compute_metrics,
        data_collator=lambda x: {
            "pixel_values": torch.stack([f["pixel_values"] for f in x]),
            "labels": torch.tensor([f["label"] for f in x])
        } 
    )

    print("\n🔥 EĞİTİM BAŞLIYOR! (25 Tur)...")
    train_results = trainer.train()
    
    print("\n💾 Yeni model kaydediliyor...")
    trainer.save_model()
    trainer.log_metrics("train", train_results.metrics)
    trainer.save_metrics("train", train_results.metrics)
    trainer.save_state()
    
    print(f"✅ İŞLEM BİTTİ! Yeni beynin burada: {CIKIS_KLASORU}")

if __name__ == "__main__":
    main()