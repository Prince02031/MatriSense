'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [solutionStep, setSolutionStep] = useState(1);

  const slides = [
    {
      id: 'problem',
      title: 'The Problem',
      subtitle: 'Rural maternal danger signs are recognized too late',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          {/* Left Column: Mothers & Health Workers Pain Points */}
          <div className="space-y-6">
            {/* Mothers Card */}
            <div className="bg-white rounded-3xl p-8 border border-teal-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/50 rounded-full blur-2xl transition-all"></div>
              <div className="flex items-center gap-3.5 mb-5 relative z-10">
                <span className="text-2xl">🌱</span>
                <h3 className="text-lg font-black text-teal-900 tracking-tight">Mothers Face</h3>
              </div>
              <ul className="space-y-4 relative z-10">
                <li className="flex items-start gap-3 text-sm leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-1 select-none font-bold">▸</span>
                  <span>Symptoms are described informally in Bangla or voice.</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-1 select-none font-bold">▸</span>
                  <span>Distance, monsoon, cost, stigma, and household permission delay care.</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-1 select-none font-bold">▸</span>
                  <span>Families may confuse normal discomfort with danger signs.</span>
                </li>
              </ul>
            </div>

            {/* Health Workers Card */}
            <div className="bg-white rounded-3xl p-8 border border-teal-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full blur-2xl transition-all"></div>
              <div className="flex items-center gap-3.5 mb-5 relative z-10">
                <span className="text-2xl">🩺</span>
                <h3 className="text-lg font-black text-teal-900 tracking-tight">Health Workers Face</h3>
              </div>
              <ul className="space-y-4 relative z-10">
                <li className="flex items-start gap-3 text-sm leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-1 select-none font-bold">▸</span>
                  <span>Missing pregnancy records and previous complication history.</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-1 select-none font-bold">▸</span>
                  <span>Repeated manual history collection during urgent moments.</span>
                </li>
                <li className="flex items-start gap-3 text-sm leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-1 select-none font-bold">▸</span>
                  <span>No early structured risk signal or priority queue.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: The Core Gap */}
          <div className="flex flex-col justify-between space-y-6">
            {/* Dark Teal highlight card (matching the docs headers & brand) */}
            <div className="flex-grow bg-[#042f2e] text-white rounded-3xl p-8 shadow-sm flex flex-col justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(20,184,166,0.1),transparent_60%)]"></div>
              <div className="relative z-10 space-y-4">
                <span className="text-[10px] font-black tracking-widest uppercase bg-teal-500/20 text-teal-300 px-3.5 py-1.5 rounded-full border border-teal-500/30 w-fit block">
                  The Clinical Gap
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight font-sans">The Clinical Gap</h3>
                <p className="text-sm text-teal-100/70 leading-relaxed font-medium">
                  Existing tools support records, forms, reminders, or general health advice.
                </p>
                <div className="h-px bg-teal-950/80 my-6"></div>
                <p className="text-sm font-black text-teal-300 leading-relaxed">
                  The missing link is the path from first home symptom → structured risk signal → timely human referral.
                </p>
              </div>
            </div>

            {/* Micro warning indicator */}
            <div className="bg-white border border-teal-100 rounded-2xl p-5 flex items-center gap-4 text-left shadow-sm">
              <span className="text-2xl text-amber-500 animate-pulse">⚠️</span>
              <div>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Global Maternal Health Pattern</p>
                <p className="text-xs text-gray-700 font-bold">Delayed recognition and delayed referral remain major barriers in preventable maternal complications and deaths.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'solution',
      title: 'The Solution',
      subtitle: 'AI-native maternal triage & referral system',
      content: (
        <div className="space-y-6 mt-6">
          {/* Subtitle callout */}
          <div className="bg-teal-50/50 border border-teal-100/80 rounded-2xl px-6 py-4">
            <p className="text-sm font-bold text-teal-800">
              ✨ From Bangla home symptom reports to structured, referral-ready maternal cases.
            </p>
          </div>

          {/* 3-Column Stakeholder Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* For Mothers */}
            <div className={`bg-white rounded-3xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-all duration-700 relative overflow-hidden group ${solutionStep >= 1 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
              }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50/40 rounded-full blur-xl"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <span className="text-xl">🌱</span>
                <h3 className="text-base font-black text-teal-900 tracking-tight">For Mothers</h3>
              </div>
              <ul className="space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Private Bangla text or voice reporting directly from home.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Instant early warning guidance based on evidence.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Lower unnecessary travel for low-risk concerns.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Faster escalation to hospital when risk is high.</span>
                </li>
              </ul>
            </div>

            {/* For Health Workers */}
            <div className={`bg-white rounded-3xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-all duration-700 relative overflow-hidden group ${solutionStep >= 2 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
              }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-full blur-xl"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <span className="text-xl">🩺</span>
                <h3 className="text-base font-black text-teal-900 tracking-tight">For Health Workers</h3>
              </div>
              <ul className="space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Structured, automated maternal case summaries.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Pregnancy profile details and symptom timelines.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Risk-prioritized case dashboard to manage triages.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Direct referral logs and nearby hospital contexts.</span>
                </li>
              </ul>
            </div>

            {/* For the Health System */}
            <div className={`bg-white rounded-3xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-all duration-700 relative overflow-hidden group ${solutionStep >= 3 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
              }`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50/40 rounded-full blur-xl"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <span className="text-xl">🌐</span>
                <h3 className="text-base font-black text-teal-900 tracking-tight">For the Health System</h3>
              </div>
              <ul className="space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Longitudinal, secure rural pregnancy records.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Better visibility into previously underreported symptoms.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Cleaner, structured rural maternal-risk datasets.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Governed, human-in-the-loop referral workflows.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Philosophy Statement Bottom Callout */}
          <div className={`bg-[#042f2e] text-white rounded-2xl p-6 shadow-sm border border-teal-950 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden group transition-all duration-700 ${solutionStep >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(20,184,166,0.08),transparent_60%)]"></div>
            <div className="relative z-10 flex items-center gap-3">
              <span className="text-2xl">🧠</span>
              <p className="text-sm font-black tracking-wide text-teal-100">
                LLMs <span className="text-teal-300">understand and explain</span>. Rules <span className="text-teal-300">decide urgency</span>. Health workers <span className="text-teal-300">make care decisions</span>.
              </p>
            </div>
            <span className="relative z-10 text-[9px] font-black uppercase tracking-widest bg-teal-800 text-teal-300 border border-teal-700 px-3 py-1.5 rounded-full select-none">
              Core Philosophy
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'impact',
      title: 'Impact & Next Step',
      subtitle: 'Build and scaling of MatriSense',
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6 animate-fadeIn">
          {/* Left Column: KPIs & Growth Path */}
          <div className="space-y-6">
            {/* Measurable Impact KPIs Card */}
            <div className="bg-white rounded-3xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50/40 rounded-full blur-xl"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <span className="text-xl">📊</span>
                <h3 className="text-base font-black text-teal-900 tracking-tight">Measurable Impact KPIs</h3>
              </div>
              <ul className="space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Time from symptom report to LOW / MEDIUM / HIGH risk flag.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>High-risk and medium-risk cases surfaced to health workers.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Follow-up question completion and referral assignment rate.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Reduction in repeated manual history collection.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-teal-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Safety validation pass rate for patient-facing AI guidance.</span>
                </li>
              </ul>
            </div>

            {/* Growth Path Card */}
            <div className="bg-white rounded-3xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-full blur-xl"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <span className="text-xl">📈</span>
                <h3 className="text-base font-black text-teal-900 tracking-tight">Growth Path</h3>
              </div>
              <ul className="space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-emerald-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Start with rural pregnant mothers and frontline health workers.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-emerald-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Expand through community clinics, NGO maternal-health programs, and referral hospitals.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-emerald-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Support district health teams with structured longitudinal pregnancy data.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: Next Build & Vision */}
          <div className="flex flex-col justify-between space-y-6">
            {/* Next Build Card */}
            <div className="bg-white rounded-3xl p-6 border border-teal-100 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group flex-grow">
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-50/40 rounded-full blur-xl"></div>
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <span className="text-xl">🛠️</span>
                <h3 className="text-base font-black text-teal-900 tracking-tight">Next Build</h3>
              </div>
              <ul className="space-y-3 relative z-10">
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-cyan-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Extend rule engine more risk factors, checkup gaps, and profile-aware modifiers.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-cyan-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Add workflow MCP tools for Guided Care Assistant: triage context, safe RAG preview, hospital lookup, draft referral message, and safety validation.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-cyan-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Expand district-wise referral data with hospital services, capacity, travel context, and reassignment logic.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-cyan-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Add GraphRAG-style retrieval on top of stable Vector RAG for more explainable symptom-to-source grounding.</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-600 font-medium">
                  <span className="text-cyan-600 mt-0.5 select-none font-bold">▸</span>
                  <span>Build analytics for maternal-risk trends, follow-up outcomes, and referral bottlenecks.</span>
                </li>
              </ul>
            </div>

            {/* Vision Callout - matching previous slides' bottom callout style */}
            <div className="bg-[#042f2e] text-white rounded-2xl p-6 shadow-sm border border-teal-950 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_120%,rgba(20,184,166,0.08),transparent_60%)]"></div>
              <div className="relative z-10 flex items-center gap-3">
                <span className="text-2xl"></span>
                <p className="text-sm font-black tracking-wide text-teal-100">
                  Vision: <span className="text-teal-300 font-bold">Bangladesh-first, globally reusable</span> AI-native triage and referral infrastructure for low-resource maternal care.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'demo',
      title: 'Short Demo',
      subtitle: 'Short Demo',
      content: (
        <div className="min-h-[400px] flex flex-col items-center justify-center bg-white rounded-3xl p-8 border border-teal-100 shadow-sm mt-6">
          <p className="text-sm text-gray-400 font-medium italic">Demo space is prepared</p>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentSlide === 0) {
      setCurrentSlide(1);
      setSolutionStep(1);
    } else if (currentSlide === 1) {
      if (solutionStep < 3) {
        setSolutionStep(prev => prev + 1);
      } else {
        setCurrentSlide(2);
      }
    } else if (currentSlide === 2) {
      setCurrentSlide(3);
    }
  };

  const handlePrev = () => {
    if (currentSlide === 3) {
      setCurrentSlide(2);
    } else if (currentSlide === 2) {
      setCurrentSlide(1);
      setSolutionStep(3);
    } else if (currentSlide === 1) {
      if (solutionStep > 1) {
        setSolutionStep(prev => prev - 1);
      } else {
        setCurrentSlide(0);
      }
    }
  };

  // Keyboard navigation listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSlide, solutionStep]);

  const activeSlideData = slides[currentSlide];
  const isPrevDisabled = currentSlide === 0;
  const isNextDisabled = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-800 flex flex-col justify-between font-sans relative overflow-hidden">
      {/* Decorative Grid Patterns - Subtle */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(13,148,136,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(13,148,136,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70"></div>

      {/* Header - Dark Teal banner matching sidebar/logo */}
      <header className="relative z-10 bg-[#042f2e] text-white px-6 py-5 flex items-center justify-between border-b border-teal-950 shadow-md">
        <Link href="/" className="flex items-center gap-2.5 text-base font-black text-teal-400 hover:text-teal-300 transition">
          <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm border border-teal-500/30">M</span>
          <span>MatriSense</span>
        </Link>
        <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">
          Product Pitch Deck
        </span>
      </header>

      {/* Slide Content Container */}
      <main className="relative z-10 flex-grow max-w-7xl w-full mx-auto px-6 py-10 flex flex-col justify-center">
        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-full w-fit block">
              Slide {currentSlide + 1} of {slides.length} {currentSlide === 1 ? `• Step ${solutionStep}/3` : ''} • {activeSlideData.title}
            </span>
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-teal-900 mt-2">
              {activeSlideData.subtitle}
            </h2>
          </div>
          <div className="animate-fadeIn transition-all duration-300">
            {activeSlideData.content}
          </div>
        </div>
      </main>

      {/* Footer Navigation Bar - matching the clean docs footer */}
      <footer className="relative z-10 bg-white border-t border-teal-50/60 py-5 px-6 lg:px-10 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        <Link href="/docs" className="text-[10px] font-black text-teal-700 hover:text-teal-900 transition">
          ← Back to Tech Docs
        </Link>

        {/* Slide navigation controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            disabled={isPrevDisabled}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-base transition active:scale-95 duration-150 ${isPrevDisabled
              ? 'border-gray-150 text-gray-300 cursor-not-allowed opacity-50'
              : 'border-teal-200 text-teal-700 bg-teal-50/20 hover:bg-teal-50 hover:text-teal-900'
              }`}
            title="Previous Slide / Step"
          >
            ‹
          </button>

          <button
            onClick={handleNext}
            disabled={isNextDisabled}
            className={`w-10 h-10 rounded-xl flex items-center justify-center border font-bold text-base transition active:scale-95 duration-150 ${isNextDisabled
              ? 'border-gray-150 text-gray-300 cursor-not-allowed opacity-50'
              : 'border-teal-200 text-teal-700 bg-teal-50/20 hover:bg-teal-50 hover:text-teal-900'
              }`}
            title="Next Slide / Step"
          >
            ›
          </button>
        </div>

        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          {activeSlideData.id.replace('-', ' ')} view
        </p>
      </footer>

      {/* Animations styling */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
