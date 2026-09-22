/**
 * Material Price Index Database (بورصة ومؤشر أسعار الخامات)
 * بيانات استرشادية يومية دقيقة لمواد البناء والتشطيب لمصر والسعودية
 */

export const MATERIAL_CATEGORIES = [
  { id: 'all',        name: 'كافة الخامات',       icon: 'Layers',      badge: 'الكل' },
  { id: 'steel',      name: 'حديد التسليح والمعادن', icon: 'Shield',      badge: 'الحديد' },
  { id: 'cement',     name: 'الإسمنت والجبس',      icon: 'Building2',   badge: 'الإسمنت' },
  { id: 'electrical', name: 'أسلاك وكابلات الكهرباء', icon: 'Zap',        badge: 'الكهرباء' },
  { id: 'plumbing',   name: 'السباكة والتغذية',    icon: 'Droplets',    badge: 'السباكة' },
  { id: 'masonry',    name: 'الطوب والرمل والسن',   icon: 'Grid',        badge: 'البناء' },
  { id: 'tiles',      name: 'السيراميك والرخام',   icon: 'Square',      badge: 'السيراميك' },
  { id: 'paints',     name: 'الدهانات والمحارة',    icon: 'Paintbrush',  badge: 'الدهانات' },
  { id: 'gypsum',     name: 'الجبس بورد والأخشاب', icon: 'FileSpreadsheet', badge: 'الديكور' },
];

