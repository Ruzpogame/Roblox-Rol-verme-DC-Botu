# Roblox-Rol-verme-DC-Botu
OİO gibi askeri Roblox oyunları için Discord üzerinden rol verme botu


Discord Roblox Branş & Rütbe Yönetim Botu
Gereksimler: Node.js

Bu bot, Discord üzerinden Roblox grup ve branş (sub-group) rütbe yönetimini güvenli ve yetkili bir şekilde yapabilmek için geliştirilmiştir.
RoWiFi API entegrasyonu sayesinde kullanıcı doğrulaması yapılır ve manuel kullanıcı adı sormaya gerek kalmaz.

🚀 Özellikler

🔐 Yetki Sistemi

Owner, HQ, HC rütbe kontrolü

Kendisiyle eşit veya daha yüksek rütbeye işlem yapılamaz

🧩 Branş Sistemi

Branş oluşturma / silme (sadece owner)

Branşa özel HC / HQ yetkilileri

🏷️ Rütbe Yönetimi

/rütbe-değiş

/branş-rütbe-değiş

Rütbe seçimi autocomplete ile otomatik gelir

📋 Sorgu Komutları

Rütbe sorgu

Branş + rütbe sorgu (yetkisiz kişiler de kullanabilir)

📝 Log Sistemi

Terfi / tenzil / rütbe değişimi logları

Sadece belirlenen log kanalına gönderim

⏱️ Rate Limit & Cooldown

Branş config oluşturma:

1 saat içinde 3 kez

Aşılırsa 10 dakika cooldown

📁 Config & TXT Çıktıları

Bot ilk çalışmada:

Ana grup rütbelerini oluşturur

Örnek branş config hazırlar

TXT dosyası ile tüm ayarları döker

🌐 RoWiFi API Entegrasyonu

Güvenli giriş

Roblox cookie paylaşmaya gerek yok

🛠️ Kullanılan Teknolojiler

Node.js

Discord.js

RoWiFi API

SQLite (tek sunucu, hafif ve hızlı)

.env ile güvenli anahtar yönetimi

⚠️ Güvenlik

Roblox cookie kullanılmaz

API anahtarları .env dosyasında saklanır

Yetkisiz komut kullanımı otomatik engellenir
