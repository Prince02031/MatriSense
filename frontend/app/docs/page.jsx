'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import docsApi from '../api/docsApi';
import { docsContent } from './docsContent';

// Dynamic Markdown-to-Cards parser
// Preserves empty lines within card content so renderMarkdown can split paragraphs correctly
const parseMarkdownToCards = (text) => {
  if (!text) return { title: '', cards: [] };

  const lines = text.split('\n');
  const cards = [];
  let mainTitle = '';
  let currentCard = null;

  lines.forEach(line => {
    const trimmed = line.trim();

    // Extract main title from "# title" — skip line
    if (trimmed.startsWith('# ')) {
      mainTitle = trimmed.slice(2);
      return;
    }

    // Subheadings (## / ### / ####) begin a new card
    if (trimmed.startsWith('#### ') || trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      if (currentCard) cards.push(currentCard);

      let heading = trimmed;
      if (trimmed.startsWith('#### ')) heading = trimmed.slice(5);
      else if (trimmed.startsWith('### ')) heading = trimmed.slice(4);
      else if (trimmed.startsWith('## ')) heading = trimmed.slice(3);

      currentCard = { heading: heading.trim(), content: [] };
      return;
    }

    // All other lines (including empty ones) go into the current card's content
    // Empty lines are preserved so renderMarkdown can split on \n\n+ for paragraphs
    if (currentCard) {
      currentCard.content.push(line);
    } else if (trimmed) {
      // Intro text before any subheading — open a card without a heading
      currentCard = { heading: '', content: [line] };
    }
  });

  if (currentCard) cards.push(currentCard);

  return {
    title: mainTitle,
    cards: cards
      .map(card => ({ heading: card.heading, content: card.content.join('\n').trim() }))
      .filter(c => c.heading || c.content)
  };
};

// Inline Markdown formatter supporting headings, warnings, lists, bold text, links, code blocks, and images
const renderMarkdown = (text, onImageClick) => {
  if (!text) return null;
  
  const blocks = text.split(/\n\n+/);
  
  return blocks.map((block, idx) => {
    const trimmed = block.trim();
    if (!trimmed) return null;
    
    // Image tag: ![Alt Text](url)
    if (trimmed.startsWith('![') && trimmed.includes('](')) {
      const altMatch = trimmed.match(/!\[([^\]]*)\]/);
      const srcMatch = trimmed.match(/\(([^)]+)\)/);
      if (srcMatch) {
        const altText = altMatch ? altMatch[1] : 'Image';
        const srcUrl = srcMatch[1];
        return (
          <div key={idx} className="my-6 flex flex-col items-center justify-center w-full">
            <div 
              onClick={() => onImageClick && onImageClick({ src: srcUrl, alt: altText })}
              className="relative group overflow-hidden rounded-3xl border border-teal-100 shadow-md hover:shadow-xl transition-all duration-300 bg-white p-3 max-w-full cursor-zoom-in"
            >
              <img 
                src={srcUrl} 
                alt={altText} 
                className="max-h-[450px] w-auto max-w-full rounded-2xl object-contain group-hover:scale-[1.01] transition-transform duration-300"
              />
              {altText && (
                <div className="mt-3 text-center text-[10px] font-black text-teal-600/80 uppercase tracking-widest">
                  {altText}
                </div>
              )}
            </div>
          </div>
        );
      }
    }

    // Header tags
    if (trimmed.startsWith('# ')) {
      return <h1 key={idx} className="text-2xl font-black text-teal-900 tracking-tight mt-6 mb-4">{trimmed.slice(2)}</h1>;
    }
    if (trimmed.startsWith('## ')) {
      return <h2 key={idx} className="text-xl font-extrabold text-teal-800 tracking-tight mt-5 mb-3 border-b border-teal-50 pb-2">{trimmed.slice(3)}</h2>;
    }
    if (trimmed.startsWith('### ')) {
      return <h3 key={idx} className="text-base font-bold text-teal-800 mt-4 mb-2">{trimmed.slice(4)}</h3>;
    }
    
    // Blockquote / Alert tag
    if (trimmed.startsWith('> ')) {
      const cleanQuote = trimmed.replace(/^>\s*/gm, '');
      return (
        <div key={idx} className="my-3 p-4 bg-teal-50/70 border-l-4 border-teal-600 rounded-r-xl text-teal-900 text-xs leading-relaxed font-medium">
          {renderInlineMarkdown(cleanQuote)}
        </div>
      );
    }
    
    // Bulleted list tag
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const items = trimmed.split(/\n[*+-]\s+/);
      return (
        <ul key={idx} className="list-disc pl-5 space-y-1.5 my-3 text-gray-600 leading-relaxed text-xs">
          {items.map((item, itemIdx) => {
            const cleanItem = item.replace(/^[*+-]\s+/, '');
            return <li key={itemIdx}>{renderInlineMarkdown(cleanItem)}</li>;
          })}
        </ul>
      );
    }
    
    // Numbered list tag
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = trimmed.split(/\n\d+\.\s+/);
      return (
        <ol key={idx} className="list-decimal pl-5 space-y-1.5 my-3 text-gray-600 leading-relaxed text-xs">
          {items.map((item, itemIdx) => {
            const cleanItem = item.replace(/^\d+\.\s+/, '');
            return <li key={itemIdx}>{renderInlineMarkdown(cleanItem)}</li>;
          })}
        </ol>
      );
    }
    
    // Code block tag
    if (trimmed.startsWith('```')) {
      const lines = trimmed.split('\n');
      const codeLines = lines.slice(1, lines.length - 1).join('\n');
      return (
        <pre key={idx} className="my-3 p-4 bg-teal-950 text-teal-100 rounded-2xl overflow-x-auto font-mono text-[10px] leading-relaxed shadow-inner border border-teal-900/50">
          <code>{codeLines}</code>
        </pre>
      );
    }
    
    // Standard Paragraph
    return (
      <p key={idx} className="my-2.5 text-gray-600 leading-relaxed text-xs">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });
};