export const INITIAL_MATERIAL_PRICES = {
  // 🇪🇬 جمهورية مصر العربية (بالجنيه المصري EGP)
  EG: {
    countryName: 'مصر',
    currency: 'ج.م',
    currencyEn: 'EGP',
    flag: '🇪🇬',
    lastUpdated: 'اليوم، 09:30 صباحاً',
    marketStatus: 'مستقر مع حركة تصاعدية طفيفة في قطاع الكابلات',
    items: [
      // ── حديد التسليح ──
      {
        id: 'eg_steel_ezz',
        name: 'حديد عز الدخيلة (أرض المصنع)',
        category: 'steel',
        unit: 'طن',
        minPrice: 38500,
        maxPrice: 39800,
        avgPrice: 39150,
        change: 0.0,
        trend: 'stable',
        advice: 'سعر مستقر، مناسب جداً للتعاقد الفوري',
        brand: 'عز الدخيلة',
        specs: 'مطابق للمواصفات القياسية المصرية B500DWR'
      },
      {
        id: 'eg_steel_beshay',
        name: 'حديد بشاي للصلب',
        category: 'steel',
        unit: 'طن',
        minPrice: 38200,
        maxPrice: 39200,
        avgPrice: 38700,
        change: -0.5,
        trend: 'down',
        advice: 'تراجع طفيف يتيح فرصة شراء جيدة',
        brand: 'بشاي',
        specs: 'عالي المقاومة ومطابق للكود الإنشائي'
      },
      {
        id: 'eg_steel_suez',
        name: 'حديد السويس للصلب',
        category: 'steel',
        unit: 'طن',
        minPrice: 37800,
        maxPrice: 38700,
        avgPrice: 38250,
        change: 0.0,
        trend: 'stable',
        advice: 'سعر متوازن وتوفر ممتاز في السوق',
        brand: 'السويس',
        specs: 'صلب تسليح قياسي معتمد'
      },
      {
        id: 'eg_steel_marakby',
        name: 'حديد المراكبي والجيوشي',
        category: 'steel',
        unit: 'طن',
        minPrice: 37200,
        maxPrice: 38000,
        avgPrice: 37600,
        change: +0.8,
        trend: 'up',
        advice: 'طلب متزايد وتوقع صعود خفيف',
        brand: 'المراكبي / الجيوشي',
        specs: 'درجة أولى تجاري واستثماري'
      },

      // ── الإسمنت والجبس ──
      {
        id: 'eg_cement_sewedy',
        name: 'أسمنت السويدي المقاوم والمسلح (بورتلاندي 42.5)',
        category: 'cement',
        unit: 'طن (20 شيكارة)',
        minPrice: 2850,
        maxPrice: 2980,
        avgPrice: 2915,
        change: +1.2,
        trend: 'up',
        advice: 'ارتفاع طفيف في تكلفة النقل، أمن كمياتك',
        brand: 'السويدي',
        specs: 'رتبة 42.5N فائق التحمل للخرسانات'
      },
      {
        id: 'eg_cement_mosallah',
        name: 'أسمنت المسلح / النصر',
        category: 'cement',
        unit: 'طن (20 شيكارة)',
        minPrice: 2750,
        maxPrice: 2850,
        avgPrice: 2800,
        change: 0.0,
        trend: 'stable',
        advice: 'سعر ممتاز وثابت لأعمال البناء والمحارة',
        brand: 'المسلح',
        specs: 'بورتلاندي عادي عالي الجودة'
      },
      {
        id: 'eg_cement_white',
        name: 'أسمنت رويال / سيناء أبيض',
        category: 'cement',
        unit: 'شيكارة 50كجم',
        minPrice: 195,
        maxPrice: 215,
        avgPrice: 205,
        change: 0.0,
        trend: 'stable',
        advice: 'مستقر ومثالي لأعمال المصيص والواجهات',
        brand: 'رويال سيناء',
        specs: 'بياض ناصع وتشغيلية فائقة'
      },
      {
        id: 'eg_gypsum_sina',
        name: 'جبس سيناء / الدولية نمرة 1',
        category: 'cement',
        unit: 'شيكارة 40كجم',
        minPrice: 80,
        maxPrice: 95,
        avgPrice: 88,
        change: 0.0,
        trend: 'stable',
        advice: 'سعر هادئ ومتوفر في كافة المحافظات',
        brand: 'سيناء',
        specs: 'شك سريع ومقاوم للشروخ'
      },

      // ── أسلاك وكابلات الكهرباء ──
      {
        id: 'eg_elec_sewedy_1_5',
        name: 'سلك نحاس معتمد السويدي الأصلي 1.5 مم (لفة 100م)',
        category: 'electrical',
        unit: 'لفة 100م',
        minPrice: 1280,
        maxPrice: 1390,
        avgPrice: 1335,
        change: +1.8,
        trend: 'up',
        advice: 'تأثر بأسعار النحاس العالمية، بادر بالشراء',
        brand: 'السويدي إليكتريك',
        specs: 'نحاس نقي 99.9% معزول PVC مرن'
      },
      {
        id: 'eg_elec_sewedy_2_5',
        name: 'سلك نحاس السويدي الأصلي 2.5 مم (إنارة ومخارج)',
        category: 'electrical',
        unit: 'لفة 100م',
        minPrice: 1980,
        maxPrice: 2150,
        avgPrice: 2065,
        change: +1.5,
        trend: 'up',
        advice: 'الأكثر طلباً للبرايز، تأكد من كود العلامة المائية',
        brand: 'السويدي إليكتريك',
        specs: 'مقاوم للحرارة حتى 70 درجة مئوية'
      },
      {
        id: 'eg_elec_sewedy_4',
        name: 'سلك نحاس السويدي الأصلي 4 مم (تكييفات وسخانات)',
        category: 'electrical',
        unit: 'لفة 100م',
        minPrice: 3100,
        maxPrice: 3350,
        avgPrice: 3225,
        change: +1.9,
        trend: 'up',
        advice: 'طلب مرتفع لتأسيس تكييفات الصيف',
        brand: 'السويدي إليكتريك',
        specs: 'يتحمل حتى 32 أمبير متواصل'
      },
      {
        id: 'eg_elec_sewedy_6',
        name: 'سلك نحاس السويدي الأصلي 6 مم (صواعد وتغذية لوحات)',
        category: 'electrical',
        unit: 'لفة 100م',
        minPrice: 4600,
        maxPrice: 4950,
        avgPrice: 4775,
        change: +2.1,
        trend: 'up',
        advice: 'تحرك سعري ملحوظ، راجع التكلفة قبل المقايسة',
        brand: 'السويدي إليكتريك',
        specs: 'كود عالمي معتمد لكافة اللوحات الرئيسية'
      },

      // ── السباكة والتغذية ──
      {
        id: 'eg_plumb_banninger_3_4',
        name: 'مواسير بوليمر ألماني Bänninger أو BR قطر 3/4 بوصة (4 متر)',
        category: 'plumbing',
        unit: 'عود 4 متر',
        minPrice: 195,
        maxPrice: 220,
        avgPrice: 208,
        change: 0.0,
        trend: 'stable',
        advice: 'سعر مستقر وضمان 10 سنوات من الوكيل',
        brand: 'Bänninger / BR',
        specs: 'بولي بروبيلين عالي الضغط PN20'
      },
      {
        id: 'eg_plumb_shereef_drain',
        name: 'مواسير صرف أبيض PVC الشريف 4 بوصة (سمك 3.2 مم)',
        category: 'plumbing',
        unit: 'ماسورة 4 متر',
        minPrice: 380,
        maxPrice: 420,
        avgPrice: 400,
        change: 0.0,
        trend: 'stable',
        advice: 'سعر معتدل ومتوفر مع كافة لوازم الصرف',
        brand: 'الشريف',
        specs: 'مقاوم للصدمات والكيماويات المنزلية'
      },
      {
        id: 'eg_plumb_valve_italy',
        name: 'محبس دفن نحاس إيطالي أصلي 3/4 بوصة',
        category: 'plumbing',
        unit: 'قطعة',
        minPrice: 420,
        maxPrice: 490,
        avgPrice: 455,
        change: +0.9,
        trend: 'up',
        advice: 'تأكد من الختم الإيطالي الأصلي تجنباً للمقلد',
        brand: 'ايطالي معتمد',
        specs: 'قلب سيراميك نحاس ثقيل مانع للتسريب'
      },

      // ── الطوب والرمل والسن ──
      {
        id: 'eg_brick_red',
        name: 'طوب أحمر طفلي مقاس 24×11×6 سم (ألف طوبة)',
        category: 'masonry',
        unit: 'ألف طوبة',
        minPrice: 1650,
        maxPrice: 1850,
        avgPrice: 1750,
        change: 0.0,
        trend: 'stable',
        advice: 'شامل التعتيق والتوصيل بأغلب أحياء القاهرة والجيزة',
        brand: 'مصانع عرب أبو ساعد',
        specs: 'مفرغ درجة أولى مستوي الحواف'
      },
      {
        id: 'eg_sand_rough',
        name: 'رمل حرش ناعم ومغسول (متر مكعب)',
        category: 'masonry',
        unit: 'م³ (سيارة 4 إلى 10م)',
        minPrice: 140,
        maxPrice: 175,
        avgPrice: 158,
        change: 0.0,
        trend: 'stable',
        advice: 'احرص على الرمل المغسول لضمان جودة المحارة',
        brand: 'رمل محاجر السويس / أكتوبر',
        specs: 'خالي من الشوائب الطينية والأملاح'
      },
      {
        id: 'eg_gravel_sen',
        name: 'سن 1 أو سن 2 ممتاز للخرسانات (متر مكعب)',
        category: 'masonry',
        unit: 'م³',
        minPrice: 280,
        maxPrice: 330,
        avgPrice: 305,
        change: 0.0,
        trend: 'stable',
        advice: 'سعر مستقر ومتوفر للتوريد الفوري للموقع',
        brand: 'محاجر عتاقة',
        specs: 'مدرج وصلد عالي مقاومة الانضغاط'
      },

      // ── السيراميك والبورسلين والرخام ──
      {
        id: 'eg_tile_cleo_first',
        name: 'سيراميك أرضيات كليوباترا فرز أول (موديلات حديثة)',
        category: 'tiles',
        unit: 'متر مربع (م²)',
        minPrice: 175,
        maxPrice: 240,
        avgPrice: 205,
        change: -1.0,
        trend: 'down',
        advice: 'عروض وتخفيضات موسمية ممتازة لدى المعارض',
        brand: 'كليوباترا',
        specs: 'مقاوم للبري والاحتكاك ليزر كت'
      },
      {
        id: 'eg_porcelain_import',
        name: 'بورسلين هندي / إسباني 60×120 سم لامع ومط',
        category: 'tiles',
        unit: 'متر مربع (م²)',
        minPrice: 420,
        maxPrice: 650,
        avgPrice: 535,
        change: +0.5,
        trend: 'up',
        advice: 'طلب كبير على مقاسات 60×120، ركب بمادة لاصقة',
        brand: 'مستورد هندي / إسباني',
        specs: 'امتصاص ماء أقل من 0.5% حواف ليزر دقيقة'
      },
      {
        id: 'eg_marble_galala',
        name: 'رخام جلالة فص / سادة ترابيع ودرج (سماكة 2 سم)',
        category: 'tiles',
        unit: 'متر مربع (م²)',
        minPrice: 320,
        maxPrice: 450,
        avgPrice: 385,
        change: 0.0,
        trend: 'stable',
        advice: 'الخيار الوطني الأفضل لجودة وسعر الأدراج والمداخل',
        brand: 'محاجر الجلالة',
        specs: 'صلابة عالية ولمعان طبيعي بعد الجلي'
      },

      // ── الدهانات والمحارة ──
      {
        id: 'eg_paint_jotun_fenomastic',
        name: 'دهان جوتن فينوماستيك ماي هوم (بستلة 14 لتر)',
        category: 'paints',
        unit: 'بستلة 14 لتر',
        minPrice: 2450,
        maxPrice: 2850,
        avgPrice: 2650,
        change: +0.6,
        trend: 'up',
        advice: 'الخيار الأول للتشطيب الفاخر الترا سوبر لوكس',
        brand: 'جوتن Jotun',
        specs: 'قابل للغسيل الفائق ويدوم لسنوات دون بهتان'
      },
      {
        id: 'eg_paint_glc_super',
        name: 'دهان بلاستيك GLC سوبر دايتون 3030 (بستلة 14 لتر)',
        category: 'paints',
        unit: 'بستلة 14 لتر',
        minPrice: 950,
        maxPrice: 1150,
        avgPrice: 1050,
        change: 0.0,
        trend: 'stable',
        advice: 'القيمة الأعلى مقابل السعر للبطانات والتشطيب الاقتصادي',
        brand: 'GLC',
        specs: 'بياض عالي وتغطية ممتازة للمتر المربع'
      },
      {
        id: 'eg_putty_saveto',
        name: 'معجون حوائط سافيتو فيتونيت داخلي (شيكارة 20كجم)',
        category: 'paints',
        unit: 'شيكارة 20كجم',
        minPrice: 165,
        maxPrice: 195,
        avgPrice: 180,
        change: 0.0,
        trend: 'stable',
        advice: 'أساسي لمعالجة عيوب المحارة ونعومة السطح',
        brand: 'سافيتو Saveto',
        specs: 'أساس أسمنتي بوليمري عالي الالتصاق'
      },

      // ── الجبس بورد والأخشاب ──
      {
        id: 'eg_gypsum_knauf_green',
        name: 'لوح جبسوم بورد كناوف ألماني أخضر مقاوم للرطوبة (1.2×2.4م)',
        category: 'gypsum',
        unit: 'لوح 12.5 مم',
        minPrice: 280,
        maxPrice: 320,
        avgPrice: 300,
        change: 0.0,
        trend: 'stable',
        advice: 'ضروري للحمامات والمطابخ والواجهات الرطبة',
        brand: 'كناوف Knauf',
        specs: 'سماكة 12.5 مم معالج بالسيليكون والألياف'
      },
      {
        id: 'eg_wood_mosky',
        name: 'خشب موسكي سويدي فرز أول للأبواب والحلوق (متر مكعب)',
        category: 'gypsum',
        unit: 'متر مكعب (م³)',
        minPrice: 17500,
        maxPrice: 19800,
        avgPrice: 18650,
        change: +1.0,
        trend: 'up',
        advice: 'موسم توريد الأبواب، تأكد من نسبة الرطوبة قبل التصنيع',
        brand: 'سويدي مستورد',
        specs: 'خالي من العقد الخبيثة ومشبع جفاف طبيعي'
      }
    ]
  },

  // 🇸🇦 المملكة العربية السعودية (بالريال السعودي SAR)
  SA: {
    countryName: 'السعودية',
    currency: 'ر.س',
    currencyEn: 'SAR',
    flag: '🇸🇦',
    lastUpdated: 'اليوم، 10:00 صباحاً',
    marketStatus: 'استقرار كبير في أسعار الحديد والإسمنت مع طلب قوي في الرياض وجدة',
    items: [
      {
        id: 'sa_steel_sabic',
        name: 'حديد تسليح سابك (SABIC)',
        category: 'steel',
        unit: 'طن',
        minPrice: 2750,
        maxPrice: 2900,
        avgPrice: 2825,
        change: 0.0,
        trend: 'stable',
        advice: 'أعلى معايير الجودة في المملكة ومطابق للكود السعودي',
        brand: 'سابك SABIC',
        specs: 'حديد عالي المقاومة متطابق مع SASO'
      },
      {
        id: 'sa_steel_itfaq',
        name: 'حديد الاتفاق (Al-Ittefaq)',
        category: 'steel',
        unit: 'طن',
        minPrice: 2650,
        maxPrice: 2800,
        avgPrice: 2725,
        change: -0.4,
        trend: 'down',
        advice: 'سعر منافس جداً للمشاريع السكنية والفلل',
        brand: 'الاتفاق',
        specs: 'جودة معتمدة لدى كبرى مكاتب الإشراف'
      },
      {
        id: 'sa_cement_yamama',
        name: 'أسمنت اليمامة / القصيم بورتلاندي عادي',
        category: 'cement',
        unit: 'كيس 50كجم',
        minPrice: 14.5,
        maxPrice: 16.5,
        avgPrice: 15.5,
        change: 0.0,
        trend: 'stable',
        advice: 'متوفر بوفرة في كافة مستودعات المواد الإنشائية',
        brand: 'أسمنت اليمامة',
        specs: 'مطابق للمواصفة القياسية السعودية GSO'
      },
      {
        id: 'sa_cement_resisting',
        name: 'أسمنت مقاوم للأملاح والكبريتات (Type V)',
        category: 'cement',
        unit: 'كيس 50كجم',
        minPrice: 16.0,
        maxPrice: 18.0,
        avgPrice: 17.0,
        change: 0.0,
        trend: 'stable',
        advice: 'أساسي للقواعد والرقاب والميد العازلة',
        brand: 'اليمامة / الرياض',
        specs: 'مقاوم للتربة الكبريتية والرطوبة'
      },
      {
        id: 'sa_elec_riyadh_2_5',
        name: 'أسلاك نحاس كابلات الرياض 2.5 مم (لفة 100 ياردة)',
        category: 'electrical',
        unit: 'لفة',
        minPrice: 145,
        maxPrice: 165,
        avgPrice: 155,
        change: +0.8,
        trend: 'up',
        advice: 'الاسم الأول في التأسيس المعتمد في كود البناء السعودي',
        brand: 'كابلات الرياض',
        specs: 'نحاس نقي معتمد من شركة الكهرباء السعودية SEC'
      },
      {
        id: 'sa_elec_fanar_4',
        name: 'أسلاك الفنار الأصلية 4 مم للتكييف والمطابخ',
        category: 'electrical',
        unit: 'لفة',
        minPrice: 220,
        maxPrice: 245,
        avgPrice: 232,
        change: +1.0,
        trend: 'up',
        advice: 'جودة لا خلاف عليها وضمان أمان عالي ضد الحرائق',
        brand: 'الفنار Alfanar',
        specs: 'عوازل خالية من الهالوجين ومقاومة للهب'
      },
      {
        id: 'sa_plumb_nepro_pipe',
        name: 'أنابيب نبرو للبلاستيك CPVC حار/بارد 3/4 بوصة',
        category: 'plumbing',
        unit: 'حبة 6 متر',
        minPrice: 42,
        maxPrice: 50,
        avgPrice: 46,
        change: 0.0,
        trend: 'stable',
        advice: 'المعيار الذهبي لشبكات التغذية الداخلية بالفلل',
        brand: 'نبرو Nepro',
        specs: 'يتحمل حتى 82 درجة مئوية وضغط عالي'
      },
      {
        id: 'sa_tile_ceramic_saudi',
        name: 'سيراميك الخزف السعودي للأرضيات نخب أول',
        category: 'tiles',
        unit: 'متر مربع (م²)',
        minPrice: 38,
        maxPrice: 58,
        avgPrice: 48,
        change: -0.5,
        trend: 'down',
        advice: 'تصاميم حديثة بديل رخام وخشب بأسعار ممتازة',
        brand: 'الخزف السعودي',
        specs: 'فرز أول دقيق ومقاوم لامتصاص الماء'
      },
      {
        id: 'sa_paint_jazeera_novel',
        name: 'دهان دهانات الجزيرة نوفل مظهر حريري (برميل)',
        category: 'paints',
        unit: 'برميل 18 لتر',
        minPrice: 310,
        maxPrice: 360,
        avgPrice: 335,
        change: 0.0,
        trend: 'stable',
        advice: 'خالي من الروائح ومقاوم للبقع وسهل التنظيف جداً',
        brand: 'دهانات الجزيرة',
        specs: 'صديق للبيئة Green Guard Gold'
      },
      {
        id: 'sa_gypsum_mada',
        name: 'ألواح جبس مدى Mada Board عادي ومقاوم للرطوبة',
        category: 'gypsum',
        unit: 'لوح (1.2×2.4م)',
        minPrice: 28,
        maxPrice: 35,
        avgPrice: 31.5,
        change: 0.0,
        trend: 'stable',
        advice: 'الخيار الرائد للأسقف المستعارة وتجاويف الإضاءة المخفية',
        brand: 'جبس مدى Mada',
        specs: 'سماكة 12.5 مم معتمد من الدفاع المدني السعودي'
      }
    ]
  }
};

