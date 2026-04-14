export type Locale = "en" | "ar" | "ru";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  ru: "Русский",
};

export const localeDir: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
  ru: "ltr",
};

type TranslationStrings = {
  // Header
  nav_dashboard: string;
  nav_trends: string;
  nav_trendy: string;
  nav_map: string;
  nav_transactions: string;
  demo_banner: string;
  created_by: string;
  brand_name: string;
  subtitle: string;
  powered_by: string;
  switch_dark: string;
  switch_light: string;
  export_data: string;

  // Hero
  hero_title: string;
  hero_subtitle: string;

  // Loading / Error
  loading_text: string;
  retry: string;

  // Filter Panel
  search_transactions: string;
  results: string;
  filters: string;
  clear_all: string;
  search_placeholder: string;
  districts: string;
  projects: string;
  property_type: string;
  status: string;
  sale_type: string;
  asset_class: string;
  bedrooms: string;
  location: string;
  all_districts: string;
  all_projects: string;
  select_district_first: string;
  time_period: string;
  from: string;
  to: string;
  show_price_filters: string;
  hide_price_filters: string;
  price_aed: string;
  size_sqft: string;
  rate_aed_sqft: string;
  min: string;
  max: string;
  transactions_label: string;
  projects_label: string;

  // Date presets
  all_time: string;
  today: string;
  d7: string;
  d30: string;
  d90: string;
  this_week: string;
  this_month: string;
  this_quarter: string;
  this_year: string;
  last_month: string;
  last_quarter: string;
  last_year: string;
  ytd: string;
  custom: string;

  // Property types
  all: string;
  apartment: string;
  villa: string;
  townhouse: string;
  duplex: string;
  land: string;
  penthouse: string;
  office: string;
  retail: string;
  other: string;

  // Status
  off_plan: string;
  ready: string;

  // Sale type
  primary_first_sale: string;
  secondary_resale: string;
  primary: string;
  secondary: string;

  // Asset class
  residential: string;
  commercial: string;
  agricultural: string;

  // Bedrooms
  studio: string;

  // KPI Cards
  view: string;
  total_transactions: string;
  total_value: string;
  median_price: string;
  avg_size: string;
  showing: string;
  primary_label: string;
  secondary_label: string;
  ready_label: string;
  off_plan_label: string;
  of_total_filtered: string;

  // Median Stats
  median_sale_price: string;
  median_aed_sqft: string;
  median_size: string;
  primary_vs_secondary: string;
  primary_pct: string;
  first_sales: string;
  resale_pct: string;
  market_stats: string;
  all_abu_dhabi: string;
  avg_label: string;
  total_transactions_label: string;

  // Charts
  monthly_volume: string;
  avg_rate_trend: string;
  transactions_by_district: string;
  property_types: string;
  off_plan_vs_ready: string;
  count: string;
  avg_sqft: string;

  // Transaction Table
  transaction_details: string;
  showing_of: string;
  date: string;
  district: string;
  project: string;
  type: string;
  beds: string;
  size_sqft_header: string;
  price_aed_header: string;
  rate_sqft: string;
  sale: string;
  page_of: string;

  // Trendy Projects
  trendy_projects: string;
  trendy_subtitle: string;
  sale_ready: string;
  sale_offplan: string;
  primary_sales: string;
  overall_top: string;
  monthly_breakdown: string;
  no_transactions_category: string;
  no_transactions_period: string;
  show_less: string;
  show_all_months: string;
  top_projects: string;
  month_label: string;
  months_label: string;

  // Map
  map_title: string;
  map_subtitle: string;
  total_label: string;

  // Price History
  price_trends: string;
  price_trends_subtitle: string;
  projects_tracked: string;
  latest_avg_rate: string;
  quarter: string;
  avg_price: string;
  avg_rate_sqft: string;
  change: string;
  up: string;
  down: string;
  show_all_projects: string;
  quarters_label: string;

  // Footer
  demo: string;
  platform_name: string;
  data_source: string;

  // Contact Section
  contact_title: string;
  contact_subtitle: string;
  contact_cta: string;
  contact_email: string;
  contact_phone: string;
  contact_location: string;
  consultation_title: string;
  consultation_desc: string;
  send_inquiry: string;

  // Chat Widget
  chat_title: string;
  chat_subtitle: string;
  chat_placeholder: string;
  chat_send: string;
  chat_name: string;
  chat_email: string;
  chat_message: string;
  chat_feedback: string;
  chat_thank_you: string;
  chat_thank_you_msg: string;
  chat_new_message: string;
};