const renderInlineMarkdown = (text) => {
  if (!text) return '';
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return boldParts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const cleanBold = part.slice(2, -2);
      return <strong key={pIdx} className="font-bold text-teal-950">{renderInlineCodeAndLinks(cleanBold)}</strong>;
    }
    return renderInlineCodeAndLinks(part);
  });
};

const renderInlineCodeAndLinks = (text) => {
  const codeParts = text.split(/(`[^`]+`)/g);
  return codeParts.map((part, cIdx) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={cIdx} className="bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-md font-mono text-[11px] border border-teal-100/50">{part.slice(1, -1)}</code>;
    }
    const linkParts = part.split(/(\[[^\]]+\]\([^)]+\))/g);
    return linkParts.map((subPart, sIdx) => {
      if (subPart.startsWith('[') && subPart.includes('](')) {
        const textMatch = subPart.match(/\[([^\]]+)\]/);
        const urlMatch = subPart.match(/\(([^)]+)\)/);
        if (textMatch && urlMatch) {
          return (
            <a key={sIdx} href={urlMatch[1]} target="_blank" rel="noopener noreferrer" className="text-teal-700 hover:text-teal-900 hover:underline font-bold">
              {textMatch[1]}
            </a>
          );
        }
      }
      return subPart;
    });
  });
};

export default function DocsPage() {
  const [isAvailable, setIsAvailable] = useState(true);
  const [stats, setStats] = useState(null);
  const [activeSection, setActiveSection] = useState('hero');
  const [isLoading, setIsLoading] = useState(true);
  const [markdownSections, setMarkdownSections] = useState({});
  const [evidence, setEvidence] = useState([]);
  const [zoomedImage, setZoomedImage] = useState(null);

  useEffect(() => {
    const loadDocsData = async () => {
      try {
        const status = await docsApi.getDocsStatus();
        setIsAvailable(status.isAvailableNow);

        const contentRes = await docsApi.getDocsContent();
        if (contentRes && contentRes.success) {
          setMarkdownSections(contentRes.sections || {});
        }

        const evidenceRes = await docsApi.getDocsEvidence();
        if (evidenceRes && evidenceRes.success) {
          setEvidence(evidenceRes.evidence || []);
        }

        if (status.isAvailableNow) {
          const statsData = await docsApi.getDocsStats();
          setStats(statsData);
        }
      } catch (err) {
        console.warn('Error loading docs, fallback activated for demo:', err);
        setIsAvailable(true);

        try {
          const contentRes = await docsApi.getDocsContent();
          if (contentRes && contentRes.success) setMarkdownSections(contentRes.sections || {});
          
          const evidenceRes = await docsApi.getDocsEvidence();
          if (evidenceRes && evidenceRes.success) setEvidence(evidenceRes.evidence || []);

          const statsData = await docsApi.getDocsStats();
          setStats(statsData);
        } catch (subErr) {
          console.error('Fetch fallback error:', subErr);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDocsData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-700 mx-auto mb-4"></div>
          <p className="text-teal-900 font-bold text-sm tracking-wide">Loading MatriSense documentation...</p>
        </div>
      </div>
    );
  }

  if (!isAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 p-6">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-teal-100 text-center space-y-6">
            <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-inner border border-teal-100">🔒</div>
            <div>
              <h1 className="text-2xl font-black text-teal-950 mb-2">Documentation Not Available</h1>
              <p className="text-teal-700/70 text-xs leading-relaxed font-medium">
                MatriSense documentation is scheduled or temporarily locked. Please contact your coordinator.
              </p>
            </div>
            <div className="bg-teal-50/50 rounded-2xl p-5 text-left border border-teal-100/50 space-y-1">
              <p className="font-bold text-[10px] text-teal-500 uppercase tracking-widest">Active Schedule Window</p>
              <p className="text-xs font-extrabold text-teal-900">January 1 – December 31, 2026</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sections = [
    'hero',
    'pitch',
    'product-overview',
    'features',
    'architecture',
    'data-flow',
    'ai-layer',
    'rag-strategy',
    'evidence-library',
    'safety',
    'privacy',
    'regional-referral',
    'api-summary',
    'data-model',
    'stats',
    'team',
    'roadmap',
    'changelog',
    'judge-demo'
  ];

  const sectionTitles = {
    'hero': 'MatriSense Overview',
    'pitch': 'YC Pitch',
    'product-overview': 'Product Overview',
    'features': 'Feature Matrix',
    'architecture': 'Architecture',
    'data-flow': 'Data Flow',
    'ai-layer': 'AI Layer',
    'rag-strategy': 'RAG Strategy',
    'evidence-library': 'Evidence Library',
    'safety': 'Safety Guardrails',
    'privacy': 'Privacy & Data Protection',
    'regional-referral': 'Regional Referral',
    'api-summary': 'API Summary',
    'data-model': 'Data Model',
    'stats': 'Live Stats',
    'team': 'Team',
    'roadmap': 'Roadmap',
    'changelog': 'Changelog',
    'judge-demo': 'Judge Demo Guide'
  };

  const sectionIcons = {
    'hero': '🏠',
    'pitch': '💡',
    'product-overview': '🔍',
    'features': '📊',
    'architecture': '🏗️',
    'data-flow': '🔄',
    'ai-layer': '🧠',
    'rag-strategy': '📚',
    'evidence-library': '🛡️',
    'safety': '🚨',
    'privacy': '🔒',
    'regional-referral': '📍',
    'api-summary': '🔌',
    'data-model': '🗄️',
    'stats': '📈',
    'team': '👥',
    'roadmap': '🗺️',
    'changelog': '📝',
    'judge-demo': '⚡'
  };

  const renderBanner = (title, subtitle) => (
    <div className="relative bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950 text-white rounded-3xl p-8 lg:p-10 mb-8 shadow-md overflow-hidden border border-teal-900/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,rgba(20,184,166,0.15),transparent_60%)]"></div>
      <div className="relative z-10 space-y-2">
        <span className="text-[9px] font-bold tracking-widest uppercase bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full border border-teal-500/20">
          MatriSense system manual & specifications
        </span>
        <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-teal-100/70 text-xs max-w-2xl leading-relaxed font-medium">{subtitle}</p>}
      </div>
    </div>
  );

  const renderSection = () => {
    const section = docsContent[activeSection];
    const mdContent = markdownSections[activeSection];
    const { title, cards } = parseMarkdownToCards(mdContent || '');

    const activeTitle = title || sectionTitles[activeSection];
    const activeSub = "Official technical specification and clinical decision support logs.";

    // Helper to render Markdown cards in beautiful grid layout
    const renderMarkdownCards = () => {
      if (!cards || cards.length === 0) return null;

      // If only 1 card with no subheading (like hero summary intro), span full width nicely
      if (cards.length === 1 && !cards[0].heading) {
        return (
          <div className="bg-white rounded-3xl border border-teal-100/50 shadow-sm p-8 hover:shadow-md hover:border-teal-200 transition duration-300">
            <div className="text-xs text-gray-600 leading-relaxed">
              {renderMarkdown(cards[0].content, setZoomedImage)}
            </div>
          </div>
        );
      }

      // Check if the first card serves as an introduction (has no heading)
      const hasIntroCard = !cards[0].heading;
      const introCard = hasIntroCard ? cards[0] : null;
      const gridCards = hasIntroCard ? cards.slice(1) : cards;

      return (
        <div className="space-y-6">
          {introCard && (
            <div className="bg-white rounded-3xl border border-teal-100/50 shadow-sm p-8 hover:shadow-md hover:border-teal-200 transition duration-300">
              <div className="text-xs text-gray-600 leading-relaxed">
                {renderMarkdown(introCard.content, setZoomedImage)}
              </div>
            </div>
          )}

          {gridCards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {gridCards.map((card, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-teal-100/50 shadow-sm p-6 hover:shadow-md hover:border-teal-200 transition duration-300 flex flex-col justify-between">
                  <div className="space-y-4">
                    {card.heading && (
                      <div className="flex items-center gap-2 border-b border-teal-50/50 pb-3">
                        <span className="text-teal-600 text-sm select-none">{sectionIcons[activeSection] || '●'}</span>
                        <h3 className="text-sm font-bold text-teal-900 tracking-tight leading-snug">{card.heading}</h3>
                      </div>
                    )}
                    <div className="text-xs text-gray-600 leading-relaxed">
                      {renderMarkdown(card.content, setZoomedImage)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    const isStructural = ['features', 'architecture', 'data-flow', 'api-summary', 'data-model', 'stats', 'team'].includes(activeSection);

    if (!isStructural && activeSection !== 'evidence-library') {
      return (
        <div className="space-y-8 animate-fadeIn">
          {renderBanner(activeTitle, activeSub)}
          {renderMarkdownCards()}
        </div>
      );
    }

    switch (activeSection) {
      case 'features':
        return (
          <div className="space-y-8 animate-fadeIn">
            {renderBanner(activeTitle, activeSub)}
            {renderMarkdownCards()}
            {section?.features && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.features.map((category, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-teal-100 shadow-sm p-6 space-y-4 hover:shadow-md transition">
                    <h3 className="text-xs font-bold text-teal-700 border-b pb-2 uppercase tracking-widest">{category.category}</h3>
                    <ul className="space-y-3.5">
                      {category.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-3">
                          <span className={`text-xs mt-0.5 ${
                            item.status === 'implemented' ? 'text-emerald-500' : item.status === 'in_progress' ? 'text-amber-500' : 'text-gray-300'
                          }`}>
                            {item.status === 'implemented' ? '●' : item.status === 'in_progress' ? '▲' : '○'}
                          </span>
                          <div>
                            <p className="font-semibold text-xs text-gray-800 leading-snug">{item.name}</p>
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{item.status.replace('_', ' ')}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'architecture':
        return (
          <div className="space-y-8 animate-fadeIn">
            {renderBanner(activeTitle, activeSub)}
            {renderMarkdownCards()}
            {section?.layers && (
              <div className="space-y-4">
                {section.layers.map((layer, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-teal-100 shadow-sm p-6 border-l-4 border-teal-700 hover:shadow-md transition">
                    <h3 className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-3">{layer.name}</h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {layer.components.map((comp, j) => (
                        <li key={j} className="text-xs text-gray-600 flex items-center gap-2">
                          <span className="text-teal-400 text-xs">▸</span>
                          {comp}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'data-flow':
        return (
          <div className="space-y-8 animate-fadeIn">
            {renderBanner(activeTitle, activeSub)}
            {renderMarkdownCards()}
            {section?.steps && (
              <div className="bg-white rounded-3xl border border-teal-100 shadow-sm p-8">
                <div className="space-y-4">
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex gap-4 items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div className="flex-shrink-0 w-6 h-6 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center font-bold text-[11px] border border-teal-100 shadow-inner">
                        {i + 1}
                      </div>
                      <p className="text-xs text-gray-700 pt-0.5 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'evidence-library':
        return (
          <div className="space-y-8 animate-fadeIn">
            {renderBanner(activeTitle, activeSub)}
            {renderMarkdownCards()}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {evidence.map((item) => (
                <div key={item.id} className="bg-white rounded-3xl border border-teal-100/80 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between overflow-hidden">
                  <div className="p-8 space-y-6">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-100">
                          {item.type}
                        </span>
                        <span className="text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg bg-blue-50/70 text-blue-700 border border-blue-100">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-teal-950 tracking-tight leading-snug">{item.title}</h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Publisher: {item.publisher}</p>
                    </div>

                    {item.usedFor && item.usedFor.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">Used For</h4>
                        <ul className="grid grid-cols-1 gap-1.5">
                          {item.usedFor.map((uf, idx) => (
                            <li key={idx} className="text-xs text-gray-600 flex items-start gap-2.5">
                              <span className="text-teal-600 mt-1 select-none">•</span>
                              <span>{uf}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {item.relatedSymptoms && item.relatedSymptoms.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[9px] font-bold text-gray-400 tracking-wider uppercase">Related Symptoms</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {item.relatedSymptoms.map((sym, idx) => (
                            <span key={idx} className="text-xs text-gray-600 bg-gray-50 border border-gray-100/50 px-2 py-0.5 rounded-md font-medium">
                              {sym}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 border-t border-teal-50 pt-4">
                        {item.tags.map((tag, idx) => (
                          <span key={idx} className="text-[10px] text-gray-400 font-medium">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-teal-50/20 px-8 py-5 border-t border-teal-50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {item.fileName && (
                        item.fileExists ? (
                          <a
                            href={`/api/docs/evidence-file/${item.fileName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center bg-teal-850 hover:bg-teal-900 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-sm hover:shadow active:scale-95 duration-150"
                          >
                            View PDF
                          </a>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              disabled
                              className="inline-flex items-center justify-center bg-gray-200 text-gray-400 font-bold text-xs px-4 py-2 rounded-xl cursor-not-allowed"
                            >
                              View PDF
                            </button>
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-200 px-2 py-1 rounded-md uppercase tracking-wider">
                              File Not Added
                            </span>
                          </div>
                        )
                      )}
                    </div>
                    {item.externalUrl && (
                      <a
                        href={item.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-teal-800 hover:text-teal-900 hover:underline inline-flex items-center gap-1.5"
                      >
                        Open Source ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'api-summary':
        return (
          <div className="space-y-8 animate-fadeIn">
            {renderBanner(activeTitle, activeSub)}
            {renderMarkdownCards()}
            {section?.groups && (
              <div className="space-y-6">
                {section.groups.map((group, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-teal-100 shadow-sm overflow-hidden hover:shadow-md transition">
                    <div className="bg-teal-900 text-white px-6 py-4">
                      <h3 className="text-xs font-bold tracking-wide uppercase">{group.name}</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {group.endpoints.map((ep, j) => (
                        <div key={j} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                            <span className="bg-teal-50 text-teal-800 px-2.5 py-0.5 rounded-md text-[10px] font-bold border border-teal-100">{ep.method}</span>
                            <code className="text-xs text-gray-800 font-mono bg-gray-50 px-2 py-0.5 rounded-md border">{ep.path}</code>
                          </div>
                          <p className="text-xs text-gray-500 leading-normal">{ep.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'data-model':
        return (
          <div className="space-y-8 animate-fadeIn">
            {renderBanner(activeTitle, activeSub)}
            {renderMarkdownCards()}
            {section?.models && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.models.map((model, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-teal-100 shadow-sm p-6 space-y-4 border-t-4 border-teal-700 hover:shadow-md transition">
                    <h3 className="text-xs font-bold text-teal-800 uppercase tracking-widest">{model.name} Schema</h3>
                    <ul className="space-y-1.5">
                      {model.fields.map((field, j) => (
                        <li key={j} className="text-[10px] text-gray-600 font-mono bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100/50">
                          {field}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-8 animate-fadeIn">
            {renderBanner(activeTitle, activeSub)}
            {renderMarkdownCards()}
            {section?.metrics && (
              <div className="space-y-6">
                {stats ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {section.metrics.map((metric, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-teal-100 shadow-sm p-5 text-center space-y-2 hover:border-teal-300 hover:shadow-md transition duration-300">
                        <p className="text-3xl font-extrabold text-teal-700 tracking-tight">{stats[metric.key] ?? '0'}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider leading-tight">{metric.label}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-6 text-center text-gray-500 text-sm">
                    Live system statistics unavailable.
                  </div>
                )}
                {stats?.lastUpdated && (
                  <p className="text-[10px] font-medium text-gray-400 text-right">
                    Last updated: {new Date(stats.lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'team':
        return (
          <div className="space-y-8 animate-fadeIn">
            {renderBanner(activeTitle, activeSub)}
            {renderMarkdownCards()}
            {section?.members && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {section.members.map((member, i) => (
                  <div key={i} className="bg-white rounded-3xl border border-teal-100 shadow-sm overflow-hidden hover:shadow-md transition duration-300">
                    <div className="h-32 bg-gradient-to-r from-teal-800 to-emerald-800 flex items-center justify-center text-4xl text-white font-extrabold select-none">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="font-bold text-base text-gray-800">{member.name}</h3>
                        <p className="text-xs text-teal-600 font-bold mb-1">{member.role}</p>
                        <p className="text-xs text-gray-500 font-mono">{member.email}</p>
                      </div>
                      <p className="text-xs text-gray-700 bg-gray-50 p-4 rounded-xl leading-relaxed">{member.contribution}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigation - Sticky Desktop Layout */}
      <div className="lg:w-[280px] lg:fixed lg:top-0 lg:bottom-0 lg:left-0 bg-[#042f2e] text-white border-r border-teal-950 flex flex-col justify-between z-30">
        <div className="p-6 space-y-6 overflow-y-auto max-h-[85vh] scrollbar-none">
          {/* Logo & Platform Header */}
          <Link href="/" className="flex items-center gap-2.5 text-lg font-black text-teal-400 hover:text-teal-300 transition">
            <span className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-base shadow-inner border border-teal-500/30">M</span>
            <span>MatriSense Docs</span>
          </Link>
          
          {/* Section Selector */}
          <nav className="space-y-1">
            {sections.map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  setActiveSection(sec);
                  window.scrollTo(0, 0);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-xs font-bold transition-all active:scale-95 duration-155 ${
                  activeSection === sec
                    ? 'bg-teal-800 text-teal-200 shadow-md shadow-teal-950/40 border-l-4 border-teal-400'
                    : 'text-teal-100/70 hover:bg-teal-900/50 hover:text-white'
                }`}
              >
                <span className="text-sm select-none">{sectionIcons[sec] || '📄'}</span>
                <span>{sectionTitles[sec] || sec}</span>
              </button>
            ))}
          </nav>
        </div>
        
        {/* Sticky footer controls */}
        <div className="p-6 border-t border-teal-950/80 space-y-3 bg-[#032422]">
          <Link
            href="/admin/docs"
            className="flex w-full items-center justify-center bg-teal-800/40 hover:bg-teal-800 text-teal-300 hover:text-teal-200 text-xs font-bold py-2.5 rounded-xl border border-teal-800 transition shadow-inner"
          >
            ⚙️ Admin Panel
          </Link>
          <p className="text-[10px] text-teal-500 text-center font-medium">MatriSense © 2026</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow lg:pl-[280px] flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-[#042f2e] text-white px-6 py-4 flex items-center justify-between border-b border-teal-950 shadow-md">
          <Link href="/" className="flex items-center gap-2.5 text-base font-black text-teal-400">
            <span className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-sm border border-teal-500/30">M</span>
            <span>MatriSense Docs</span>
          </Link>
          <Link
            href="/admin/docs"
            className="text-xs bg-teal-900/50 px-3 py-1.5 rounded-xl font-bold border border-teal-800 text-teal-300"
          >
            Settings
          </Link>
        </div>

        {/* Mobile Horizontal Selector */}
        <div className="lg:hidden bg-teal-900/10 border-b border-teal-100/50 px-6 py-3 flex gap-2 overflow-x-auto scrollbar-none">
          {sections.map((sec) => (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`px-3.5 py-2 rounded-xl whitespace-nowrap text-[10px] font-black transition ${
                activeSection === sec
                  ? 'bg-teal-800 text-white shadow-sm'
                  : 'bg-white text-teal-900 border border-teal-100/50 hover:bg-teal-50/50'
              }`}
            >
              {sectionIcons[sec]} {sectionTitles[sec] || sec}
            </button>
          ))}
        </div>

        {/* Content detail overlay */}
        <div className="flex-grow max-w-5xl w-full mx-auto px-6 lg:px-10 py-8 lg:py-10">
          {renderSection()}
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-teal-50/60 py-6 px-6 lg:px-10 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <p>MatriSense System Knowledge Base • Dark Teal Edition</p>
          <div className="flex gap-4 normal-case tracking-normal">
            <Link href="/" className="hover:text-teal-700 transition">Home</Link>
            <Link href="/admin/docs" className="hover:text-teal-700 transition">Config</Link>
          </div>
        </footer>
      </div>

      {/* Zoom Modal Overlay */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-teal-950/90 backdrop-blur-md p-4 transition-all duration-300 animate-fadeIn cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          {/* Close button */}
          <button 
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center text-xl transition-all duration-200 border border-white/10 active:scale-95 shadow-lg"
            onClick={() => setZoomedImage(null)}
          >
            ✕
          </button>
          
          <div className="max-w-5xl max-h-[85vh] w-full flex items-center justify-center p-2" onClick={(e) => e.stopPropagation()}>
            <img 
              src={zoomedImage.src} 
              alt={zoomedImage.alt}
              className="max-w-full max-h-[80vh] rounded-3xl object-contain shadow-2xl border border-white/15 animate-scaleUp cursor-default"
            />
          </div>
          {zoomedImage.alt && (
            <p className="mt-4 text-xs font-black text-teal-300 uppercase tracking-widest bg-teal-900/50 px-4 py-2 rounded-full border border-teal-800/40">
              {zoomedImage.alt}
            </p>
          )}
        </div>
      )}

      {/* Embedded Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out forwards;
        }
        .animate-scaleUp {
          animation: scaleUp 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