const STORAGE_KEY = 'tashteeb_custom_material_prices_v1';

/**
 * جلب قائمة أسعار الخامات لبلد معين مع دمج أي تعديلات مخصصة للشركة
 */
export function getMaterialPrices(countryCode = 'EG') {
  const code = (countryCode || 'EG').toUpperCase();
  const baseData = INITIAL_MATERIAL_PRICES[code] || INITIAL_MATERIAL_PRICES.EG;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseData;
    const overrides = JSON.parse(raw);
    const countryOverrides = overrides[code];
    if (!countryOverrides || typeof countryOverrides !== 'object') return baseData;

    const mergedItems = baseData.items.map(item => {
      if (countryOverrides[item.id]) {
        return {
          ...item,
          ...countryOverrides[item.id],
          isCustomized: true,
        };
      }
      return item;
    });

    return {
      ...baseData,
      items: mergedItems,
    };
  } catch (e) {
    console.warn('[getMaterialPrices] error reading overrides:', e);
    return baseData;
  }
}

/**
 * حفظ تعديل سعر مادة محددة لصالح الشركة
 */
export function saveMaterialPriceOverride(countryCode, itemId, partialData) {
  const code = (countryCode || 'EG').toUpperCase();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (!all[code]) all[code] = {};
    all[code][itemId] = {
      ...(all[code][itemId] || {}),
      ...partialData,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    console.error('[saveMaterialPriceOverride] error:', e);
    return false;
  }
}