const en: TranslationStrings = {
  // Header
  nav_dashboard: "Dashboard",
  nav_trends: "Trends",
  nav_trendy: "Trendy",
  nav_map: "Map",
  nav_transactions: "Transactions",
  demo_banner: "DEMO",
  created_by: "Created by",
  brand_name: "Sand Square Group",
  subtitle: "Abu Dhabi Real Estate",
  powered_by: "Powered by ADREC Data",
  switch_dark: "Switch to dark theme",
  switch_light: "Switch to light theme",
  export_data: "Export Data",

  // Hero
  hero_title: "Abu Dhabi Real Estate Market",
  hero_subtitle: "Live transaction data, trends, and analytics powered by ADREC",

  // Loading / Error
  loading_text: "Loading ADREC transaction data...",
  retry: "Retry",

  // Filter Panel
  search_transactions: "Search Transactions",
  results: "results",
  filters: "filters",
  clear_all: "Clear All",
  search_placeholder: "Search district, project, community...",
  districts: "Districts",
  projects: "Projects",
  property_type: "Property Type",
  status: "Status",
  sale_type: "Sale Type",
  asset_class: "Asset Class",
  bedrooms: "Bedrooms",
  location: "Location",
  all_districts: "All Districts",
  all_projects: "All Projects",
  select_district_first: "Select District First",
  time_period: "Time Period",
  from: "From",
  to: "To",
  show_price_filters: "Show Price, Size & Rate Filters",
  hide_price_filters: "Hide Price, Size & Rate Filters",
  price_aed: "Price (AED)",
  size_sqft: "Size (sqft)",
  rate_aed_sqft: "Rate (AED/sqft)",
  min: "Min",
  max: "Max",
  transactions_label: "transactions",
  projects_label: "projects",

  // Date presets
  all_time: "All Time",
  today: "Today",
  d7: "7D",
  d30: "30D",
  d90: "90D",
  this_week: "This Week",
  this_month: "This Month",
  this_quarter: "Q",
  this_year: "This Year",
  last_month: "Last Month",
  last_quarter: "Last Q",
  last_year: "Last Year",
  ytd: "YTD",
  custom: "Custom",

  // Property types
  all: "All",
  apartment: "Apartment",
  villa: "Villa",
  townhouse: "Townhouse",
  duplex: "Duplex",
  land: "Land",
  penthouse: "Penthouse",
  office: "Office",
  retail: "Retail",
  other: "Other",

  // Status
  off_plan: "Off-Plan",
  ready: "Ready",

  // Sale type
  primary_first_sale: "Primary (First Sale)",
  secondary_resale: "Secondary (Resale)",
  primary: "Primary",
  secondary: "Secondary",

  // Asset class
  residential: "Residential",
  commercial: "Commercial",
  agricultural: "Agricultural",

  // Bedrooms
  studio: "Studio",

  // KPI Cards
  view: "View:",
  total_transactions: "Total Transactions",
  total_value: "Total Value",
  median_price: "Median Price",
  avg_size: "Avg Size",
  showing: "Showing:",
  primary_label: "primary",
  secondary_label: "secondary",
  ready_label: "ready",
  off_plan_label: "off-plan",
  of_total_filtered: "of {0} total filtered",

  // Median Stats
  median_sale_price: "Median Sale Price",
  median_aed_sqft: "Median AED/sqft",
  median_size: "Median Size",
  primary_vs_secondary: "Primary vs Secondary",
  primary_pct: "Primary",
  first_sales: "first sales",
  resale_pct: "resale",
  market_stats: "Market Stats:",
  all_abu_dhabi: "All Abu Dhabi",
  avg_label: "Avg:",
  total_transactions_label: "transactions",

  // Charts
  monthly_volume: "Monthly Transaction Volume",
  avg_rate_trend: "Avg Rate per Sqft Trend",
  transactions_by_district: "Transactions by District",
  property_types: "Property Types",
  off_plan_vs_ready: "Off-Plan vs Ready",
  count: "Count",
  avg_sqft: "Avg/sqft",

  // Transaction Table
  transaction_details: "Transaction Details",
  showing_of: "Showing {0} of {1} transactions",
  date: "Date",
  district: "District",
  project: "Project",
  type: "Type",
  beds: "Beds",
  size_sqft_header: "Size sqft",
  price_aed_header: "Price AED",
  rate_sqft: "Rate/sqft",
  sale: "Sale",
  page_of: "Page {0} of {1}",

  // Trendy Projects
  trendy_projects: "Trendy Projects",
  trendy_subtitle: "Most active projects by transaction volume per month",
  sale_ready: "Sale - Ready",
  sale_offplan: "Sale - Off-Plan",
  primary_sales: "Primary Sales",
  overall_top: "Overall Top Projects",
  monthly_breakdown: "Monthly Breakdown",
  no_transactions_category: "No transactions in this category",
  no_transactions_period: "No transactions in this category for the selected period",
  show_less: "Show Less",
  show_all_months: "Show All {0} Months",
  top_projects: "Top {0} projects",
  month_label: "month",
  months_label: "months",

  // Map
  map_title: "Abu Dhabi Real Estate Map",
  map_subtitle: "Transaction hotspots by district - click markers for details",
  total_label: "Total:",

  // Price History
  price_trends: "Project Price Trends",
  price_trends_subtitle: "Average rate per sqft trends for top projects",
  projects_tracked: "projects tracked",
  latest_avg_rate: "Latest Avg Rate",
  quarter: "Quarter",
  avg_price: "Avg Price",
  avg_rate_sqft: "Avg Rate/sqft",
  change: "Change",
  up: "UP",
  down: "DOWN",
  show_all_projects: "Show All {0} Projects",
  quarters_label: "quarters",

  // Footer
  demo: "DEMO",
  platform_name: "ADXBInteract — Abu Dhabi Real Estate Intelligence Platform",
  data_source: "Data sourced from ADREC (Abu Dhabi Real Estate Centre) - For informational purposes only",

  // Contact
  contact_title: "Need Expert Consultation?",
  contact_subtitle: "Sand Square Group provides professional real estate advisory services in Abu Dhabi. From market analysis to investment strategy, we help you make informed decisions.",
  contact_cta: "Get in Touch",
  contact_email: "Email",
  contact_phone: "Phone",
  contact_location: "Abu Dhabi, UAE",
  consultation_title: "Free Market Consultation",
  consultation_desc: "Book a free 30-minute consultation with our experts to discuss your investment goals.",
  send_inquiry: "Send Inquiry",

  // Chat
  chat_title: "Send us Feedback",
  chat_subtitle: "We'd love to hear your thoughts on ADXBInteract",
  chat_placeholder: "Type your message...",
  chat_send: "Send",
  chat_name: "Your Name",
  chat_email: "Your Email",
  chat_message: "Your Message",
  chat_feedback: "Feedback",
  chat_thank_you: "Thank You!",
  chat_thank_you_msg: "Your feedback has been received. We'll get back to you soon.",
  chat_new_message: "Send Another",
};

