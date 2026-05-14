'use client';

import React from 'react';
import ReadAloudButton from './ReadAloudButton';

/**
 * ResultReadAloudButton
 * specialized button to read the final triage result safeOutput.
 * NOTE: This provides an empathetic audio summary of the clinical findings. 
 * It reads in a specific prioritized order (Risk -> Explanation -> Steps).
 */
const ResultReadAloudButton = ({ safeOutput, decision, disabled }) => {
  if (!safeOutput) return null;

  // Map risk levels to human-friendly Bangla labels
  const riskLabels = {
    'HIGH': 'জরুরী পদক্ষেপ প্রয়োজন',
    'MEDIUM': 'চিকিৎসকের পরামর্শ নিন',
    'LOW': 'বাড়িতে পর্যবেক্ষণ করুন'
  };

  // Build ordered segments for reading
  const segments = [
    // 1. Risk Level / Urgency
    { id: 'risk', text: riskLabels[decision?.riskLevel] || `আপনার ঝুঁকির মাত্রা ${decision?.riskLevel || ''}` },
    
    // 2. Mother Explanation
    { id: 'explanation', text: safeOutput.motherExplanationBn },
    
    // 3. Actionable Steps
    ...(safeOutput.stepsNowBn && safeOutput.stepsNowBn.length > 0 
      ? [{ id: 'steps-intro', text: 'আপনার জন্য নিচের পদক্ষেপগুলো গুরুত্বপূর্ণ:' }, 
         ...safeOutput.stepsNowBn.map((s, i) => ({ id: `step-${i}`, text: s }))] 
      : []),
    
    // 4. Monitoring
    ...(safeOutput.monitorBn && safeOutput.monitorBn.length > 0 
      ? [{ id: 'monitor-intro', text: 'যেই বিষয়গুলো খেয়াল রাখবেন:' }, 
         ...safeOutput.monitorBn.map((m, i) => ({ id: `mon-${i}`, text: m }))] 
      : []),
      
    // 5. Urgent Warnings
    ...(safeOutput.urgentWarningBn && safeOutput.urgentWarningBn.length > 0 
      ? [{ id: 'warnings-intro', text: 'নিচের বিপদচিহ্নগুলো দেখা দিলে সাথে সাথে হাসপাতালে যান:' }, 
         ...safeOutput.urgentWarningBn.map((w, i) => ({ id: `warn-${i}`, text: w }))] 
      : []),
      
    // 6. Safety Disclaimer
    { id: 'disclaimer', text: safeOutput.safetyDisclaimerBn || 'দয়া করে মনে রাখবেন এটি একটি কৃত্রিম বুদ্ধিমত্তার পরামর্শ মাত্র।' }
  ].filter(seg => seg.text && seg.text.trim().length > 0);

  return (
    <ReadAloudButton 
      segments={segments} 
      label="ফলাফল শুনুন" 
      disabled={disabled} 
    />
  );
};

export default ResultReadAloudButton;
