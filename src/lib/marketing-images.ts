// Professional stock photos for insurance marketing - copyright free via Unsplash
// All images are free to use for commercial purposes

export interface MarketingImage {
  id: string
  name: string
  name_he: string
  category: 'car' | 'home' | 'life' | 'health' | 'business' | 'pension' | 'general'
  url: string
  thumbnail: string
  photographer?: string
}

// Unsplash image URL helper
const unsplash = (photoId: string, width = 1920, height = 1080) => {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`
}

const unsplashThumb = (photoId: string) => {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=400&h=300&q=60`
}

// Professional stock photos library for insurance marketing
export const MARKETING_IMAGES: MarketingImage[] = [
  // Car Insurance Images
  {
    id: 'car-1',
    name: 'Person Driving - Dashboard View',
    name_he: 'נהיגה - תצוגת לוח מחוונים',
    category: 'car',
    url: unsplash('1449965408869-eaa3f722e40d'),
    thumbnail: unsplashThumb('1449965408869-eaa3f722e40d'),
    photographer: 'Unsplash'
  },
  {
    id: 'car-2',
    name: 'Modern Car on Road',
    name_he: 'רכב מודרני בכביש',
    category: 'car',
    url: unsplash('1494976388531-d1058494cdd8'),
    thumbnail: unsplashThumb('1494976388531-d1058494cdd8'),
    photographer: 'Unsplash'
  },
  {
    id: 'car-3',
    name: 'Car Key Handover',
    name_he: 'מסירת מפתחות רכב',
    category: 'car',
    url: unsplash('1560179707-f14e90ef3623'),
    thumbnail: unsplashThumb('1560179707-f14e90ef3623'),
    photographer: 'Unsplash'
  },
  {
    id: 'car-4',
    name: 'Family Road Trip',
    name_he: 'טיול משפחתי ברכב',
    category: 'car',
    url: unsplash('1469854523086-cc02fe5d8800'),
    thumbnail: unsplashThumb('1469854523086-cc02fe5d8800'),
    photographer: 'Unsplash'
  },
  {
    id: 'car-5',
    name: 'Luxury Car Interior',
    name_he: 'פנים רכב יוקרתי',
    category: 'car',
    url: unsplash('1503376780353-7e6692767b70'),
    thumbnail: unsplashThumb('1503376780353-7e6692767b70'),
    photographer: 'Unsplash'
  },

  // Home Insurance Images
  {
    id: 'home-1',
    name: 'Beautiful House with Pool',
    name_he: 'בית יפה עם בריכה',
    category: 'home',
    url: unsplash('1564013799919-ab600027ffc6'),
    thumbnail: unsplashThumb('1564013799919-ab600027ffc6'),
    photographer: 'Unsplash'
  },
  {
    id: 'home-2',
    name: 'Modern Home Exterior',
    name_he: 'חזית בית מודרני',
    category: 'home',
    url: unsplash('1600596542815-ffad4c1539a9'),
    thumbnail: unsplashThumb('1600596542815-ffad4c1539a9'),
    photographer: 'Unsplash'
  },
  {
    id: 'home-3',
    name: 'Cozy Living Room',
    name_he: 'סלון חמים ונעים',
    category: 'home',
    url: unsplash('1502672260266-1c1ef2d93688'),
    thumbnail: unsplashThumb('1502672260266-1c1ef2d93688'),
    photographer: 'Unsplash'
  },
  {
    id: 'home-4',
    name: 'Family Home with Garden',
    name_he: 'בית משפחתי עם גינה',
    category: 'home',
    url: unsplash('1518780664697-55e3ad937233'),
    thumbnail: unsplashThumb('1518780664697-55e3ad937233'),
    photographer: 'Unsplash'
  },
  {
    id: 'home-5',
    name: 'Keys to New Home',
    name_he: 'מפתחות לבית חדש',
    category: 'home',
    url: unsplash('1560518883-ce09059eeffa'),
    thumbnail: unsplashThumb('1560518883-ce09059eeffa'),
    photographer: 'Unsplash'
  },

  // Life Insurance Images
  {
    id: 'life-1',
    name: 'Family Silhouette at Sunset',
    name_he: 'צללית משפחה בשקיעה',
    category: 'life',
    url: unsplash('1511895426328-dc8714191300'),
    thumbnail: unsplashThumb('1511895426328-dc8714191300'),
    photographer: 'Unsplash'
  },
  {
    id: 'life-2',
    name: 'Happy Family Together',
    name_he: 'משפחה מאושרת יחד',
    category: 'life',
    url: unsplash('1559734840-f9509ee5677f'),
    thumbnail: unsplashThumb('1559734840-f9509ee5677f'),
    photographer: 'Unsplash'
  },
  {
    id: 'life-3',
    name: 'Parents with Children',
    name_he: 'הורים עם ילדים',
    category: 'life',
    url: unsplash('1536640712-4d4c36ff0e4e'),
    thumbnail: unsplashThumb('1536640712-4d4c36ff0e4e'),
    photographer: 'Unsplash'
  },
  {
    id: 'life-4',
    name: 'Multi-Generation Family',
    name_he: 'משפחה רב דורית',
    category: 'life',
    url: unsplash('1542037179922-8f84b8a4fd6e'),
    thumbnail: unsplashThumb('1542037179922-8f84b8a4fd6e'),
    photographer: 'Unsplash'
  },
  {
    id: 'life-5',
    name: 'Couple at Beach Sunset',
    name_he: 'זוג בשקיעה בחוף',
    category: 'life',
    url: unsplash('1516589178581-95deaec6df76'),
    thumbnail: unsplashThumb('1516589178581-95deaec6df76'),
    photographer: 'Unsplash'
  },

  // Health Insurance Images
  {
    id: 'health-1',
    name: 'Healthy Fresh Vegetables',
    name_he: 'ירקות טריים ובריאים',
    category: 'health',
    url: unsplash('1540420773420-3366772f4999'),
    thumbnail: unsplashThumb('1540420773420-3366772f4999'),
    photographer: 'Unsplash'
  },
  {
    id: 'health-2',
    name: 'Doctor with Stethoscope',
    name_he: 'רופא עם סטטוסקופ',
    category: 'health',
    url: unsplash('1559757148-5c350d0d3c56'),
    thumbnail: unsplashThumb('1559757148-5c350d0d3c56'),
    photographer: 'Unsplash'
  },
  {
    id: 'health-3',
    name: 'Fitness and Exercise',
    name_he: 'כושר ופעילות גופנית',
    category: 'health',
    url: unsplash('1571019613454-1cb2f99b2d8b'),
    thumbnail: unsplashThumb('1571019613454-1cb2f99b2d8b'),
    photographer: 'Unsplash'
  },
  {
    id: 'health-4',
    name: 'Medical Healthcare',
    name_he: 'שירותי בריאות רפואיים',
    category: 'health',
    url: unsplash('1576091160550-2173dba999ef'),
    thumbnail: unsplashThumb('1576091160550-2173dba999ef'),
    photographer: 'Unsplash'
  },
  {
    id: 'health-5',
    name: 'Healthy Lifestyle',
    name_he: 'אורח חיים בריא',
    category: 'health',
    url: unsplash('1498837167922-ddd27525d352'),
    thumbnail: unsplashThumb('1498837167922-ddd27525d352'),
    photographer: 'Unsplash'
  },

  // Business Insurance Images
  {
    id: 'business-1',
    name: 'Modern Office Interior',
    name_he: 'משרד מודרני',
    category: 'business',
    url: unsplash('1497366216548-37526070297c'),
    thumbnail: unsplashThumb('1497366216548-37526070297c'),
    photographer: 'Unsplash'
  },
  {
    id: 'business-2',
    name: 'Business Meeting',
    name_he: 'פגישה עסקית',
    category: 'business',
    url: unsplash('1556761175-5973dc0f32e7'),
    thumbnail: unsplashThumb('1556761175-5973dc0f32e7'),
    photographer: 'Unsplash'
  },
  {
    id: 'business-3',
    name: 'Professional Handshake',
    name_he: 'לחיצת יד מקצועית',
    category: 'business',
    url: unsplash('1560472354-b33ff0c44a43'),
    thumbnail: unsplashThumb('1560472354-b33ff0c44a43'),
    photographer: 'Unsplash'
  },
  {
    id: 'business-4',
    name: 'Contract Signing',
    name_he: 'חתימה על חוזה',
    category: 'business',
    url: unsplash('1450101499163-c8848c66ca85'),
    thumbnail: unsplashThumb('1450101499163-c8848c66ca85'),
    photographer: 'Unsplash'
  },
  {
    id: 'business-5',
    name: 'Corporate Building',
    name_he: 'בניין משרדים',
    category: 'business',
    url: unsplash('1486406146926-c627a92ad1ab'),
    thumbnail: unsplashThumb('1486406146926-c627a92ad1ab'),
    photographer: 'Unsplash'
  },

  // Pension & Savings Images
  {
    id: 'pension-1',
    name: 'Happy Senior Couple',
    name_he: 'זוג מבוגר מאושר',
    category: 'pension',
    url: unsplash('1447069387593-a5de0862481e'),
    thumbnail: unsplashThumb('1447069387593-a5de0862481e'),
    photographer: 'Unsplash'
  },
  {
    id: 'pension-2',
    name: 'Retirement Planning',
    name_he: 'תכנון פרישה',
    category: 'pension',
    url: unsplash('1554224155-6726b3ff858f'),
    thumbnail: unsplashThumb('1554224155-6726b3ff858f'),
    photographer: 'Unsplash'
  },
  {
    id: 'pension-3',
    name: 'Savings Jar',
    name_he: 'צנצנת חיסכון',
    category: 'pension',
    url: unsplash('1579621970563-9ae2e01eb44e'),
    thumbnail: unsplashThumb('1579621970563-9ae2e01eb44e'),
    photographer: 'Unsplash'
  },
  {
    id: 'pension-4',
    name: 'Financial Growth',
    name_he: 'צמיחה פיננסית',
    category: 'pension',
    url: unsplash('1611974789855-9c2a0a7236a3'),
    thumbnail: unsplashThumb('1611974789855-9c2a0a7236a3'),
    photographer: 'Unsplash'
  },
  {
    id: 'pension-5',
    name: 'Seniors Walking Beach',
    name_he: 'מבוגרים בחוף הים',
    category: 'pension',
    url: unsplash('1517048676732-d65bc937f952'),
    thumbnail: unsplashThumb('1517048676732-d65bc937f952'),
    photographer: 'Unsplash'
  },

  // General Insurance Images
  {
    id: 'general-1',
    name: 'Protection Umbrella',
    name_he: 'מטריית הגנה',
    category: 'general',
    url: unsplash('1534274988757-a28bf1a57c17'),
    thumbnail: unsplashThumb('1534274988757-a28bf1a57c17'),
    photographer: 'Unsplash'
  },
  {
    id: 'general-2',
    name: 'Security Shield',
    name_he: 'מגן אבטחה',
    category: 'general',
    url: unsplash('1555949963-ff9fe0c870eb'),
    thumbnail: unsplashThumb('1555949963-ff9fe0c870eb'),
    photographer: 'Unsplash'
  },
  {
    id: 'general-3',
    name: 'Trust and Care',
    name_he: 'אמון ודאגה',
    category: 'general',
    url: unsplash('1469571486292-0ba58a3f068b'),
    thumbnail: unsplashThumb('1469571486292-0ba58a3f068b'),
    photographer: 'Unsplash'
  },
  {
    id: 'general-4',
    name: 'Success Achievement',
    name_he: 'הצלחה והישג',
    category: 'general',
    url: unsplash('1521737711867-e3b97375f902'),
    thumbnail: unsplashThumb('1521737711867-e3b97375f902'),
    photographer: 'Unsplash'
  },
  {
    id: 'general-5',
    name: 'Peace of Mind',
    name_he: 'שקט נפשי',
    category: 'general',
    url: unsplash('1506905925346-21bda4d32df4'),
    thumbnail: unsplashThumb('1506905925346-21bda4d32df4'),
    photographer: 'Unsplash'
  },
  {
    id: 'general-6',
    name: 'Document Signing',
    name_he: 'חתימה על מסמכים',
    category: 'general',
    url: unsplash('1554224154-22dec7ec8818'),
    thumbnail: unsplashThumb('1554224154-22dec7ec8818'),
    photographer: 'Unsplash'
  },
]

// Helper to get images by category
export const getImagesByCategory = (category: MarketingImage['category']): MarketingImage[] => {
  return MARKETING_IMAGES.filter(img => img.category === category)
}

// Get a random marketing image for a category
export const getRandomImageForCategory = (category: MarketingImage['category']): MarketingImage => {
  const images = getImagesByCategory(category)
  return images[Math.floor(Math.random() * images.length)] || MARKETING_IMAGES[0]
}

// Get all categories
export const getCategories = () => {
  return ['car', 'home', 'life', 'health', 'business', 'pension', 'general'] as const
}

// Category labels in Hebrew
export const categoryLabels: Record<MarketingImage['category'], string> = {
  car: 'ביטוח רכב',
  home: 'ביטוח דירה',
  life: 'ביטוח חיים',
  health: 'ביטוח בריאות',
  business: 'ביטוח עסקי',
  pension: 'פנסיה וחיסכון',
  general: 'כללי',
}