const ar: TranslationStrings = {
  // Header
  nav_dashboard: "لوحة المعلومات",
  nav_trends: "الاتجاهات",
  nav_trendy: "المشاريع الرائجة",
  nav_map: "الخريطة",
  nav_transactions: "المعاملات",
  demo_banner: "نسخة تجريبية",
  created_by: "من إنشاء",
  brand_name: "ساند سكوير جروب",
  subtitle: "عقارات أبوظبي",
  powered_by: "بدعم من بيانات ADREC",
  switch_dark: "التبديل إلى الوضع الداكن",
  switch_light: "التبديل إلى الوضع الفاتح",
  export_data: "تصدير البيانات",

  // Hero
  hero_title: "سوق العقارات في أبوظبي",
  hero_subtitle: "بيانات المعاملات المباشرة والاتجاهات والتحليلات بدعم من ADREC",

  // Loading / Error
  loading_text: "جاري تحميل بيانات المعاملات...",
  retry: "إعادة المحاولة",

  // Filter Panel
  search_transactions: "البحث في المعاملات",
  results: "نتائج",
  filters: "تصفية",
  clear_all: "مسح الكل",
  search_placeholder: "البحث عن منطقة، مشروع، مجتمع...",
  districts: "المناطق",
  projects: "المشاريع",
  property_type: "نوع العقار",
  status: "الحالة",
  sale_type: "نوع البيع",
  asset_class: "فئة الأصول",
  bedrooms: "غرف النوم",
  location: "الموقع",
  all_districts: "جميع المناطق",
  all_projects: "جميع المشاريع",
  select_district_first: "اختر المنطقة أولاً",
  time_period: "الفترة الزمنية",
  from: "من",
  to: "إلى",
  show_price_filters: "إظهار فلاتر السعر والمساحة والمعدل",
  hide_price_filters: "إخفاء فلاتر السعر والمساحة والمعدل",
  price_aed: "السعر (درهم)",
  size_sqft: "المساحة (قدم مربع)",
  rate_aed_sqft: "المعدل (درهم/قدم مربع)",
  min: "الحد الأدنى",
  max: "الحد الأقصى",
  transactions_label: "معاملات",
  projects_label: "مشاريع",

  // Date presets
  all_time: "كل الأوقات",
  today: "اليوم",
  d7: "٧ أيام",
  d30: "٣٠ يوم",
  d90: "٩٠ يوم",
  this_week: "هذا الأسبوع",
  this_month: "هذا الشهر",
  this_quarter: "ربع سنوي",
  this_year: "هذا العام",
  last_month: "الشهر الماضي",
  last_quarter: "الربع الماضي",
  last_year: "العام الماضي",
  ytd: "من بداية العام",
  custom: "مخصص",

  // Property types
  all: "الكل",
  apartment: "شقة",
  villa: "فيلا",
  townhouse: "تاون هاوس",
  duplex: "دوبلكس",
  land: "أرض",
  penthouse: "بنتهاوس",
  office: "مكتب",
  retail: "تجزئة",
  other: "أخرى",

  // Status
  off_plan: "على الخارطة",
  ready: "جاهز",

  // Sale type
  primary_first_sale: "أولي (بيع أول)",
  secondary_resale: "ثانوي (إعادة بيع)",
  primary: "أولي",
  secondary: "ثانوي",

  // Asset class
  residential: "سكني",
  commercial: "تجاري",
  agricultural: "زراعي",

  // Bedrooms
  studio: "استوديو",

  // KPI Cards
  view: "عرض:",
  total_transactions: "إجمالي المعاملات",
  total_value: "القيمة الإجمالية",
  median_price: "السعر الوسيط",
  avg_size: "متوسط المساحة",
  showing: "عرض:",
  primary_label: "أولي",
  secondary_label: "ثانوي",
  ready_label: "جاهز",
  off_plan_label: "على الخارطة",
  of_total_filtered: "من {0} إجمالي",

  // Median Stats
  median_sale_price: "السعر الوسيط للبيع",
  median_aed_sqft: "الوسيط (درهم/قدم²)",
  median_size: "المساحة الوسيطة",
  primary_vs_secondary: "أولي مقابل ثانوي",
  primary_pct: "أولي",
  first_sales: "عمليات بيع أولى",
  resale_pct: "إعادة بيع",
  market_stats: "إحصائيات السوق:",
  all_abu_dhabi: "كل أبوظبي",
  avg_label: "المتوسط:",
  total_transactions_label: "معاملات",

  // Charts
  monthly_volume: "حجم المعاملات الشهري",
  avg_rate_trend: "اتجاه المعدل للقدم المربع",
  transactions_by_district: "المعاملات حسب المنطقة",
  property_types: "أنواع العقارات",
  off_plan_vs_ready: "على الخارطة مقابل الجاهز",
  count: "العدد",
  avg_sqft: "متوسط/قدم²",

  // Transaction Table
  transaction_details: "تفاصيل المعاملات",
  showing_of: "عرض {0} من {1} معاملة",
  date: "التاريخ",
  district: "المنطقة",
  project: "المشروع",
  type: "النوع",
  beds: "غرف",
  size_sqft_header: "المساحة (قدم²)",
  price_aed_header: "السعر (درهم)",
  rate_sqft: "المعدل/قدم²",
  sale: "البيع",
  page_of: "صفحة {0} من {1}",

  // Trendy Projects
  trendy_projects: "المشاريع الرائجة",
  trendy_subtitle: "أكثر المشاريع نشاطاً من حيث حجم المعاملات الشهري",
  sale_ready: "بيع - جاهز",
  sale_offplan: "بيع - على الخارطة",
  primary_sales: "بيع أولي",
  overall_top: "أفضل المشاريع الإجمالية",
  monthly_breakdown: "التفصيل الشهري",
  no_transactions_category: "لا توجد معاملات في هذه الفئة",
  no_transactions_period: "لا توجد معاملات في هذه الفئة للفترة المحددة",
  show_less: "عرض أقل",
  show_all_months: "عرض جميع الأشهر ({0})",
  top_projects: "أفضل {0} مشاريع",
  month_label: "شهر",
  months_label: "أشهر",

  // Map
  map_title: "خريطة عقارات أبوظبي",
  map_subtitle: "النقاط الساخنة للمعاملات حسب المنطقة - انقر على العلامات للتفاصيل",
  total_label: "الإجمالي:",

  // Price History
  price_trends: "اتجاهات أسعار المشاريع",
  price_trends_subtitle: "اتجاهات متوسط المعدل للقدم المربع لأفضل المشاريع",
  projects_tracked: "مشاريع متتبعة",
  latest_avg_rate: "آخر معدل متوسط",
  quarter: "الربع",
  avg_price: "متوسط السعر",
  avg_rate_sqft: "متوسط المعدل/قدم²",
  change: "التغيير",
  up: "ارتفاع",
  down: "انخفاض",
  show_all_projects: "عرض جميع المشاريع ({0})",
  quarters_label: "أرباع",

  // Footer
  demo: "نسخة تجريبية",
  platform_name: "ADXBInteract — منصة ذكاء العقارات في أبوظبي",
  data_source: "البيانات مصدرها ADREC (مركز أبوظبي العقاري) - لأغراض المعلومات فقط",

  // Contact
  contact_title: "هل تحتاج استشارة متخصصة؟",
  contact_subtitle: "تقدم ساند سكوير جروب خدمات استشارية عقارية متخصصة في أبوظبي. من تحليل السوق إلى استراتيجية الاستثمار، نساعدك على اتخاذ قرارات مدروسة.",
  contact_cta: "تواصل معنا",
  contact_email: "البريد الإلكتروني",
  contact_phone: "الهاتف",
  contact_location: "أبوظبي، الإمارات",
  consultation_title: "استشارة سوقية مجانية",
  consultation_desc: "احجز استشارة مجانية لمدة 30 دقيقة مع خبرائنا لمناقشة أهدافك الاستثمارية.",
  send_inquiry: "إرسال استفسار",

  // Chat
  chat_title: "أرسل لنا ملاحظاتك",
  chat_subtitle: "نحب أن نسمع آراءكم حول ADXBInteract",
  chat_placeholder: "اكتب رسالتك...",
  chat_send: "إرسال",
  chat_name: "اسمك",
  chat_email: "بريدك الإلكتروني",
  chat_message: "رسالتك",
  chat_feedback: "ملاحظات",
  chat_thank_you: "شكراً لك!",
  chat_thank_you_msg: "تم استلام ملاحظاتك. سنتواصل معك قريباً.",
  chat_new_message: "إرسال آخر",
};

