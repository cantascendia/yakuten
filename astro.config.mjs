// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://hrtyaku.com',
  integrations: [
    starlight({
      title: 'HRT药典',
      description: '循证 · 减害 · 引导就医 — 面向跨性别女性的 HRT 安全底线信息站',
      defaultLocale: 'zh',
      locales: {
        zh: { label: '中文', lang: 'zh-CN' },
        en: { label: 'English', lang: 'en' },
        ja: { label: '日本語', lang: 'ja' },
        ko: { label: '한국어', lang: 'ko' },
        pt: { label: 'Português', lang: 'pt-BR' },
        ru: { label: 'Русский', lang: 'ru' },
        es: { label: 'Español', lang: 'es' },
        id: { label: 'Bahasa Indonesia', lang: 'id' },
        th: { label: 'ไทย', lang: 'th' },
        fil: { label: 'Filipino', lang: 'fil' },
        hi: { label: 'हिन्दी', lang: 'hi' },
        vi: { label: 'Tiếng Việt', lang: 'vi' },
        ar: { label: 'العربية', lang: 'ar', dir: 'rtl' },
        fa: { label: 'فارسی', lang: 'fa', dir: 'rtl' },
        fr: { label: 'Français', lang: 'fr' },
        de: { label: 'Deutsch', lang: 'de' },
        tr: { label: 'Türkçe', lang: 'tr' },
      },
      components: {
        Head: './src/components/overrides/Head.astro',
        Footer: './src/components/overrides/Footer.astro',
        SiteTitle: './src/components/overrides/SiteTitle.astro',
      },
      customCss: [
        './src/styles/global.css',
        './src/styles/glass.css',
        './src/styles/emergency.css',
        './src/styles/pathway.css',
        './src/styles/blog.css',
        './src/styles/starlight-override.css',
        // 新版皮肤（只在 <html class="sakura"> 时激活，不影响默认外观）
        './src/styles/sakura-theme.css',
        './src/styles/sakura-components.css',
        './src/styles/sakura-skin.css',
      ],
      sidebar: [
        // ── 开始 ──
        {
          label: '开始',
          translations: { en: 'Getting Started', ja: 'はじめに', ko: '시작하기', pt: 'Primeiros Passos', ru: 'Начало работы', es: 'Primeros Pasos', id: 'Memulai', th: 'เริ่มต้น', fil: 'Pagsisimula', hi: 'शुरुआत', vi: 'Bắt Đầu', ar: 'البدء', fa: 'شروع کار', fr: 'Pour Commencer', de: 'Erste Schritte', tr: 'Başlarken' },
          items: [
            {
              label: '用药前准备',
              translations: { en: 'Before You Start', ja: '服薬前の準備', ko: '복용 전 준비', pt: 'Antes de Começar', ru: 'Перед началом', es: 'Antes de Empezar', id: 'Sebelum Memulai', th: 'ก่อนเริ่ม', fil: 'Bago Magsimula', hi: 'शुरू करने से पहले', vi: 'Trước Khi Bắt Đầu', ar: 'قبل أن تبدأ', fa: 'پیش از شروع', fr: 'Avant de Commencer', de: 'Bevor Sie Beginnen', tr: 'Başlamadan Önce' },
              slug: 'before-you-start',
            },
            {
              label: '生育力保存',
              translations: { en: 'Fertility Preservation', ja: '妊孕性温存', ko: '가임력 보존' },
              slug: 'fertility-preservation',
            },
            {
              label: '中国 HRT 现实路径图',
              translations: { en: 'China HRT Guide', ja: '中国HRTガイド', ko: '중국 HRT 가이드', pt: 'Guia de TH na China', ru: 'HRT в Китае', es: 'Guía de THS en China', id: 'Panduan HRT Tiongkok', th: 'คู่มือ HRT จีน', fil: 'Gabay sa HRT sa Tsina', hi: 'चीन HRT गाइड', vi: 'Hướng Dẫn HRT Trung Quốc', ar: 'دليل العلاج الهرموني في الصين', fa: 'راهنمای HRT چین', fr: 'Guide THS en Chine', de: 'HRT-Leitfaden China', tr: 'Çin HRT Rehberi' },
              slug: 'china-reality',
            },
            {
              label: '用药路径图',
              translations: { en: 'HRT Pathway', ja: 'HRT経路マップ', ko: 'HRT 경로 맵', pt: 'Caminho da TH', ru: 'Путь HRT', es: 'Ruta de THS', id: 'Jalur HRT', th: 'เส้นทาง HRT', fil: 'Daan ng HRT', hi: 'HRT मार्ग', vi: 'Lộ Trình HRT', ar: 'مسار العلاج الهرموني', fa: 'مسیر HRT', fr: 'Parcours THS', de: 'HRT-Pfad', tr: 'HRT Yolu' },
              slug: 'pathway',
            },
          ],
        },
        // ── 安全底线 ──
        {
          label: '安全底线',
          translations: { en: 'Safety Baseline', ja: '安全基準', ko: '안전 기준', pt: 'Linha de Segurança', ru: 'Основы безопасности', es: 'Base de Seguridad', id: 'Dasar Keamanan', th: 'พื้นฐานความปลอดภัย', fil: 'Saligan ng Kaligtasan', hi: 'सुरक्षा आधार', vi: 'Cơ Sở An Toàn', ar: 'أساسيات السلامة', fa: 'پایه ایمنی', fr: 'Bases de Sécurité', de: 'Sicherheitsgrundlagen', tr: 'Güvenlik Temeli' },
          items: [
            {
              label: '风险与急症识别',
              translations: { en: 'Risks & Emergencies', ja: 'リスクと緊急対応', ko: '위험 및 응급 상황', pt: 'Riscos e Emergências', ru: 'Риски и неотложные состояния', es: 'Riesgos y Emergencias', id: 'Risiko & Darurat', th: 'ความเสี่ยงและเหตุฉุกเฉิน', fil: 'Mga Panganib at Emerhensiya', hi: 'जोखिम और आपात स्थिति', vi: 'Rủi Ro & Cấp Cứu', ar: 'المخاطر والطوارئ', fa: 'خطرات و موارد اورژانسی', fr: 'Risques et Urgences', de: 'Risiken & Notfälle', tr: 'Riskler ve Acil Durumlar' },
              slug: 'risks',
              badge: { text: { 'zh-CN': '必读', en: 'Must Read', ja: '必読', ko: '필독', pt: 'Leitura Obrigatória', ru: 'Обязательно к прочтению', es: 'Lectura Obligatoria', id: 'Wajib Baca', th: 'ต้องอ่าน', fil: 'Dapat Basahin', hi: 'अवश्य पढ़ें', vi: 'Phải Đọc', ar: 'قراءة إلزامية', fa: 'خواندن ضروری', fr: 'À Lire Absolument', de: 'Pflichtlektüre', tr: 'Mutlaka Okuyun' }, variant: 'danger' },
            },
            {
              label: '剂量红线与混用禁忌',
              translations: { en: 'Dose Limits & Contraindications', ja: '用量レッドライン', ko: '용량 한계 및 금기', pt: 'Limites de Dose e Contraindicações', ru: 'Пределы доз и противопоказания', es: 'Límites de Dosis y Contraindicaciones', id: 'Batas Dosis & Kontraindikasi', th: 'ขีดจำกัดขนาดยาและข้อห้าม', fil: 'Limitasyon ng Dosis at Kontraindikasyon', hi: 'खुराक सीमा और निषेध', vi: 'Giới Hạn Liều & Chống Chỉ Định', ar: 'حدود الجرعة وموانع الاستعمال', fa: 'محدودیت دوز و موارد منع مصرف', fr: 'Limites de Dose et Contre-indications', de: 'Dosisgrenzen & Kontraindikationen', tr: 'Doz Sınırları ve Kontrendikasyonlar' },
              slug: 'dose-limits',
            },
            {
              label: '血检指南与自查工具',
              translations: { en: 'Blood Tests & Self-Check', ja: '血液検査ガイド', ko: '혈액 검사 가이드', pt: 'Exames de Sangue e Autoverificação', ru: 'Анализы крови и самопроверка', es: 'Análisis de Sangre y Autocontrol', id: 'Tes Darah & Pemeriksaan Mandiri', th: 'การตรวจเลือดและการตรวจสอบตนเอง', fil: 'Pagsusuri ng Dugo at Self-Check', hi: 'रक्त परीक्षण और स्व-जांच', vi: 'Xét Nghiệm Máu & Tự Kiểm Tra', ar: 'تحاليل الدم والفحص الذاتي', fa: 'آزمایش خون و خودبررسی', fr: 'Analyses Sanguines et Auto-contrôle', de: 'Bluttests & Selbstkontrolle', tr: 'Kan Testleri ve Kendi Kontrolü' },
              slug: 'blood-tests',
            },
            {
              label: '乳房发育专题',
              translations: { en: 'Breast Development', ja: '乳房発育ガイド', ko: '유방 발달 가이드', pt: 'Desenvolvimento Mamário', ru: 'Развитие груди', es: 'Desarrollo Mamario', id: 'Perkembangan Payudara', th: 'การพัฒนาของหน้าอก', fil: 'Paglaki ng Suso', hi: 'स्तन विकास', vi: 'Phát Triển Ngực', ar: 'نمو الثدي', fa: 'رشد سینه', fr: 'Développement Mammaire', de: 'Brustentwicklung', tr: 'Göğüs Gelişimi' },
              slug: 'breast-development',
              badge: { text: { 'zh-CN': '必读', en: 'Must Read', ja: '必読', ko: '필독', pt: 'Leitura Obrigatória', ru: 'Обязательно к прочтению', es: 'Lectura Obligatoria', id: 'Wajib Baca', th: 'ต้องอ่าน', fil: 'Dapat Basahin', hi: 'अवश्य पढ़ें', vi: 'Phải Đọc', ar: 'قراءة إلزامية', fa: 'خواندن ضروری', fr: 'À Lire Absolument', de: 'Pflichtlektüre', tr: 'Mutlaka Okuyun' }, variant: 'danger' },
            },
            {
              label: '常见争议 FAQ',
              translations: { en: 'Controversies FAQ', ja: '議論FAQ', ko: '논쟁 FAQ', pt: 'FAQ de Controvérsias', ru: 'FAQ по спорным вопросам', es: 'FAQ de Controversias', id: 'FAQ Kontroversi', th: 'คำถามที่พบบ่อยเรื่องข้อโต้แย้ง', fil: 'FAQ ng mga Kontrobersya', hi: 'विवाद FAQ', vi: 'FAQ Tranh Cãi', ar: 'الأسئلة الشائعة حول الجدل', fa: 'سؤالات متداول جنجالی', fr: 'FAQ des Controverses', de: 'FAQ zu Kontroversen', tr: 'Tartışmalar SSS' },
              slug: 'controversies-faq',
              badge: { text: { 'zh-CN': '新', en: 'New', ja: '新', ko: '새', pt: 'Novo', ru: 'Новое', es: 'Nuevo', id: 'Baru', th: 'ใหม่', fil: 'Bago', hi: 'नया', vi: 'Mới', ar: 'جديد', fa: 'جدید', fr: 'Nouveau', de: 'Neu', tr: 'Yeni' }, variant: 'success' },
            },
            {
              label: '三大指南对照',
              translations: { en: 'Guidelines Compared', ja: 'ガイドライン比較', ko: '가이드라인 비교' },
              slug: 'guidelines-comparison',
              badge: { text: { 'zh-CN': '新', en: 'New', ja: '新', ko: '새' }, variant: 'success' },
            },
          ],
        },
        // ── 实操指南 ──
        {
          label: '实操指南',
          translations: { en: 'Task Guides', ja: '実用ガイド', ko: '실용 가이드', pt: 'Guias Práticos', ru: 'Практические руководства', es: 'Guías Prácticas', id: 'Panduan Praktis', th: 'คู่มือปฏิบัติ', fil: 'Mga Praktikal na Gabay', hi: 'व्यावहारिक गाइड', vi: 'Hướng Dẫn Thực Hành', ar: 'أدلة عملية', fa: 'راهنماهای عملی', fr: 'Guides Pratiques', de: 'Praktische Anleitungen', tr: 'Uygulama Kılavuzları' },
          items: [
            { label: '总览', translations: { en: 'Overview', ja: '概要', ko: '개요', pt: 'Visão Geral', ru: 'Обзор', es: 'Visión General', id: 'Ikhtisar', th: 'ภาพรวม', fil: 'Pangkalahatang-ideya', hi: 'अवलोकन', vi: 'Tổng Quan', ar: 'نظرة عامة', fa: 'مرور کلی', fr: 'Vue d\'ensemble', de: 'Übersicht', tr: 'Genel Bakış' }, slug: 'guides' },
            { label: '首次注射', translations: { en: 'First Injection', ja: '初回注射', ko: '첫 주사', pt: 'Primeira Aplicação', ru: 'Первая инъекция', es: 'Primera Inyección', id: 'Suntikan Pertama', th: 'การฉีดครั้งแรก', fil: 'Unang Iniksyon', hi: 'पहला इंजेक्शन', vi: 'Tiêm Lần Đầu', ar: 'الحقنة الأولى', fa: 'اولین تزریق', fr: 'Première Injection', de: 'Erste Injektion', tr: 'İlk Enjeksiyon' }, slug: 'guides/first-injection' },
            { label: '抗雄切换', translations: { en: 'Switch Antiandrogen', ja: '抗アンドロゲン切り替え', ko: '항안드로겐 전환', pt: 'Trocar de Antiandrógeno', ru: 'Смена антиандрогена', es: 'Cambiar de Antiandrógeno', id: 'Ganti Antiandrogen', th: 'เปลี่ยนยาต้านแอนโดรเจน', fil: 'Magpalit ng Antiandrogen', hi: 'एंटीएंड्रोजन बदलें', vi: 'Đổi Thuốc Kháng Androgen', ar: 'تبديل مضاد الأندروجين', fa: 'تغییر آنتی‌آندروژن', fr: 'Changer d\'Antiandrogène', de: 'Antiandrogen Wechseln', tr: 'Antiandrojen Değiştir' }, slug: 'guides/switch-antiandrogen' },
            { label: '切换 E2 途径', translations: { en: 'Switch E2 Route', ja: 'E2 投与経路の切り替え', ko: 'E2 투여 경로 전환', pt: 'Trocar a Via de E2', ru: 'Смена пути введения E2', es: 'Cambiar la Vía de E2', id: 'Ganti Rute E2', th: 'เปลี่ยนเส้นทางการให้ E2', fil: 'Magpalit ng Ruta ng E2', hi: 'E2 मार्ग बदलें', vi: 'Đổi Đường Dùng E2', ar: 'تبديل طريقة إعطاء E2', fa: 'تغییر مسیر E2', fr: 'Changer la Voie d\'E2', de: 'E2-Applikationsweg Wechseln', tr: 'E2 Uygulama Yolunu Değiştir' }, slug: 'guides/switch-e2-route' },
          ],
        },
        // ── 药物详解 ──
        {
          label: '药物详解',
          translations: { en: 'Medications', ja: '薬物ガイド', ko: '약물 가이드', pt: 'Medicamentos', ru: 'Препараты', es: 'Medicamentos', id: 'Obat-obatan', th: 'ยา', fil: 'Mga Gamot', hi: 'दवाएं', vi: 'Thuốc', ar: 'الأدوية', fa: 'داروها', fr: 'Médicaments', de: 'Medikamente', tr: 'İlaçlar' },
          items: [
            // ── 雌二醇：去掉途径中间层，直接列药物 ──
            {
              label: '雌二醇',
              translations: { en: 'Estrogens', ja: 'エストロゲン', ko: '에스트로겐', pt: 'Estrogênios', ru: 'Эстрогены', es: 'Estrógenos', id: 'Estrogen', th: 'เอสโตรเจน', fil: 'Estrogen', hi: 'एस्ट्रोजन', vi: 'Estrogen', ar: 'الإستروجينات', fa: 'استروژن‌ها', fr: 'Œstrogènes', de: 'Östrogene', tr: 'Östrojenler' },
              items: [
                {
                  label: '总览与选择指南',
                  translations: { en: 'Overview & Selection', ja: '概要と選び方', ko: '개요 및 선택 가이드', pt: 'Visão Geral e Escolha', ru: 'Обзор и выбор', es: 'Visión General y Selección', id: 'Ikhtisar & Pemilihan', th: 'ภาพรวมและการเลือก', fil: 'Pangkalahatang-ideya at Pagpili', hi: 'अवलोकन और चयन', vi: 'Tổng Quan & Lựa Chọn', ar: 'نظرة عامة والاختيار', fa: 'مرور کلی و انتخاب', fr: 'Vue d\'ensemble et Choix', de: 'Übersicht & Auswahl', tr: 'Genel Bakış ve Seçim' },
                  slug: 'medications/estrogens/overview',
                },
                {
                  label: '口服（补佳乐）',
                  translations: { en: 'Oral (Pills)', ja: '経口（飲み薬）', ko: '경구 (알약)', pt: 'Oral (Comprimidos)', ru: 'Перорально (таблетки)', es: 'Oral (Comprimidos)', id: 'Oral (Pil)', th: 'ชนิดรับประทาน (เม็ด)', fil: 'Oral (Tabletas)', hi: 'मौखिक (गोलियां)', vi: 'Đường Uống (Viên)', ar: 'عن طريق الفم (أقراص)', fa: 'خوراکی (قرص)', fr: 'Oral (Comprimés)', de: 'Oral (Tabletten)', tr: 'Ağızdan (Tablet)' },
                  slug: 'medications/estrogens/oral',
                  badge: { text: { 'zh-CN': '常用', en: 'Common', ja: '基本', ko: '일반', pt: 'Comum', ru: 'Часто', es: 'Común', id: 'Umum', th: 'ทั่วไป', fil: 'Karaniwan', hi: 'सामान्य', vi: 'Phổ Biến', ar: 'شائع', fa: 'رایج', fr: 'Courant', de: 'Üblich', tr: 'Yaygın' }, variant: 'tip' },
                },
                {
                  label: '舌下含服',
                  translations: { en: 'Sublingual', ja: '舌下投与', ko: '설하 투여', pt: 'Sublingual', ru: 'Сублингвально', es: 'Sublingual', id: 'Sublingual', th: 'ใต้ลิ้น', fil: 'Sublingual', hi: 'जिह्वा के नीचे', vi: 'Ngậm Dưới Lưỡi', ar: 'تحت اللسان', fa: 'زیرزبانی', fr: 'Sublingual', de: 'Sublingual', tr: 'Dilaltı' },
                  slug: 'medications/estrogens/sublingual',
                },
                {
                  label: '凝胶',
                  translations: { en: 'Gel', ja: 'ゲル', ko: '겔', pt: 'Gel', ru: 'Гель', es: 'Gel', id: 'Gel', th: 'เจล', fil: 'Gel', hi: 'जेल', vi: 'Gel', ar: 'جل', fa: 'ژل', fr: 'Gel', de: 'Gel', tr: 'Jel' },
                  slug: 'medications/estrogens/gel',
                },
                {
                  label: '贴片',
                  translations: { en: 'Patches', ja: 'パッチ', ko: '패치', pt: 'Adesivos', ru: 'Пластыри', es: 'Parches', id: 'Koyo', th: 'แผ่นแปะ', fil: 'Mga Patch', hi: 'पैच', vi: 'Miếng Dán', ar: 'لصقات', fa: 'چسب‌ها', fr: 'Patchs', de: 'Pflaster', tr: 'Yamalar' },
                  slug: 'medications/estrogens/transdermal-patch',
                },
                {
                  label: '戊酸雌二醇注射 (EV)',
                  translations: { en: 'Estradiol Valerate (EV)', ja: '吉草酸エストラジオール (EV)', ko: '에스트라디올 발레레이트 (EV)', pt: 'Valerato de Estradiol (EV)', ru: 'Эстрадиола валерат (EV)', es: 'Valerato de Estradiol (EV)', id: 'Estradiol Valerat (EV)', th: 'เอสตราไดออล วาเลอเรต (EV)', fil: 'Estradiol Valerate (EV)', hi: 'एस्ट्राडियोल वैलेरेट (EV)', vi: 'Estradiol Valerate (EV)', ar: 'فاليرات الإستراديول (EV)', fa: 'استرادیول والرات (EV)', fr: 'Valérate d\'Estradiol (EV)', de: 'Estradiolvalerat (EV)', tr: 'Estradiol Valerat (EV)' },
                  slug: 'medications/estrogens/injection',
                  badge: { text: { 'zh-CN': '常用', en: 'Common', ja: '基本', ko: '일반', pt: 'Comum', ru: 'Часто', es: 'Común', id: 'Umum', th: 'ทั่วไป', fil: 'Karaniwan', hi: 'सामान्य', vi: 'Phổ Biến', ar: 'شائع', fa: 'رایج', fr: 'Courant', de: 'Üblich', tr: 'Yaygın' }, variant: 'tip' },
                },
                {
                  label: '其他注射酯类',
                  translations: { en: 'Other Injectable Esters', ja: 'その他の注射エステル', ko: '기타 주사 에스테르', pt: 'Outros Ésteres Injetáveis', ru: 'Другие инъекционные эфиры', es: 'Otros Ésteres Inyectables', id: 'Ester Injeksi Lainnya', th: 'เอสเทอร์ฉีดชนิดอื่น', fil: 'Iba Pang Injectable na Ester', hi: 'अन्य इंजेक्शन एस्टर', vi: 'Các Este Tiêm Khác', ar: 'إسترات حقن أخرى', fa: 'سایر استرهای تزریقی', fr: 'Autres Esters Injectables', de: 'Weitere Injizierbare Ester', tr: 'Diğer Enjekte Edilebilir Esterler' },
                  collapsed: true,
                  items: [
                    {
                      label: '环戊丙酸酯 (EC)',
                      translations: { en: 'Estradiol Cypionate (EC)', ja: 'シピオネート (EC)', ko: '시피오네이트 (EC)', pt: 'Cipionato de Estradiol (EC)', ru: 'Эстрадиола ципионат (EC)', es: 'Cipionato de Estradiol (EC)', id: 'Estradiol Sipionat (EC)', th: 'เอสตราไดออล ไซพิโอเนต (EC)', fil: 'Estradiol Cypionate (EC)', hi: 'एस्ट्राडियोल साइपियोनेट (EC)', vi: 'Estradiol Cypionate (EC)', ar: 'سيبيونات الإستراديول (EC)', fa: 'استرادیول سیپیونات (EC)', fr: 'Cypionate d\'Estradiol (EC)', de: 'Estradiolcypionat (EC)', tr: 'Estradiol Sipiyonat (EC)' },
                      slug: 'medications/estrogens/cypionate',
                    },
                    {
                      label: '庚酸酯 (EEn)',
                      translations: { en: 'Estradiol Enanthate (EEn)', ja: 'エナント酸 (EEn)', ko: '에난테이트 (EEn)', pt: 'Enantato de Estradiol (EEn)', ru: 'Эстрадиола энантат (EEn)', es: 'Enantato de Estradiol (EEn)', id: 'Estradiol Enantat (EEn)', th: 'เอสตราไดออล เอแนนเทต (EEn)', fil: 'Estradiol Enanthate (EEn)', hi: 'एस्ट्राडियोल एनेंथेट (EEn)', vi: 'Estradiol Enanthate (EEn)', ar: 'إينانثات الإستراديول (EEn)', fa: 'استرادیول انانتات (EEn)', fr: 'Énanthate d\'Estradiol (EEn)', de: 'Estradiolenanthat (EEn)', tr: 'Estradiol Enantat (EEn)' },
                      slug: 'medications/estrogens/enanthate',
                    },
                    {
                      label: '十一酸酯 (EU)',
                      translations: { en: 'Estradiol Undecylate (EU)', ja: 'ウンデシル酸 (EU)', ko: '운데실레이트 (EU)', pt: 'Undecilato de Estradiol (EU)', ru: 'Эстрадиола ундецилат (EU)', es: 'Undecilato de Estradiol (EU)', id: 'Estradiol Undesilat (EU)', th: 'เอสตราไดออล อันเดไซเลต (EU)', fil: 'Estradiol Undecylate (EU)', hi: 'एस्ट्राडियोल अंडेसाइलेट (EU)', vi: 'Estradiol Undecylate (EU)', ar: 'أونديسيلات الإستراديول (EU)', fa: 'استرادیول اوندسیلات (EU)', fr: 'Undécylate d\'Estradiol (EU)', de: 'Estradiolundecylat (EU)', tr: 'Estradiol Undesilat (EU)' },
                      slug: 'medications/estrogens/undecylate',
                    },
                  ],
                },
                {
                  label: '禁用雌激素',
                  translations: { en: 'Banned Estrogens', ja: '禁止エストロゲン', ko: '금지 에스트로겐', pt: 'Estrogênios Proibidos', ru: 'Запрещённые эстрогены', es: 'Estrógenos Prohibidos', id: 'Estrogen Terlarang', th: 'เอสโตรเจนต้องห้าม', fil: 'Mga Ipinagbabawal na Estrogen', hi: 'प्रतिबंधित एस्ट्रोजन', vi: 'Estrogen Bị Cấm', ar: 'الإستروجينات المحظورة', fa: 'استروژن‌های ممنوع', fr: 'Œstrogènes Interdits', de: 'Verbotene Östrogene', tr: 'Yasaklı Östrojenler' },
                  slug: 'medications/estrogens/banned-estrogens',
                  badge: { text: '⚠', variant: 'danger' },
                },
              ],
            },
            // ── 抗雄激素 ──
            {
              label: '抗雄激素',
              translations: { en: 'Anti-Androgens', ja: '抗アンドロゲン', ko: '항안드로겐', pt: 'Antiandrógenos', ru: 'Антиандрогены', es: 'Antiandrógenos', id: 'Antiandrogen', th: 'ยาต้านแอนโดรเจน', fil: 'Mga Antiandrogen', hi: 'एंटीएंड्रोजन', vi: 'Thuốc Kháng Androgen', ar: 'مضادات الأندروجين', fa: 'آنتی‌آندروژن‌ها', fr: 'Antiandrogènes', de: 'Antiandrogene', tr: 'Antiandrojenler' },
              items: [
                {
                  label: '概述',
                  translations: { en: 'Overview', ja: '概要', ko: '개요', pt: 'Visão Geral', ru: 'Обзор', es: 'Visión General', id: 'Ikhtisar', th: 'ภาพรวม', fil: 'Pangkalahatang-ideya', hi: 'अवलोकन', vi: 'Tổng Quan', ar: 'نظرة عامة', fa: 'مرور کلی', fr: 'Vue d\'ensemble', de: 'Übersicht', tr: 'Genel Bakış' },
                  slug: 'medications/antiandrogens/overview',
                },
                {
                  label: 'CPA（色谱龙）',
                  translations: { en: 'CPA (Cyproterone)', ja: 'CPA（酢酸シプロテロン）', ko: 'CPA (시프로테론)', pt: 'CPA (Ciproterona)', ru: 'ЦПА (Ципротерон)', es: 'CPA (Ciproterona)', id: 'CPA (Siproteron)', th: 'CPA (ไซโปรเทอโรน)', fil: 'CPA (Cyproterone)', hi: 'CPA (साइप्रोटेरोन)', vi: 'CPA (Cyproterone)', ar: 'CPA (سيبروتيرون)', fa: 'CPA (سیپروترون)', fr: 'CPA (Cyprotérone)', de: 'CPA (Cyproteron)', tr: 'CPA (Siproteron)' },
                  slug: 'medications/antiandrogens/cpa',
                  badge: { text: { 'zh-CN': '常用', en: 'Common', ja: '基本', ko: '일반', pt: 'Comum', ru: 'Часто', es: 'Común', id: 'Umum', th: 'ทั่วไป', fil: 'Karaniwan', hi: 'सामान्य', vi: 'Phổ Biến', ar: 'شائع', fa: 'رایج', fr: 'Courant', de: 'Üblich', tr: 'Yaygın' }, variant: 'tip' },
                },
                {
                  label: '螺内酯',
                  translations: { en: 'Spironolactone', ja: 'スピロノラクトン', ko: '스피로노락톤', pt: 'Espironolactona', ru: 'Спиронолактон', es: 'Espironolactona', id: 'Spironolakton', th: 'สไปโรโนแลคโตน', fil: 'Spironolactone', hi: 'स्पाइरोनोलैक्टोन', vi: 'Spironolactone', ar: 'سبيرونولاكتون', fa: 'اسپیرونولاکتون', fr: 'Spironolactone', de: 'Spironolacton', tr: 'Spironolakton' },
                  slug: 'medications/antiandrogens/spironolactone',
                },
                {
                  label: 'GnRH 激动剂',
                  translations: { en: 'GnRH Agonists', ja: 'GnRHアゴニスト', ko: 'GnRH 작용제', pt: 'Agonistas de GnRH', ru: 'Агонисты ГнРГ', es: 'Agonistas de GnRH', id: 'Agonis GnRH', th: 'ตัวกระตุ้น GnRH', fil: 'Mga GnRH Agonist', hi: 'GnRH एगोनिस्ट', vi: 'Chất Chủ Vận GnRH', ar: 'ناهضات GnRH', fa: 'آگونیست‌های GnRH', fr: 'Agonistes de la GnRH', de: 'GnRH-Agonisten', tr: 'GnRH Agonistleri' },
                  slug: 'medications/antiandrogens/gnrh-agonists',
                },
                {
                  label: '比卡鲁胺',
                  translations: { en: 'Bicalutamide', ja: 'ビカルタミド', ko: '비칼루타마이드', pt: 'Bicalutamida', ru: 'Бикалутамид', es: 'Bicalutamida', id: 'Bikalutamid', th: 'ไบคาลูตาไมด์', fil: 'Bicalutamide', hi: 'बाइकलूटामाइड', vi: 'Bicalutamide', ar: 'بيكالوتاميد', fa: 'بیکالوتامید', fr: 'Bicalutamide', de: 'Bicalutamid', tr: 'Bikalutamid' },
                  slug: 'medications/antiandrogens/bicalutamide',
                  badge: { text: { 'zh-CN': '慎用', en: 'Caution', ja: '要注意', ko: '주의', pt: 'Cautela', ru: 'Осторожно', es: 'Precaución', id: 'Hati-hati', th: 'ใช้ด้วยความระวัง', fil: 'Pag-iingat', hi: 'सावधानी', vi: 'Thận Trọng', ar: 'تحذير', fa: 'احتیاط', fr: 'Prudence', de: 'Vorsicht', tr: 'Dikkat' }, variant: 'caution' },
                },
                {
                  label: '氟他胺',
                  translations: { en: 'Flutamide', ja: 'フルタミド', ko: '플루타마이드' },
                  slug: 'medications/antiandrogens/flutamide',
                  badge: { text: { 'zh-CN': '不推荐', en: 'Avoid', ja: '非推奨', ko: '비권장' }, variant: 'danger' },
                },
                {
                  label: 'GnRH 拮抗剂',
                  translations: { en: 'GnRH Antagonists', ja: 'GnRHアンタゴニスト', ko: 'GnRH 길항제' },
                  slug: 'medications/antiandrogens/gnrh-antagonists',
                },
              ],
            },
            // ── 孕激素：扁平化，去掉推荐/替代中间层 ──
            {
              label: '孕激素',
              translations: { en: 'Progestogens', ja: 'プロゲストーゲン', ko: '프로게스토겐', pt: 'Progestógenos', ru: 'Прогестагены', es: 'Progestágenos', id: 'Progestogen', th: 'โปรเจสโตเจน', fil: 'Mga Progestogen', hi: 'प्रोजेस्टोजन', vi: 'Progestogen', ar: 'البروجستيرونات', fa: 'پروژستوژن‌ها', fr: 'Progestatifs', de: 'Gestagene', tr: 'Progestojenler' },
              collapsed: true,
              items: [
                {
                  label: '概述',
                  translations: { en: 'Overview', ja: '概要', ko: '개요', pt: 'Visão Geral', ru: 'Обзор', es: 'Visión General', id: 'Ikhtisar', th: 'ภาพรวม', fil: 'Pangkalahatang-ideya', hi: 'अवलोकन', vi: 'Tổng Quan', ar: 'نظرة عامة', fa: 'مرور کلی', fr: 'Vue d\'ensemble', de: 'Übersicht', tr: 'Genel Bakış' },
                  slug: 'medications/progestogens/overview',
                  badge: { text: { 'zh-CN': '非必需', en: 'Optional', ja: '任意', ko: '선택', pt: 'Opcional', ru: 'Необязательно', es: 'Opcional', id: 'Opsional', th: 'ไม่บังคับ', fil: 'Opsyonal', hi: 'वैकल्पिक', vi: 'Tùy Chọn', ar: 'اختياري', fa: 'اختیاری', fr: 'Facultatif', de: 'Optional', tr: 'İsteğe Bağlı' }, variant: 'note' },
                },
                {
                  label: '微粒化黄体酮',
                  translations: { en: 'Micronized Progesterone', ja: '微粉化プロゲステロン', ko: '미분화 프로게스테론', pt: 'Progesterona Micronizada', ru: 'Микронизированный прогестерон', es: 'Progesterona Micronizada', id: 'Progesteron Mikronisasi', th: 'โปรเจสเตอโรนชนิดไมโครไนซ์', fil: 'Micronized na Progesterone', hi: 'माइक्रोनाइज्ड प्रोजेस्टेरोन', vi: 'Progesterone Vi Hạt', ar: 'البروجستيرون الميكروني', fa: 'پروژسترون میکرونیزه', fr: 'Progestérone Micronisée', de: 'Mikronisiertes Progesteron', tr: 'Mikronize Progesteron' },
                  slug: 'medications/progestogens/progesterone',
                  badge: { text: { 'zh-CN': '首选', en: 'Preferred', ja: '推奨', ko: '권장', pt: 'Preferencial', ru: 'Предпочтительно', es: 'Preferido', id: 'Diutamakan', th: 'แนะนำ', fil: 'Mas Mainam', hi: 'पसंदीदा', vi: 'Ưu Tiên', ar: 'مفضّل', fa: 'ترجیحی', fr: 'Préféré', de: 'Bevorzugt', tr: 'Tercih Edilen' }, variant: 'tip' },
                },
                {
                  label: '羟孕酮注射',
                  translations: { en: 'Hydroxyprogesterone', ja: 'ヒドロキシプロゲステロン', ko: '하이드록시프로게스테론', pt: 'Hidroxiprogesterona', ru: 'Гидроксипрогестерон', es: 'Hidroxiprogesterona', id: 'Hidroksiprogesteron', th: 'ไฮดรอกซีโปรเจสเตอโรน', fil: 'Hydroxyprogesterone', hi: 'हाइड्रोक्सीप्रोजेस्टेरोन', vi: 'Hydroxyprogesterone', ar: 'هيدروكسي بروجستيرون', fa: 'هیدروکسی‌پروژسترون', fr: 'Hydroxyprogestérone', de: 'Hydroxyprogesteron', tr: 'Hidroksiprogesteron' },
                  slug: 'medications/progestogens/hydroxyprogesterone',
                },
                {
                  label: '地屈孕酮',
                  translations: { en: 'Dydrogesterone', ja: 'ジドロゲステロン', ko: '디드로게스테론', pt: 'Didrogesterona', ru: 'Дидрогестерон', es: 'Didrogesterona', id: 'Didrogesteron', th: 'ไดโดรเจสเตอโรน', fil: 'Dydrogesterone', hi: 'डाइड्रोजेस्टेरोन', vi: 'Dydrogesterone', ar: 'ديدروجستيرون', fa: 'دیدروژسترون', fr: 'Dydrogestérone', de: 'Dydrogesteron', tr: 'Didrogesteron' },
                  slug: 'medications/progestogens/dydrogesterone',
                },
                {
                  label: '屈螺酮',
                  translations: { en: 'Drospirenone', ja: 'ドロスピレノン', ko: '드로스피레논', pt: 'Drospirenona' },
                  slug: 'medications/progestogens/drospirenone',
                },
                {
                  label: '炔诺酮',
                  translations: { en: 'Norethisterone', ja: 'ノルエチステロン', ko: '노르에티스테론' },
                  slug: 'medications/progestogens/norethisterone',
                  badge: { text: { 'zh-CN': '慎用', en: 'Caution', ja: '要注意', ko: '주의' }, variant: 'caution' },
                },
                {
                  label: '不推荐孕激素 (MPA)',
                  translations: { en: 'Not Recommended (MPA)', ja: '非推奨 (MPA)', ko: '비권장 (MPA)', pt: 'Não Recomendado (MPA)' },
                  slug: 'medications/progestogens/cautioned-progestins',
                  badge: { text: '⚠', variant: 'danger' },
                },
              ],
            },
            // ── 5α-还原酶抑制剂 ──
            {
              label: '5α-还原酶抑制剂',
              translations: { en: '5α-Reductase Inhibitors', ja: '5α還元酵素阻害薬', ko: '5α-환원효소 억제제', pt: 'Inibidores da 5α-Redutase' },
              collapsed: true,
              autogenerate: { directory: 'medications/five-alpha-reductase' },
            },
            // ── 绝对禁用药物 ──
            {
              label: '绝对禁用药物',
              translations: { en: 'Banned Drugs', ja: '使用禁止薬物', ko: '사용 금지 약물', pt: 'Medicamentos Proibidos' },
              slug: 'medications/banned-drugs',
              badge: { text: '⚠', variant: 'danger' },
            },
          ],
        },
        // ── 药物对比 ──
        {
          label: '药物对比',
          translations: { en: 'Comparisons', ja: '薬物比較', ko: '약물 비교', pt: 'Comparações' },
          collapsed: true,
          items: [
            { label: 'CPA vs 螺内酯', translations: { en: 'CPA vs Spironolactone', ja: 'CPA vs スピロノラクトン', ko: 'CPA vs 스피로노락톤', pt: 'CPA vs Espironolactona' }, slug: 'compare/cpa-vs-spironolactone' },
            { label: '口服 vs 注射', translations: { en: 'Oral vs Injection', ja: '経口 vs 注射', ko: '경구 vs 주사', pt: 'Oral vs Injeção' }, slug: 'compare/oral-vs-injection' },
            { label: '凝胶 vs 贴片', translations: { en: 'Gel vs Patch', ja: 'ゲル vs パッチ', ko: '겔 vs 패치', pt: 'Gel vs Adesivo' }, slug: 'compare/gel-vs-patch' },
          ],
        },
        // ── 专题与工具 ──
        {
          label: '专题与工具',
          translations: { en: 'Topics & Tools', ja: '特集とツール', ko: '특집 및 도구', pt: 'Tópicos e Ferramentas' },
          items: [
            {
              label: '工具总览',
              translations: { en: 'All Tools', ja: 'ツール一覧', ko: '도구 모음', pt: 'Todas as Ferramentas' },
              slug: 'tools',
            },
            {
              label: '血检自查工具',
              translations: { en: 'Blood Test Checker', ja: '血液検査チェッカー', ko: '혈액 검사 체커', pt: 'Verificador de Exames de Sangue' },
              slug: 'tools/blood-checker',
              badge: { text: { 'zh-CN': '常用', en: 'Popular', ja: '人気', ko: '인기', pt: 'Popular' }, variant: 'success' },
            },
            {
              label: '注射剂量换算',
              translations: { en: 'Injection Calculator', ja: '注射量計算機', ko: '주사 용량 계산기', pt: 'Calculadora de Injeção' },
              slug: 'tools/injection-calculator',
              badge: { text: { 'zh-CN': '常用', en: 'Popular', ja: '人気', ko: '인기', pt: 'Popular' }, variant: 'success' },
            },
            { label: '剂量模拟器', translations: { en: 'Dose Simulator', ja: '用量シミュレーター', ko: '용량 시뮬레이터', pt: 'Simulador de Dose' }, slug: 'tools/dose-simulator' },
            { label: 'AI 问答助手', translations: { en: 'AI Assistant', ja: 'AIアシスタント', ko: 'AI 어시스턴트', pt: 'Assistente de IA' }, slug: 'tools/ai-assistant' },
            { label: '友好医疗资源', translations: { en: 'Medical Directory', ja: '医療施設情報', ko: '의료 시설 정보', pt: 'Diretório Médico' }, slug: 'tools/hospital-finder' },
            { label: '药物比较器', translations: { en: 'Drug Comparator', ja: '薬物比較ツール', ko: '약물 비교 도구', pt: 'Comparador de Medicamentos' }, slug: 'tools/drug-comparator' },
            { label: '风险自评', translations: { en: 'Risk Screener', ja: 'リスク自己評価', ko: '위험 자가 평가', pt: 'Triagem de Risco' }, slug: 'tools/risk-screener' },
            { label: '品牌索引', translations: { en: 'Brand Index', ja: 'ブランド索引', ko: '브랜드 색인', pt: 'Índice de Marcas' }, slug: 'tools/brand-index' },
            { label: '速查卡片', translations: { en: 'Drug Cards', ja: 'クイックカード', ko: '퀵 카드', pt: 'Cartões de Medicamentos' }, slug: 'tools/drug-cards', badge: { text: { 'zh-CN': '新', en: 'New', ja: '新', ko: '새', pt: 'Novo' }, variant: 'success' } },
          ],
        },
        // ── 专题文章（博客目前仅中文，其他语言可看作"占位" group）──
        {
          label: '专题文章',
          translations: { en: 'Articles', ja: '特集記事', ko: '특집 기사', pt: 'Artigos' },
          items: [
            {
              label: '所有博客',
              translations: { en: 'All Posts (Chinese only)', ja: '全記事（中国語のみ）', ko: '전체 기사 (중국어)', pt: 'Todos os Artigos (apenas em chinês)' },
              link: '/zh/blog/',
            },
          ],
        },
        // ── 附录 ──
        {
          label: '附录',
          translations: { en: 'Appendix', ja: '付録', ko: '부록', pt: 'Apêndice' },
          collapsed: true,
          items: [
            { label: '关于本站', translations: { en: 'About', ja: 'サイトについて', ko: '사이트 소개', pt: 'Sobre' }, slug: 'about' },
            { label: '内容方法学', translations: { en: 'Methodology', ja: 'コンテンツ方法論', ko: '콘텐츠 방법론', pt: 'Metodologia' }, slug: 'methodology' },
            { label: '医学顾问', translations: { en: 'Medical Advisors', ja: '医学顧問', ko: '의학 자문', pt: 'Consultores Médicos' }, slug: 'medical-advisors' },
            { label: '编辑政策', translations: { en: 'Editorial Policy', ja: '編集方針', ko: '편집 정책', pt: 'Política Editorial' }, slug: 'editorial-policy' },
            { label: '参考文献库', translations: { en: 'Reference Library', ja: '参考文献ライブラリ', ko: '참고 문헌 라이브러리', pt: 'Biblioteca de Referências' }, slug: 'appendix-references' },
            { label: '反馈与纠错', translations: { en: 'Feedback', ja: 'フィードバック', ko: '피드백', pt: 'Feedback' }, slug: 'feedback' },
          ],
        },
      ],
      head: [
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: '#0D0B14' },
        },
        // OG Image for social sharing
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: 'https://hrtyaku.com/og-image.svg' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:width', content: '1200' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:height', content: '630' },
        },
        // Twitter Card
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: 'https://hrtyaku.com/og-image.svg' },
        },
        // Google Fonts — preconnect + stylesheet
        // CJK fonts auto-subset via unicode-range (~80-150KB per page instead of 6MB)
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'preload',
            as: 'style',
            href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&family=Manrope:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;600;700&family=Noto+Serif+KR:wght@400;600;700&family=Noto+Serif+SC:wght@400;600;700&family=Space+Grotesk:wght@300;500;700&display=swap',
            onload: "this.onload=null;this.rel='stylesheet'",
          },
        },
        // Fallback for no-JS browsers
        {
          tag: 'noscript',
          content: '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400&family=Manrope:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&family=Noto+Serif+JP:wght@400;600;700&family=Noto+Serif+SC:wght@400;600;700&family=Space+Grotesk:wght@300;500;700&display=swap" />',
        },
      ],
    }),
    react(),
  ],
});
