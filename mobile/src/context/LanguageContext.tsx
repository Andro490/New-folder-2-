import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

// ── Translation Strings ────────────────────────────────────────
export const translations = {
  ar: {
    // Common
    back: '←',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'نجاح',

    // Home Screen
    playNow: 'العب الآن',
    leaderboards: 'التصنيفات',
    home: 'الرئيسية',
    settings: 'الإعدادات',
    tagline: 'توقع، زايد، واكسب الكوينز!',

    // Settings Screen
    settingsTitle: 'إعدادات',
    account: 'الحساب',
    currentLanguage: 'اللغة الحالية',
    arabicLang: 'العربية',
    englishLang: 'English',
    darkMode: 'الوضع الليلي',
    lightMode: 'الوضع النهاري',
    switchToDark: 'انقر للتحويل إلى الوضع الليلي',
    switchToLight: 'انقر للتحويل إلى الوضع النهاري',
    notifications: 'الإشعارات',
    notificationsDesc: 'السماح للتطبيق بإرسال التنبيهات',
    music: 'الموسيقى',
    musicDesc: 'تشغيل موسيقى خلفية في التطبيق.',
    vibration: 'الاهتزاز',
    vibrationDesc: 'الشعور باهتزاز خفيف عند اللمس وتأكيد الإجراءات.',
    sfx: 'المؤثرات الصوتية',
    sfxDesc: 'تشغيل أصوات المزاد والعد التنازلي والنجاح أثناء المباريات.',
    howToPlay: 'كيفية اللعب',
    howToPlayDesc: 'شرح قصير لكل لعبة من أولها لآخرها.',
    contactUs: 'اتصل بنا',
    contactUsDesc: 'تواصل مع الفريق للدعم أو الإبلاغ عن الأخطاء.',
    suggestions: 'اقتراحات',
    suggestionsDesc: 'شارك أفكاراً لألعاب وبطاقات وغرف جديدة.',
    about: 'حول',
    founder: 'المؤسس',
    founderDesc: 'أحمد إمبابي - صانع محتوى ومؤسس هذا التطبيق.',
    devTeam: 'فريق التطوير',
    devTeamDesc: 'المطورون وراء هذا التطبيق.',
    privacyPolicy: 'سياسة الخصوصية',
    privacyPolicyDesc: 'اقرأ كيف تتعامل ألعاب إمبابي مع بياناتك.',
    logout: 'تسجيل الخروج',
    manageAccount: 'إدارة الحساب..',
    deleteAccount: 'حذف الحساب',
    language: 'اللغة',

    // Leaderboard
    leaderboard: 'التصنيفات',
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    yearly: 'سنوي',
    dailyPrize: 'جوائز يومية 🎁',
    dailyPrizeDesc: 'نافس كل يوم علي كويز مجانية ',
    weeklyPrize: 'جائزة المركز الأول',
    weeklyPrizeDesc: 'صاحب مركز الاول كل اسبوع هيكسب هياخد 1000 كوين  وتاني كاسيس و ثالث  سوارز',
    monthlyPrize: 'جائزة المركز الأول',
    monthlyPrizeDesc: 'صاحب مركز الاول هياخد حساب هنعلن عليه قبلها  وتاني هياخد 3000 كوين و ثالث هياخد 1000 كوين ',
    yearlyPrize: 'جائزة المركز الأول',
    yearlyPrizeDesc: 'يجي يتصور معانا في ستديو ونجيبه يصور معايا و نلعب مع بعض ماتش ',
    myRank: 'مركزك',
    points: 'نقطة',
    wins: 'انتصارا',
    pts: 'نقا',
    matches: 'مباراة',
    lastUpdate: 'آخر تحديث',
    currentStandings: '🏆 ده ترتيب الفترة الحالية',
    noOtherPlayers: 'لا يوجد لاعبون آخرون حتى الآن',

    // Profile
    profileTitle: 'الملف الشخصي',
    name: 'الاسم',
    updateName: 'تحديث الاسم',
    phone: 'رقم الهاتف',
    updatePhone: 'تحديث رقم الهاتف',
    phoneUpdated: 'تم تحديث رقم الهاتف بنجاح!',
    phonePlaceholder: 'أدخل رقم هاتفك للتواصل معك',
    adminWinnersArchive: '🏆 سجل الفائزين بالجوائز (خاص بالمسؤول)',
    saving: 'جاري الحفظ...',
    gameStats: 'إحصائيات اللعب',
    totalMatches: 'إجمالي الماتشات',
    win: 'فوز',
    loss: 'خسارة',
    draw: 'تعادل',
    nameUpdated: 'تم تحديث الاسم بنجاح!',
    updateError: 'حدث خطأ أثناء التحديث.',
    signOutConfirm: 'هل أنت متأكد؟',
    signOutTitle: 'تسجيل الخروج',
    signOutBtn: 'خروج',
    photoFeatureDisabled: 'ميزة تغيير الصورة موقوفة حالياً، سيتم تفعيلها قريباً!',
  },
  en: {
    // Common
    back: '←',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',

    // Home Screen
    playNow: 'Play Now',
    leaderboards: 'Leaderboards',
    home: 'Home',
    settings: 'Settings',
    tagline: 'Predict, Bid, and Win Coins!',

    // Settings Screen
    settingsTitle: 'Settings',
    account: 'Account',
    currentLanguage: 'Current Language',
    arabicLang: 'العربية',
    englishLang: 'English',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    switchToDark: 'Tap to switch to Dark Mode',
    switchToLight: 'Tap to switch to Light Mode',
    notifications: 'Notifications',
    notificationsDesc: 'Allow the app to send you alerts.',
    music: 'Music',
    musicDesc: 'Play background music in the app.',
    vibration: 'Vibration',
    vibrationDesc: 'Feel a subtle vibration on tap and action confirmation.',
    sfx: 'Sound Effects',
    sfxDesc: 'Play auction, countdown and success sounds during matches.',
    howToPlay: 'How to Play',
    howToPlayDesc: 'A quick guide to each game from start to finish.',
    contactUs: 'Contact Us',
    contactUsDesc: 'Reach the team for support or to report bugs.',
    suggestions: 'Suggestions',
    suggestionsDesc: 'Share ideas for new games, cards, rooms and systems.',
    about: 'About',
    founder: 'Founder',
    founderDesc: 'Ahmed Embabi – Content creator and founder of this app.',
    devTeam: 'Dev Team',
    devTeamDesc: 'The developers behind this app.',
    privacyPolicy: 'Privacy Policy',
    privacyPolicyDesc: 'Read how Embabi Games handles your data.',
    logout: 'Sign Out',
    manageAccount: 'Manage Account..',
    deleteAccount: 'Delete Account',
    language: 'Language',

    // Leaderboard
    leaderboard: 'Leaderboard',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    dailyPrize: 'Daily Prizes 🎁',
    dailyPrizeDesc: 'Compete every day for free coins!',
    weeklyPrize: '1st Place Prize',
    weeklyPrizeDesc: '🥇 1st gets 1000 coins, 🥈 2nd gets Cassius, 🥉 3rd gets Suarez!',
    monthlyPrize: '1st Place Prize',
    monthlyPrizeDesc: '🥇 1st wins a special account (announced beforehand), 🥈 2nd gets 3000 coins, 🥉 3rd gets 1000 coins!',
    yearlyPrize: '1st Place Prize',
    yearlyPrizeDesc: 'Top player gets to visit our studio, shoot content with us and play a match together! 🎬⚽',
    myRank: 'My Rank',
    points: 'pts',
    wins: 'Wins',
    pts: 'pts',
    matches: 'matches',
    lastUpdate: 'Last update',
    currentStandings: '🏆 Current Period Standings',
    noOtherPlayers: 'No other players yet',

    // Profile
    profileTitle: 'Profile',
    name: 'Name',
    updateName: 'Update Name',
    phone: 'Phone Number',
    updatePhone: 'Update Phone',
    phoneUpdated: 'Phone number updated successfully!',
    phonePlaceholder: 'Enter your phone number',
    adminWinnersArchive: '🏆 Winners Archive (Admin Only)',
    saving: 'Saving...',
    gameStats: 'Game Stats',
    totalMatches: 'Total Matches',
    win: 'Wins',
    loss: 'Losses',
    draw: 'Draws',
    nameUpdated: 'Name updated successfully!',
    updateError: 'An error occurred while updating.',
    signOutConfirm: 'Are you sure?',
    signOutTitle: 'Sign Out',
    signOutBtn: 'Sign Out',
    photoFeatureDisabled: 'Photo change is currently disabled, coming soon!',
  },
};

