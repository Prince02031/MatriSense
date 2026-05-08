'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext(null);

const translations = {
  bn: {
    languageLabel: 'ভাষা সেটিংস',
    languageHelper: 'বাংলা বা ইংরেজি নির্বাচন করুন।',
    languageToggleLabel: 'ভাষা নির্বাচন',
    english: 'English',
    bangla: 'বাংলা',
    saveNote: 'পরিবর্তন সাথে সাথে কার্যকর হবে।',
    guestBadge: '🩺 MatriSense · মাতৃত্বকালীন ঝুঁকি মূল্যায়ন',
    guestTitle: 'নিরাপদ মাতৃত্বের জন্য এক ধাপে এক ধাপে সহায়তা',
    guestSubtitle:
      'MatriSense হলো বাংলা-প্রথম মাতৃত্বকালীন স্বাস্থ্য ট্রায়াজ সিস্টেম। এটি কোনো রোগ নির্ণয় বা চিকিৎসা নির্দেশনা দেয় না—ঝুঁকি বুঝতে এবং সঠিক পদক্ষেপ নিতে সহায়তা করে।',
    login: 'লগইন করুন',
    register: 'অ্যাকাউন্ট তৈরি করুন',
    roleHint: 'ভূমিকা নির্বাচন করুন: মা (Mother) অথবা স্বাস্থ্যকর্মী (Health Worker)',
    stepsTitle: 'ট্রায়াজ ধাপগুলো',
    stepsProgress: 'Step 1/6',
    steps: [
      {
        title: 'মা-এর প্রোফাইল পূরণ করুন',
        text: 'নাম, বয়স, গর্ভকাল ও জরুরি যোগাযোগ যুক্ত করুন।',
      },
      {
        title: 'উপসর্গ লিখুন (বাংলা)',
        text: 'আপনার অনুভূত লক্ষণগুলো সহজ বাংলায় লিখুন।',
      },
      {
        title: 'AI দ্বারা যাচাই',
        text: 'AI আপনার উপসর্গগুলো শনাক্ত করবে—আপনি নিশ্চিত করবেন।',
      },
      {
        title: 'ফলো-আপ প্রশ্ন',
        text: '২-৩টি সংক্ষিপ্ত প্রশ্নের উত্তর দিন।',
      },
      {
        title: 'ঝুঁকি ফলাফল',
        text: 'LOW / MEDIUM / HIGH ঝুঁকি কার্ড দেখাবে।',
      },
      {
        title: 'করণীয় নির্দেশনা',
        text: 'এখন কী করবেন, কী পর্যবেক্ষণ করবেন, সতর্ক সংকেত।',
      },
    ],
    low: 'কম ঝুঁকি',
    medium: 'মাঝারি ঝুঁকি',
    high: 'উচ্চ ঝুঁকি',
    lowHelp: 'স্বাভাবিক পর্যবেক্ষণ চালিয়ে যান।',
    mediumHelp: 'স্বাস্থ্যকর্মীর সাথে দ্রুত যোগাযোগ করুন।',
    highHelp: 'জরুরি সেবায় যান অথবা কল করুন।',
    disclaimerTitle: 'সতর্ক বার্তা',
    disclaimerBody:
      'MatriSense রোগ নির্ণয় করে না এবং ওষুধ সেবনের পরামর্শ দেয় না। উপসর্গ গুরুতর হলে দ্রুত নিকটস্থ চিকিৎসা কেন্দ্রে যোগাযোগ করুন।',
    patientWelcome: 'স্বাগতম',
    patientLead: 'আজকের অনুভূতি জানান, আমরা ঝুঁকি নির্ধারণ করে করণীয় জানাবো।',
    patientStart: 'নতুন ট্রায়াজ শুরু করুন',
    patientHistory: 'পূর্বের ইতিহাস দেখুন',
    goToDashboard: 'ড্যাশবোর্ডে যান',
    patientStatus: 'আজকের অবস্থা',
    patientNext: 'পরবর্তী পদক্ষেপ',
    patientNextValue: 'উপসর্গ লিখুন',
    patientNextHelp: 'বাংলায় আপনার লক্ষণ জানান।',
    patientSupport: 'সহায়তা',
    patientSupportHelp: 'প্রয়োজনে দ্রুত যোগাযোগ করুন।',
    patientWarningTitle: 'সতর্ক সংকেত',
    patientWarningBody: 'মাথা ঘোরা, তীব্র ব্যথা বা রক্তপাত হলে দ্রুত চিকিৎসা কেন্দ্রে যান। MatriSense রোগ নির্ণয় করে না।',
    quickActions: 'দ্রুত পদক্ষেপ',
    reportSymptoms: 'উপসর্গ জানান',
    reportSymptomsHelp: 'বাংলায় আপনার লক্ষণ লিখুন।',
    viewHistory: 'ইতিহাস দেখুন',
    viewHistoryHelp: 'পূর্বের ট্রায়াজ ফলাফল দেখুন।',
    myProfile: 'আমার প্রোফাইল',
    myProfileHelp: 'গর্ভকাল ও যোগাযোগ আপডেট করুন।',
    emergencyHelp: 'জরুরি সহায়তা',
    emergencyHelpText: 'দ্রুত স্বাস্থ্যকর্মীর সাথে যোগাযোগ করুন।',
    yourSummary: 'আপনার সারাংশ',
    active: 'সক্রিয়',
    triageSessions: 'ট্রায়াজ সেশন',
    nextCheckup: 'পরবর্তী চেকআপের তারিখ',
    currentRisk: 'বর্তমান ঝুঁকি স্তর',
    workerTitle: 'ড্যাশবোর্ড (ডেমো)',
    workerSubtitle: 'এটি একটি ডেমো ড্যাশবোর্ড—শিগগিরই লাইভ কেস যুক্ত হবে।',
    workerStats: ['নতুন কেস', 'উচ্চ ঝুঁকি', 'মাঝারি ঝুঁকি', 'লো ঝুঁকি'],
    workerCasesTitle: 'সাম্প্রতিক কেস (ডেমো)',
    workerTag: 'মাঝারি',
    adminTitle: 'সিস্টেম ওভারভিউ',
    adminSubtitle: 'এখানে প্ল্যাটফর্ম স্বাস্থ্য ও রেফারেল সারাংশ দেখানো হবে।',
    adminUsers: 'মোট ব্যবহারকারী',
    adminCases: 'সক্রিয় কেস',
    adminReferrals: 'রেফারেল',
    adminNotes: 'সিস্টেম নোট',
    adminNoteItems: [
      'রোল ভিত্তিক অ্যাক্সেস সক্রিয়।',
      'ঝুঁকি স্তর ও কেস রেফারেল নিয়ম এখানে আসবে।',
      'ডেটা সোর্স যোগ হলে অ্যানালিটিক্স দেখানো হবে।',
    ],
  },
  en: {
    languageLabel: 'Language settings',
    languageHelper: 'Choose Bengali or English.',
    languageToggleLabel: 'Language',
    english: 'English',
    bangla: 'বাংলা',
    saveNote: 'Changes apply instantly.',
    guestBadge: '🩺 MatriSense · Maternal health triage',
    guestTitle: 'Step-by-step guidance for safer motherhood',
    guestSubtitle:
      'MatriSense is a Bangla-first maternal health triage system. It does not diagnose disease or prescribe medicine— it helps you understand risk and next steps.',
    login: 'Log in',
    register: 'Create account',
    roleHint: 'Choose a role: Mother or Health Worker',
    stepsTitle: 'Triage steps',
    stepsProgress: 'Step 1/6',
    steps: [
      {
        title: 'Complete mother profile',
        text: 'Add name, age, gestational weeks, and emergency contact.',
      },
      {
        title: 'Describe symptoms (Bangla)',
        text: 'Write your symptoms in simple Bangla text.',
      },
      {
        title: 'AI confirmation',
        text: 'AI extracts symptoms— you confirm them.',
      },
      {
        title: 'Follow-up questions',
        text: 'Answer 2–3 short questions.',
      },
      {
        title: 'Risk result',
        text: 'LOW / MEDIUM / HIGH risk card is shown.',
      },
      {
        title: 'Care guidance',
        text: 'What to do now, what to monitor, warning signs.',
      },
    ],
    low: 'Low risk',
    medium: 'Medium risk',
    high: 'High risk',
    lowHelp: 'Continue regular monitoring.',
    mediumHelp: 'Contact a health worker soon.',
    highHelp: 'Seek urgent care or call for help.',
    disclaimerTitle: 'Safety notice',
    disclaimerBody:
      'MatriSense does not diagnose disease or prescribe medicine. If symptoms are severe, contact a nearby clinic immediately.',
    patientWelcome: 'Welcome back',
    patientLead: 'Share how you feel today and we will guide next steps.',
    patientStart: 'Start new triage',
    patientHistory: 'View history',
    goToDashboard: 'Go to dashboard',
    patientStatus: 'Today’s status',
    patientNext: 'Next step',
    patientNextValue: 'Describe symptoms',
    patientNextHelp: 'Write your symptoms in Bangla.',
    patientSupport: 'Support',
    patientSupportHelp: 'Reach a health worker when needed.',
    patientWarningTitle: 'Warning signs',
    patientWarningBody: 'If you feel dizzy, severe pain, or bleeding, seek care immediately. MatriSense does not diagnose.',
    quickActions: 'Quick actions',
    reportSymptoms: 'Report symptoms',
    reportSymptomsHelp: 'Describe how you feel in Bangla.',
    viewHistory: 'View history',
    viewHistoryHelp: 'See past triage results.',
    myProfile: 'My profile',
    myProfileHelp: 'Update pregnancy details and contacts.',
    emergencyHelp: 'Emergency help',
    emergencyHelpText: 'Reach a health worker immediately.',
    yourSummary: 'Your summary',
    active: 'Active',
    triageSessions: 'Triage sessions',
    nextCheckup: 'Next checkup date',
    currentRisk: 'Current risk level',
    workerTitle: 'Dashboard (demo)',
    workerSubtitle: 'This is a demo dashboard—live cases will appear soon.',
    workerStats: ['New cases', 'High risk', 'Medium risk', 'Low risk'],
    workerCasesTitle: 'Recent cases (demo)',
    workerTag: 'Medium',
    adminTitle: 'System overview',
    adminSubtitle: 'Platform health and referral summary will appear here.',
    adminUsers: 'Total users',
    adminCases: 'Active cases',
    adminReferrals: 'Referrals',
    adminNotes: 'System notes',
    adminNoteItems: [
      'Role-based access is active.',
      'Risk and referral rules will be shown here.',
      'Analytics will appear when data sources are connected.',
    ],
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('bn');

  useEffect(() => {
    const saved = localStorage.getItem('matrisense_lang');
    if (saved === 'bn' || saved === 'en') {
      setLanguage(saved);
    }
  }, []);

  const updateLanguage = (next) => {
    setLanguage(next);
    localStorage.setItem('matrisense_lang', next);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage: updateLanguage,
      t: translations[language],
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
