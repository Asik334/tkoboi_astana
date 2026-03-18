// TKOBOI ASTANA — Каталог товаров
const CATEGORIES = [
  { id:'fabric', name:'Тканевые обои', icon:'🎨', count: 48 },
  { id:'bamboo', name:'Бамбук панели', icon:'🌿', count: 24 },
  { id:'tools', name:'Инструменты', icon:'🛠️', count: 16 },
  { id:'glue', name:'Клей и грунт', icon:'🧴', count: 12 },
  { id:'decor', name:'Декор стен', icon:'🏠', count: 20 },
  { id:'catalog_books', name:'Каталоги', icon:'📖', count: 8 },
];

const PRODUCTS = [
  // ── ТКАНЕВЫЕ ОБОИ ───────────────────────────────────────────
  { id:1, name:'Тканевые обои AFART SR19 (серый лён)', cat:'fabric', catName:'Тканевые обои', price:4800, oldPrice:5500, rating:4.9, reviews:87, badge:'sale',
    img:'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=600&h=450&fit=crop&auto=format',
    imgs:[
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&h=520&fit=crop&auto=format',
    ],
    inStock:true, specs:[['Коллекция','SR19'],['Материал','100% лён'],['Ширина рулона','1.06 м'],['Длина рулона','10 м'],['Покрытие','Виниловое']],
    desc:'Премиальные тканевые обои на льняной основе. Идеально подходят для гостиных и спален. Устойчивы к выцветанию, легко моются.' },

  { id:2, name:'Тканевые обои S29 (бежевый нубук)', cat:'fabric', catName:'Тканевые обои', price:5200, oldPrice:null, rating:4.8, reviews:54, badge:'new',
    img:'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&h=450&fit=crop&auto=format',
    imgs:[
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&h=520&fit=crop&auto=format',
    ],
    inStock:true, specs:[['Коллекция','S29'],['Материал','Нубук + ткань'],['Ширина рулона','1.06 м'],['Длина рулона','10 м'],['Стиль','Минимализм']],
    desc:'Нежные бежевые обои с эффектом нубука. Создают уютную и тёплую атмосферу. Подходят к любому современному интерьеру.' },

  { id:3, name:'Тканевые обои Y12 (шоколад)', cat:'fabric', catName:'Тканевые обои', price:4500, oldPrice:5000, rating:4.7, reviews:41, badge:'sale',
    img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=450&fit=crop&auto=format',
    imgs:[
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&h=520&fit=crop&auto=format',
    ],
    inStock:true, specs:[['Коллекция','Y12'],['Цвет','Шоколадный коричневый'],['Ширина рулона','1.06 м'],['Длина рулона','10 м'],['Фактура','Рогожка']],
    desc:'Насыщенные шоколадные обои с фактурой рогожки. Придают помещению солидность и глубину. Отлично смотрятся в кабинетах и прихожих.' },

  { id:4, name:'Тканевые обои BE2 (синий велюр)', cat:'fabric', catName:'Тканевые обои', price:6100, oldPrice:null, rating:4.9, reviews:29, badge:'new',
    img:'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=600&h=450&fit=crop&auto=format',
    imgs:[
      'https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=700&h=520&fit=crop&auto=format',
    ],
    inStock:true, specs:[['Коллекция','BE2'],['Материал','Велюр'],['Цвет','Глубокий синий'],['Ширина','1.06 м'],['Длина','10 м']],
    desc:'Роскошные обои из велюровой ткани насыщенного синего цвета. Для акцентной стены или полного оформления. Премиум-класс.' },

  { id:5, name:'Тканевые обои Y10 (графит)', cat:'fabric', catName:'Тканевые обои', price:4900, oldPrice:5400, rating:4.6, reviews:63, badge:'sale',
    img:'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&h=450&fit=crop&auto=format',
    imgs:[
      'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&h=520&fit=crop&auto=format',
    ],
    inStock:true, specs:[['Коллекция','Y10'],['Цвет','Графит'],['Ширина','1.06 м'],['Длина','10 м'],['Покрытие','Антибактериальное']],
    desc:'Строгие графитовые обои для современных интерьеров. Создают стильный контраст с белой мебелью.' },

  { id:6, name:'Тканевые обои WG3 (молочный шёлк)', cat:'fabric', catName:'Тканевые обои', price:5800, oldPrice:null, rating:5.0, reviews:18, badge:'hot',
    img:'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=450&fit=crop&auto=format',
    imgs:[
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=700&h=520&fit=crop&auto=format',
    ],
    inStock:true, specs:[['Коллекция','WG3'],['Материал','Шёлк'],['Цвет','Молочный'],['Ширина','1.06 м'],['Длина','10 м']],
    desc:'Шёлковые обои с перламутровым блеском. Премиальный материал для спален и гостиных. Создают ощущение роскоши.' },

  // ── БАМБУКОВЫЕ ПАНЕЛИ ───────────────────────────────────────
  { id:7, name:'Бамбук панели натуральные 3D (светлый)', cat:'bamboo', catName:'Бамбук панели', price:8900, oldPrice:10500, rating:4.8, reviews:76, badge:'sale',
    img:'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&h=450&fit=crop&auto=format',
    imgs:[
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=700&h=520&fit=crop&auto=format',
    ],
    inStock:true, specs:[['Материал','100% бамбук'],['Размер панели','2800×600 мм'],['Толщина','8 мм'],['Цвет','Натуральный'],['Покрытие','Лаковое']],
    desc:'Экологически чистые бамбуковые панели для отделки стен. Лёгкий монтаж, не требует специнструмента. Создают эффект природного декора.' },

  { id:8, name:'Бамбук панели тёмные (венге)', cat:'bamboo', catName:'Бамбук панели', price:9400, oldPrice:null, rating:4.9, reviews:44, badge:'new',
    img:'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=600&h=450&fit=crop&auto=format',
    imgs:[
      'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=700&h=520&fit=crop&auto=format',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=700&h=520&fit=crop&auto=format',
    ],
    inStock:true, specs:[['Материал','100% бамбук'],['Размер панели','2800×600 мм'],['Толщина','8 мм'],['Цвет','Венге'],['Стиль','Loft / Modern']],
    desc:'Панели цвета венге для создания акцентных стен в стиле Loft и Modern. Тёмный оттенок придаёт интерьеру глубину и солидность.' },

  { id:9, name:'Бамбук панели ПВХ (белый камень)', cat:'bamboo', catName:'Бамбук панели', price:6200, oldPrice:7000, rating:4.6, reviews:91, badge:'sale',
    img:'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&h=450&fit=crop&auto=format',
    imgs:[
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=700&h=520&fit=crop&auto=format',
    ],
    inStock:true, specs:[['Материал','ПВХ + бамбуковая основа'],['Размер','2700×250 мм'],['Влагостойкость','Да'],['Цвет','Белый мрамор'],['Применение','Ванная / Кухня']],
    desc:'Влагостойкие бамбуковые панели ПВХ с эффектом белого камня. Идеальны для кухни, ванной и прихожей.' },

  // ── ИНСТРУМЕНТЫ ─────────────────────────────────────────────
  { id:10, name:'Шпатель для поклейки обоев (60 см)', cat:'tools', catName:'Инструменты', price:1200, oldPrice:null, rating:4.5, reviews:112, badge:null,
    img:'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=600&h=450&fit=crop&auto=format',
    imgs:['https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=700&h=520&fit=crop&auto=format'],
    inStock:true, specs:[['Длина','60 см'],['Материал','Нержавеющая сталь'],['Ручка','Резиновая'],['Назначение','Тканевые обои']],
    desc:'Профессиональный шпатель из нержавеющей стали для идеальной разглаживания тканевых обоев без складок.' },

  { id:11, name:'Малярный валик набор (3 шт)', cat:'tools', catName:'Инструменты', price:2400, oldPrice:2900, rating:4.7, reviews:68, badge:'sale',
    img:'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600&h=450&fit=crop&auto=format',
    imgs:['https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=700&h=520&fit=crop&auto=format'],
    inStock:true, specs:[['В наборе','3 валика'],['Размеры','100, 150, 200 мм'],['Ворс','Микрофибра'],['Совместимость','Все виды обоев']],
    desc:'Набор малярных валиков из микрофибры. Оставляют ровный слой клея без пузырей.' },

  // ── КЛЕЙ И ГРУНТ ────────────────────────────────────────────
  { id:12, name:'Рисовый клей без формальдегида (5 кг)', cat:'glue', catName:'Клей и грунт', price:3500, oldPrice:3900, rating:4.9, reviews:203, badge:'hot',
    img:'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600&h=450&fit=crop&auto=format',
    imgs:['https://images.unsplash.com/photo-1585515320310-259814833e62?w=700&h=520&fit=crop&auto=format'],
    inStock:true, specs:[['Объём','5 кг'],['Тип','Рисовый, натуральный'],['Формальдегид','Нет'],['Расход','1 кг / 15 м²'],['Сушка','24 ч']],
    desc:'Натуральный рисовый клей без токсичных веществ. Специально разработан для тканевых обоев. Безопасен для детских комнат.' },

  { id:13, name:'Грунтовка глубокого проникновения (10 л)', cat:'glue', catName:'Клей и грунт', price:2800, oldPrice:null, rating:4.6, reviews:89, badge:null,
    img:'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=600&h=450&fit=crop&auto=format',
    imgs:['https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=700&h=520&fit=crop&auto=format'],
    inStock:true, specs:[['Объём','10 л'],['Тип','Акриловая'],['Расход','100-150 мл/м²'],['Поверхность','Бетон, гипсокартон, штукатурка']],
    desc:'Грунтовка глубокого проникновения для подготовки стен перед поклейкой тканевых обоев и монтажом панелей.' },

  // ── ДЕКОР ───────────────────────────────────────────────────
  { id:14, name:'Молдинги декоративные (5 м, белые)', cat:'decor', catName:'Декор стен', price:1800, oldPrice:2200, rating:4.5, reviews:57, badge:'sale',
    img:'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&h=450&fit=crop&auto=format',
    imgs:['https://images.unsplash.com/photo-1600210492493-0946911123ea?w=700&h=520&fit=crop&auto=format'],
    inStock:true, specs:[['Длина','5 м'],['Материал','Полиуретан'],['Цвет','Белый'],['Ширина','4 см'],['Крепление','Клей / Жидкие гвозди']],
    desc:'Декоративные молдинги для обрамления тканевых обоев и создания классических панно на стенах.' },

  { id:15, name:'Панно фотопечать на ткани (200×100 см)', cat:'decor', catName:'Декор стен', price:12000, oldPrice:14500, rating:4.8, reviews:31, badge:'sale',
    img:'https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=600&h=450&fit=crop&auto=format',
    imgs:['https://images.unsplash.com/photo-1513519245088-0e12902e35ca?w=700&h=520&fit=crop&auto=format'],
    inStock:true, specs:[['Размер','200×100 см'],['Материал','Ткань'],['Печать','УФ-стойкая'],['Монтаж','Натяжная рамка']],
    desc:'Тканевые фотопанно с фотопечатью высокого разрешения. Индивидуальный дизайн — ваш любой рисунок.' },
];