export type Lang = 'ar' | 'en';
export type TranslationKey = keyof typeof translations.ar;

// ── Context ────────────────────────────────────────────────────
interface LanguageContextType {
  lang: Lang;
  isRTL: boolean;
  t: (key: TranslationKey) => string;
  toggleLanguage: () => void;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'ar',
  isRTL: true,
  t: (key) => translations.ar[key],
  toggleLanguage: () => {},
  setLang: () => {},
});

// ── Provider ───────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ar');

  useEffect(() => {
    AsyncStorage.getItem('appLang').then((v) => {
      if (v === 'en' || v === 'ar') setLangState(v);
    });
  }, []);

  const isRTL = lang === 'ar';

  const t = (key: TranslationKey): string => {
    return translations[lang][key] ?? translations.ar[key] ?? key;
  };

  const applyLang = (newLang: Lang) => {
    setLangState(newLang);
    AsyncStorage.setItem('appLang', newLang);
    // Set RTL direction
    const shouldBeRTL = newLang === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
    }
  };

  const toggleLanguage = () => applyLang(lang === 'ar' ? 'en' : 'ar');
  const setLang = (l: Lang) => applyLang(l);

  return (
    <LanguageContext.Provider value={{ lang, isRTL, t, toggleLanguage, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────
export function useLanguage() {
  return useContext(LanguageContext);
}