const ru: TranslationStrings = {
  // Header
  nav_dashboard: "Панель",
  nav_trends: "Тренды",
  nav_trendy: "Популярные",
  nav_map: "Карта",
  nav_transactions: "Сделки",
  demo_banner: "ДЕМО",
  created_by: "Создано",
  brand_name: "Sand Square Group",
  subtitle: "Недвижимость Абу-Даби",
  powered_by: "На основе данных ADREC",
  switch_dark: "Переключить на тёмную тему",
  switch_light: "Переключить на светлую тему",
  export_data: "Экспорт данных",

  // Hero
  hero_title: "Рынок недвижимости Абу-Даби",
  hero_subtitle: "Данные о сделках, тренды и аналитика на основе ADREC",

  // Loading / Error
  loading_text: "Загрузка данных о сделках...",
  retry: "Повторить",

  // Filter Panel
  search_transactions: "Поиск сделок",
  results: "результатов",
  filters: "фильтров",
  clear_all: "Сбросить всё",
  search_placeholder: "Поиск по району, проекту, сообществу...",
  districts: "Районы",
  projects: "Проекты",
  property_type: "Тип недвижимости",
  status: "Статус",
  sale_type: "Тип продажи",
  asset_class: "Класс актива",
  bedrooms: "Спальни",
  location: "Местоположение",
  all_districts: "Все районы",
  all_projects: "Все проекты",
  select_district_first: "Сначала выберите район",
  time_period: "Период",
  from: "От",
  to: "До",
  show_price_filters: "Показать фильтры цены, площади и ставки",
  hide_price_filters: "Скрыть фильтры цены, площади и ставки",
  price_aed: "Цена (AED)",
  size_sqft: "Площадь (кв.фт)",
  rate_aed_sqft: "Ставка (AED/кв.фт)",
  min: "Мин",
  max: "Макс",
  transactions_label: "сделок",
  projects_label: "проектов",

  // Date presets
  all_time: "Всё время",
  today: "Сегодня",
  d7: "7Д",
  d30: "30Д",
  d90: "90Д",
  this_week: "Эта неделя",
  this_month: "Этот месяц",
  this_quarter: "Кв",
  this_year: "Этот год",
  last_month: "Прошлый месяц",
  last_quarter: "Прошлый кв.",
  last_year: "Прошлый год",
  ytd: "С начала года",
  custom: "Свой",

  // Property types
  all: "Все",
  apartment: "Квартира",
  villa: "Вилла",
  townhouse: "Таунхаус",
  duplex: "Дуплекс",
  land: "Земля",
  penthouse: "Пентхаус",
  office: "Офис",
  retail: "Торговая",
  other: "Другое",

  // Status
  off_plan: "На стадии строительства",
  ready: "Готово",

  // Sale type
  primary_first_sale: "Первичная (от застройщика)",
  secondary_resale: "Вторичная (перепродажа)",
  primary: "Первичная",
  secondary: "Вторичная",

  // Asset class
  residential: "Жилая",
  commercial: "Коммерческая",
  agricultural: "Сельскохозяйственная",

  // Bedrooms
  studio: "Студия",

  // KPI Cards
  view: "Тип:",
  total_transactions: "Всего сделок",
  total_value: "Общая стоимость",
  median_price: "Медианная цена",
  avg_size: "Ср. площадь",
  showing: "Показано:",
  primary_label: "первичных",
  secondary_label: "вторичных",
  ready_label: "готовых",
  off_plan_label: "строящихся",
  of_total_filtered: "из {0} всего",

  // Median Stats
  median_sale_price: "Медианная цена продажи",
  median_aed_sqft: "Медиана AED/кв.фт",
  median_size: "Медианная площадь",
  primary_vs_secondary: "Первичная vs Вторичная",
  primary_pct: "Первичная",
  first_sales: "первых продаж",
  resale_pct: "перепродажа",
  market_stats: "Статистика рынка:",
  all_abu_dhabi: "Весь Абу-Даби",
  avg_label: "Ср.:",
  total_transactions_label: "сделок",

  // Charts
  monthly_volume: "Ежемесячный объём сделок",
  avg_rate_trend: "Тренд средней ставки за кв.фт",
  transactions_by_district: "Сделки по районам",
  property_types: "Типы недвижимости",
  off_plan_vs_ready: "Строящиеся vs Готовые",
  count: "Количество",
  avg_sqft: "Ср./кв.фт",

  // Transaction Table
  transaction_details: "Детали сделок",
  showing_of: "Показано {0} из {1} сделок",
  date: "Дата",
  district: "Район",
  project: "Проект",
  type: "Тип",
  beds: "Спальни",
  size_sqft_header: "Площадь кв.фт",
  price_aed_header: "Цена AED",
  rate_sqft: "Ставка/кв.фт",
  sale: "Продажа",
  page_of: "Страница {0} из {1}",

  // Trendy Projects
  trendy_projects: "Популярные проекты",
  trendy_subtitle: "Самые активные проекты по объёму сделок в месяц",
  sale_ready: "Продажа - Готовые",
  sale_offplan: "Продажа - Строящиеся",
  primary_sales: "Первичные продажи",
  overall_top: "Топ проектов",
  monthly_breakdown: "Помесячная разбивка",
  no_transactions_category: "Нет сделок в этой категории",
  no_transactions_period: "Нет сделок в этой категории за выбранный период",
  show_less: "Показать меньше",
  show_all_months: "Показать все {0} месяцев",
  top_projects: "Топ {0} проектов",
  month_label: "месяц",
  months_label: "месяцев",

  // Map
  map_title: "Карта недвижимости Абу-Даби",
  map_subtitle: "Горячие точки сделок по районам - нажмите на маркеры для подробностей",
  total_label: "Итого:",

  // Price History
  price_trends: "Тренды цен проектов",
  price_trends_subtitle: "Тренды средней ставки за кв.фт для топ проектов",
  projects_tracked: "проектов отслеживается",
  latest_avg_rate: "Последняя ср. ставка",
  quarter: "Квартал",
  avg_price: "Ср. цена",
  avg_rate_sqft: "Ср. ставка/кв.фт",
  change: "Изменение",
  up: "РОСТ",
  down: "ПАДЕНИЕ",
  show_all_projects: "Показать все {0} проектов",
  quarters_label: "кварталов",

  // Footer
  demo: "ДЕМО",
  platform_name: "ADXBInteract — Платформа аналитики недвижимости Абу-Даби",
  data_source: "Данные из ADREC (Центр недвижимости Абу-Даби) - Только для информационных целей",

  // Contact
  contact_title: "Нужна экспертная консультация?",
  contact_subtitle: "Sand Square Group предоставляет профессиональные консультационные услуги по недвижимости в Абу-Даби. От анализа рынка до инвестиционной стратегии — мы помогаем принимать обоснованные решения.",
  contact_cta: "Связаться с нами",
  contact_email: "Электронная почта",
  contact_phone: "Телефон",
  contact_location: "Абу-Даби, ОАЭ",
  consultation_title: "Бесплатная рыночная консультация",
  consultation_desc: "Запишитесь на бесплатную 30-минутную консультацию с нашими экспертами для обсуждения ваших инвестиционных целей.",
  send_inquiry: "Отправить запрос",

  // Chat
  chat_title: "Отправьте нам отзыв",
  chat_subtitle: "Мы будем рады услышать ваше мнение об ADXBInteract",
  chat_placeholder: "Введите сообщение...",
  chat_send: "Отправить",
  chat_name: "Ваше имя",
  chat_email: "Ваш email",
  chat_message: "Ваше сообщение",
  chat_feedback: "Отзыв",
  chat_thank_you: "Спасибо!",
  chat_thank_you_msg: "Ваш отзыв получен. Мы свяжемся с вами в ближайшее время.",
  chat_new_message: "Отправить ещё",
};

export const translations: Record<Locale, TranslationStrings> = { en, ar, ru };

export function t(locale: Locale, key: keyof TranslationStrings, ...args: (string | number)[]): string {
  let str = translations[locale][key] || translations.en[key] || key;
  args.forEach((arg, i) => {
    str = str.replace(`{${i}}`, String(arg));
  });
  return str;
}