/**
 * إعادة تعيين الأسعار للقيم الافتراضية الرسمية للسوق
 */
export function resetMaterialPricesToDefault(countryCode) {
  const code = (countryCode || 'EG').toUpperCase();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const all = JSON.parse(raw);
    delete all[code];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * إنشاء نص رسالة النشرة اليومية لمشاركتها على واتساب
 */
export function generateMarketBriefWhatsAppText(countryCode = 'EG') {
  const data = getMaterialPrices(countryCode);
  const dateStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  let msg = `📊 *نشرة أسعار خامات البناء والتشطيب اليومية* 🏗️\n`;
  msg += `📍 *السوق:* ${data.countryName} ${data.flag} | ${dateStr}\n`;
  msg += `💡 *حالة السوق:* ${data.marketStatus}\n`;
  msg += `─────────────────────────\n\n`;

  // أهم المواد المختارة
  const highlights = data.items.filter(i => 
    i.id.includes('steel_ezz') || 
    i.id.includes('steel_sabic') || 
    i.id.includes('cement_sewedy') || 
    i.id.includes('cement_yamama') || 
    i.id.includes('elec_sewedy_2_5') || 
    i.id.includes('elec_fanar_4') ||
    i.id.includes('tile_cleo') ||
    i.id.includes('paint_jotun')
  );

  highlights.forEach(item => {
    const trendIcon = item.change > 0 ? '📈 صاعد (+)' : item.change < 0 ? '📉 هابط (-)' : '⏸️ مستقر';
    msg += `🔹 *${item.name}*\n`;
    msg += `   السعر: ${item.avgPrice.toLocaleString()} ${data.currency} / ${item.unit}\n`;
    msg += `   الاتجاه: ${trendIcon} ${item.change !== 0 ? Math.abs(item.change) + '%' : ''}\n\n`;
  });

  msg += `─────────────────────────\n`;
  msg += `📱 *تم الاستخراج آلياً عبر منصة تشطيب برو لإدارة المقاولات والمشاريع*\n`;
  msg += `🌐 https://tashteebpro.com`;

  return msg;
}
