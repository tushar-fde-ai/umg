import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Send, TrendingUp, Sparkles, Copy, Check, ArrowUp, Music } from 'lucide-react';

const UMGHandbook = () => {
  const [quizPrompt, setQuizPrompt] = useState('');
  const [quizResult, setQuizResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedPrompts, setCopiedPrompts] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState('intro');

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);

      const sections = ['intro', 'section1', 'section2', 'section3', 'section4', 'section5', 'section6', 'section7', 'quickref', 'quiz'];
      const scrollPosition = window.scrollY + 200;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const analyzePrompt = (prompt) => {
    setIsAnalyzing(true);

    setTimeout(() => {
      let score = 50;
      let feedback = [];
      let positives = [];
      let warnings = [];
      let complexityFlags = {};

      const lowerPrompt = prompt.toLowerCase();
      const charCount = prompt.length;

      const CHAR_LIMIT_WARNING = 500;
      const CHAR_LIMIT_ERROR = 1500;

      const sectionMatches = prompt.match(/SECTION\s*\d+|SECTION\s*[A-Z]+\s*[–-]/gi) || [];
      const sectionCount = sectionMatches.length;

      const executionRulePatterns = /EXECUTION RULES|APPROVAL GATE|DO NOT BEGIN|STOP HERE|BEFORE PERFORMING|ASK FOR APPROVAL/gi;
      const executionRuleMatches = prompt.match(executionRulePatterns) || [];
      const hasExecutionRules = executionRuleMatches.length > 0;

      const definitionPatterns = /DEFINITION|DEFINE:|LOGIC|COHORT|LOYALTY SEGMENT|TIER|DATASET/gi;
      const definitionMatches = prompt.match(definitionPatterns) || [];
      const definitionCount = definitionMatches.length;

      const rulePatterns = /^\s*\d+\.\s+|^\s*[-•]\s+|\(\d+\)|criterion|criteria|condition|rule|filter|include only|exclude/gim;
      const ruleMatches = prompt.match(rulePatterns) || [];
      const ruleCount = ruleMatches.length;

      const objectivePatterns = /OBJECTIVE|ANALYSIS REQUIREMENTS|OUTPUT|ANALYSIS MODULE|REQUIREMENTS/gi;
      const objectiveMatches = prompt.match(objectivePatterns) || [];
      const objectiveCount = objectiveMatches.length;

      let complexityScore = 0;
      complexityScore += sectionCount * 15;
      complexityScore += hasExecutionRules ? 25 : 0;
      complexityScore += definitionCount * 8;
      complexityScore += Math.max(0, ruleCount - 3) * 5;
      complexityScore += Math.max(0, objectiveCount - 1) * 10;
      complexityScore += charCount > CHAR_LIMIT_ERROR ? 30 : (charCount > CHAR_LIMIT_WARNING ? 15 : 0);

      const isTooComplex = complexityScore >= 40 || sectionCount >= 2 || hasExecutionRules;

      let suggestedSubPrompts = 1;
      if (sectionCount >= 2) suggestedSubPrompts = Math.max(suggestedSubPrompts, sectionCount);
      if (definitionCount >= 3) suggestedSubPrompts = Math.max(suggestedSubPrompts, Math.ceil(definitionCount / 2));
      if (objectiveCount >= 2) suggestedSubPrompts = Math.max(suggestedSubPrompts, objectiveCount);
      if (ruleCount > 6) suggestedSubPrompts = Math.max(suggestedSubPrompts, Math.ceil(ruleCount / 3));

      complexityFlags = {
        charCount, charLimitWarning: CHAR_LIMIT_WARNING, charLimitError: CHAR_LIMIT_ERROR,
        sectionCount, ruleCount, definitionCount, objectiveCount,
        hasExecutionRules, isTooComplex, suggestedSubPrompts, complexityScore
      };

      if (isTooComplex) {
        score = 0;
        warnings.push({ type: 'error', title: 'Prompt Too Complex', message: 'This prompt contains too many sections, rules, or meta-instructions. The Audience Agent works best with focused, single-objective prompts.' });
      }

      if (charCount > CHAR_LIMIT_ERROR) {
        score -= 30;
        warnings.push({ type: 'error', title: `Character Limit Exceeded (${charCount.toLocaleString()} / ${CHAR_LIMIT_ERROR} max)`, message: 'Your prompt is far too long. Break it into smaller, focused requests.' });
      } else if (charCount > CHAR_LIMIT_WARNING) {
        score -= 15;
        warnings.push({ type: 'warning', title: `Prompt Length Warning (${charCount.toLocaleString()} / ${CHAR_LIMIT_WARNING} recommended)`, message: 'Consider simplifying your prompt for better results.' });
      }

      if (sectionCount >= 2) {
        score -= 25;
        warnings.push({ type: 'error', title: `Multiple Sections Detected (${sectionCount} sections)`, message: 'Prompts with multiple SECTION headers are too complex. Each section should be a separate prompt.' });
      }

      if (ruleCount > 6) {
        score -= 15;
        warnings.push({ type: 'warning', title: `Too Many Rules (${ruleCount} rules detected)`, message: 'Keep prompts to 3-5 rules maximum. Complex logic should be broken into multiple prompts.' });
      } else if (ruleCount > 3) {
        feedback.push(`Consider simplifying: ${ruleCount} rules detected (3-5 recommended)`);
      }

      if (hasExecutionRules) {
        score -= 25;
        warnings.push({ type: 'error', title: 'Meta-Instructions Detected', message: 'Avoid execution rules, approval gates, and meta-instructions. The Audience Agent works best with direct data requests.' });
      }

      if (definitionCount >= 3) {
        score -= 15;
        warnings.push({ type: 'warning', title: `Multiple Definitions (${definitionCount} found)`, message: 'Too many custom definitions. Define one concept per prompt, then reference it in follow-up prompts.' });
      }

      if (!isTooComplex) {
        if (lowerPrompt.includes('create') || lowerPrompt.includes('segment') || lowerPrompt.includes('analyze')) {
          score += 10;
          positives.push('Clear objective stated');
        }

        if (lowerPrompt.match(/\d+\s*(days?|weeks?|months?)/)) {
          score += 10;
          positives.push('Specific timeframe included');
        }

        if (lowerPrompt.match(/\$\d+|>\s*\d+|<\s*\d+|between\s+\d+/)) {
          score += 10;
          positives.push('Quantitative criteria specified');
        }

        // Music industry specific patterns
        if (lowerPrompt.match(/spotify|apple music|youtube music|tidal|soundcloud|bandcamp/)) {
          score += 10;
          positives.push('Music platform specificity mentioned');
        }

        if (lowerPrompt.match(/tour|concert|festival|venue|live show/)) {
          score += 10;
          positives.push('Live music engagement criteria included');
        }

        if (lowerPrompt.match(/album|song|track|release|single|ep/)) {
          score += 5;
          positives.push('Specific music content referenced');
        }

        if (lowerPrompt.match(/email|campaign|newsletter|communication/)) {
          score += 5;
          positives.push('Email engagement criteria specified');
        }

        if (lowerPrompt.match(/tiktok|instagram|twitter|facebook|social media/)) {
          score += 5;
          positives.push('Social media platform specified');
        }

        if ((lowerPrompt.match(/\band\b/gi) || []).length >= 1 && (lowerPrompt.match(/\band\b/gi) || []).length <= 4) {
          score += 10;
          positives.push('Multiple conditions defined');
        }

        if (lowerPrompt.match(/maybe|perhaps|might/)) {
          score -= 10;
          feedback.push('Remove uncertain language (maybe, perhaps)');
        }

        if (lowerPrompt.match(/\bgood\b|\bbetter\b|\bbest\b/)) {
          score -= 10;
          feedback.push('Avoid vague qualifiers - be specific');
        }

        if (!lowerPrompt.match(/create|analyze|show|find/)) {
          score -= 15;
          feedback.push('Start with a clear action verb');
        }

        if (prompt.length < 20) {
          score -= 15;
          feedback.push('Prompt is too short - add more detail');
        }
      }

      score = Math.max(0, Math.min(100, score));

      let rating = 'Poor';
      let color = 'red';

      if (isTooComplex) {
        rating = 'Too Complex - Break Down Required';
        color = 'red';
      } else if (score >= 80) {
        rating = 'Excellent';
        color = 'green';
      } else if (score >= 60) {
        rating = 'Good';
        color = 'blue';
      } else if (score >= 40) {
        rating = 'Fair';
        color = 'yellow';
      } else {
        rating = 'Needs Improvement';
        color = 'red';
      }

      setQuizResult({ score, rating, color, feedback, positives, warnings, complexityFlags });
      setIsAnalyzing(false);
    }, 1000);
  };

  const copyPrompt = (promptId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompts(prev => ({ ...prev, [promptId]: true }));
    setTimeout(() => {
      setCopiedPrompts(prev => ({ ...prev, [promptId]: false }));
    }, 2000);
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 100;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  };

  const PRIMARY = '#1F2937'; // Professional black/dark color
  const GRADIENT = 'linear-gradient(to right, #1F2937, #374151)';
  const GRADIENT_DIAGONAL = 'linear-gradient(to bottom right, #1F2937, #111827)';

  const tocItems = [
    { id: 'intro', label: 'Introduction' },
    { id: 'section1', label: '1. Email Campaigns' },
    { id: 'section2', label: '2. Web Engagement' },
    { id: 'section3', label: '3. Social Media Activity' },
    { id: 'section4', label: '4. Artist Interest Signals' },
    { id: 'section5', label: '5. Platform Preferences' },
    { id: 'section6', label: '6. Acquisition Channels' },
    { id: 'section7', label: '7. Test Case Examples' },
    { id: 'quickref', label: 'Quick Reference' },
    { id: 'quiz', label: 'Test Your Skills' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Top Header Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/td-logo.png" alt="Treasure Data" className="h-12" />
            <div className="h-8 w-px bg-slate-300"></div>
            <h1 className="text-xl font-semibold text-slate-900">
              Universal Music Group - Audience Agent Prompting Guide
            </h1>
          </div>
        </div>
      </div>

      {/* Subtitle Header */}
      <header className="text-white" style={{ background: GRADIENT }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-semibold mb-2">
            Music Industry Fan Segmentation & Analysis Best Practices
          </h2>
          <p className="text-slate-100">Universal Music Group - Treasure Data Audience Agent</p>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Table of Contents Sidebar */}
        <aside className="hidden lg:block w-64 flex-shrink-0">
          <div className="sticky top-24 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">
              Table of Contents
            </h3>
            <nav className="space-y-2">
              {tocItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                    activeSection === item.id
                      ? 'text-white font-medium shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  style={activeSection === item.id ? { backgroundColor: PRIMARY } : {}}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-8">

        {/* Introduction */}
        <section id="intro" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <div className="flex items-center gap-3 mb-4">
            <Music size={28} style={{ color: PRIMARY }} />
            <h2 className="text-2xl font-semibold text-slate-900">Introduction</h2>
          </div>
          <p className="text-slate-700 leading-relaxed mb-4">
            The Audience Agent is a powerful tool for analyzing fan segments and creating targeted audiences for Universal Music Group artists. This guide provides music industry-specific best practices for crafting effective prompts.
          </p>
          <p className="text-slate-700 leading-relaxed">
            This handbook includes real test cases and examples specifically tailored for UMG's fan engagement, artist promotion, and audience analysis needs.
          </p>
        </section>

        {/* Section 1: Email Campaigns */}
        <section id="section1" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            1. Email Campaign Engagement Analysis
          </h2>
          <p className="text-slate-700 mb-4">When analyzing email engagement for artist campaigns, be specific about timeframes and anchor dates.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-2 flex items-center gap-2">
              <AlertCircle size={20} style={{ color: PRIMARY }} />
              Key Principle - Date Anchoring:
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-slate-700 mb-2">Always specify whether timeframes are based on:</p>
              <ul className="space-y-1 ml-4">
                <li className="text-slate-700">• Email send date (recommended)</li>
                <li className="text-slate-700">• Email open date</li>
                <li className="text-slate-700">• Current date</li>
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Good Prompt Example (TC-008)</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono pr-8">
                  "Create a segment of fans that have opened at least 5 email campaigns from The Weeknd within the last 6 months of email send date"
                </p>
                <button
                  onClick={() => copyPrompt('email-good', 'Create a segment of fans that have opened at least 5 email campaigns from The Weeknd within the last 6 months of email send date')}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['email-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Clear timeframe anchor, specific artist, quantified engagement threshold.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Original Problem Prompt</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Create a segment of fans that have opened at least 5 email campaigns from The Weeknd within the last 6 months"
                </p>
              </div>
              <p className="text-sm text-red-800">Ambiguous timeframe - AI will assume open date anchor, leading to incorrect results.</p>
            </div>
          </div>
        </section>

        {/* Section 2: Web Engagement */}
        <section id="section2" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift transition-all">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            2. Web Property Engagement
          </h2>
          <p className="text-slate-700 mb-4">When analyzing web engagement, clarify whether you want ALL interactions or ANY interactions - this fundamentally changes the SQL logic.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Understanding ALL vs ANY:</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">ANY = OR Logic</h4>
                <p className="text-sm text-blue-800">Finds users who engaged with at least one property</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 mb-2">ALL = AND Logic</h4>
                <p className="text-sm text-purple-800">Finds users who engaged with every listed property</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Good Prompt Example (TC-010)</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono pr-8">
                  "Create a segment of fans that have engaged with ALL web properties related to Sabrina Carpenter"
                </p>
                <button
                  onClick={() => copyPrompt('web-good', 'Create a segment of fans that have engaged with ALL web properties related to Sabrina Carpenter')}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['web-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Clear ALL condition means AI considers all web properties, not just one.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Original Problem Prompt</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Create a segment of fans that have engaged with any web properties related to Sabrina Carpenter"
                </p>
              </div>
              <p className="text-sm text-red-800">The word 'any' implies OR logic in SQL - finds users with at least 1 interaction instead of comprehensive engagement.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Social Media Activity */}
        <section id="section3" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            3. Social Media Platform Activity
          </h2>
          <p className="text-slate-700 mb-4">When analyzing social media activity, provide specific criteria and data sources to avoid assumptions.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Best Practices for Social Analysis:</h3>
            <ul className="space-y-2 bg-slate-50 rounded-lg p-4">
              {[
                "Specify timeframe for activity analysis",
                "Include UTM and URL parameter analysis",
                "Mention specific social platforms by name",
                "Request exploration of available data fields"
              ].map((tip, idx) => (
                <li key={idx} className="text-slate-700 flex gap-2">
                  <span className="text-slate-900">&#8226;</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Good Prompt Example (TC-011)</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono pr-8">
                  "Create a segment of fans that are active on TikTok in the last 6 months, please consider all web data including utm in url"
                </p>
                <button
                  onClick={() => copyPrompt('social-good', 'Create a segment of fans that are active on TikTok in the last 6 months, please consider all web data including utm in url')}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['social-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Specific platform, timeframe, and directs AI to explore multiple data sources.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Original Problem Prompt</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Create a segment of fans that are active on TikTok"
                </p>
              </div>
              <p className="text-sm text-red-800">Too vague - leaves AI to make assumptions about timeframe and data sources.</p>
            </div>
          </div>
        </section>

        {/* Section 4: Artist Interest Signals */}
        <section id="section4" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            4. Detecting Artist Interest Signals
          </h2>
          <p className="text-slate-700 mb-4">When analyzing fan interest in artist activities (like tours), provide guidance for data exploration rather than rigid definitions.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Interest Signal Strategy:</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-amber-800 mb-2">
                <strong>Use a two-step approach:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-amber-800">
                <li>Ask AI to explore available data fields first</li>
                <li>Let AI propose different "interest" signal options</li>
                <li>Choose the most relevant signals for your specific use case</li>
              </ol>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Good Prompt Example (TC-012)</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono pr-8">
                  "Create a segment of fans that have shown interest in Noah Kahan's tour, consider the tour web page and also look at other web fields if possible."
                </p>
                <button
                  onClick={() => copyPrompt('interest-good', "Create a segment of fans that have shown interest in Noah Kahan's tour, consider the tour web page and also look at other web fields if possible.")}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['interest-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Gives specific direction while keeping context open for AI to explore different interest signals.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Original Problem Prompt</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Create a segment of fans that have shown interest in Noah Kahan's tour"
                </p>
              </div>
              <p className="text-sm text-red-800">Too vague - forces AI to make assumptions about what constitutes "interest" signals.</p>
            </div>
          </div>
        </section>

        {/* Section 5: Platform Preferences */}
        <section id="section5" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            5. Music Platform Preferences
          </h2>
          <p className="text-slate-700 mb-4">When analyzing streaming platform preferences, explicitly request comprehensive data exploration.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Platform Analysis Strategy:</h3>
            <ul className="space-y-2 bg-slate-50 rounded-lg p-4">
              {[
                "Explicitly request exploration of all web data sources",
                "Include UTM parameters and referral data",
                "Consider both direct platform interactions and indirect signals",
                "Allow AI to propose multiple preference indicators"
              ].map((strategy, idx) => (
                <li key={idx} className="text-slate-700 flex gap-2">
                  <span className="text-slate-900">&#8226;</span>
                  <span>{strategy}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Good Prompt Example (TC-015)</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono pr-8">
                  "Create a segment of fans that have a preference for Spotify, reference all web data"
                </p>
                <button
                  onClick={() => copyPrompt('platform-good', 'Create a segment of fans that have a preference for Spotify, reference all web data')}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['platform-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Directs AI to explore comprehensive data sources for rich analysis options.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Original Problem Prompt</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Create a segment of fans that have a preference for Spotify"
                </p>
              </div>
              <p className="text-sm text-red-800">Vague "preference" definition - leaves too many assumptions for AI to make.</p>
            </div>
          </div>
        </section>

        {/* Section 6: Acquisition Channels */}
        <section id="section6" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            6. Fan Acquisition Channel Analysis
          </h2>
          <p className="text-slate-700 mb-4">When analyzing how fans were acquired, specify both subscriber data and behavioral data sources.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Acquisition Analysis Components:</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">Subscription Data</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Email signup date/source</li>
                  <li>• Newsletter subscription events</li>
                  <li>• Marketing campaign attribution</li>
                </ul>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-2">Behavioral Data</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• First interaction touchpoints</li>
                  <li>• Social media referrals</li>
                  <li>• Content engagement patterns</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Good Prompt Example (TC-017)</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono pr-8">
                  "Create a segment of Morgan Wallen email subscribers that were acquired in 2026, consider behaviors as well"
                </p>
                <button
                  onClick={() => copyPrompt('acquisition-good', 'Create a segment of Morgan Wallen email subscribers that were acquired in 2026, consider behaviors as well')}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['acquisition-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Explicitly requests both subscription and behavioral data analysis.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Original Problem Prompt</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Create a segment of Morgan Wallen email subscribers that were acquired in 2026"
                </p>
              </div>
              <p className="text-sm text-red-800">Missing behavioral context - AI must assume acquisition channels and data sources.</p>
            </div>
          </div>
        </section>

        {/* Section 7: Test Case Examples */}
        <section id="section7" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            7. Complete Test Case Analysis
          </h2>
          <p className="text-slate-700 mb-6">Review of all UMG test cases showing the progression from problematic to successful prompts.</p>

          <div className="space-y-6">
            {[
              {
                id: 'TC-008',
                title: 'Email Campaign Engagement',
                problem: 'AI assumes open date as anchor since that is in the prompt',
                original: 'Create a segment of fans that have opened at least 5 email campaigns from The Weeknd within the last 6 months',
                revised: 'Create a segment of fans that have opened at least 5 email campaigns from The Weeknd within the last 6 months of email send date',
                advantage: 'AI does not assume open rate as anchor'
              },
              {
                id: 'TC-010',
                title: 'Web Properties Engagement',
                problem: 'The "any" condition implies an OR in SQL logic, "ALL" uses AND logic',
                original: 'Create a segment of fans that have engaged with any web properties related to Sabrina Carpenter',
                revised: 'Create a segment of fans that have engaged with ALL web properties related to Sabrina Carpenter',
                advantage: 'ALL means AI considers all web properties and not at least 1'
              },
              {
                id: 'TC-011',
                title: 'Social Media Activity',
                problem: 'Many assumptions left for AI to make. Coinflip chance it looks at utm',
                original: 'Create a segment of fans that are active on TikTok',
                revised: 'Create a segment of fans that are active on TikTok in the last 6 months, please consider all web data including utm in url',
                advantage: 'AI has less assumptions to make and provides richer analysis pathways'
              },
              {
                id: 'TC-012',
                title: 'Artist Interest Analysis',
                problem: '"Interest" is vague, AI needs to make assumptions on what interest means',
                original: 'Create a segment of fans that have shown interest in Noah Kahan\'s tour',
                revised: 'Create a segment of fans that have shown interest in Noah Kahan\'s tour, consider the tour web page and also look at other web fields if possible',
                advantage: 'AI gets pointed direction while keeping context open for different interpretations of "interest"'
              },
              {
                id: 'TC-015',
                title: 'Platform Preferences',
                problem: '"Preference" is vague, leaves AI to make many assumptions',
                original: 'Create a segment of fans that have a preference for Spotify',
                revised: 'Create a segment of fans that have a preference for Spotify, reference all web data',
                advantage: 'AI explores first and gives rich analysis plan with different options to choose from'
              },
              {
                id: 'TC-017',
                title: 'Acquisition Channels',
                problem: 'Acquisition channels need to be assumed by the AI',
                original: 'Create a segment of Morgan Wallen email subscribers that were acquired in 2026',
                revised: 'Create a segment of Morgan Wallen email subscribers that were acquired in 2026, consider behaviors as well',
                advantage: 'AI clearly looks at behavior data alongside subscription data'
              }
            ].map((testCase, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">{testCase.id}: {testCase.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{testCase.problem}</p>
                </div>
                <div className="p-4 space-y-4">
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <h4 className="text-sm font-medium text-red-900 mb-2">Original Prompt:</h4>
                    <p className="text-sm text-red-800 font-mono">{testCase.original}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <h4 className="text-sm font-medium text-green-900 mb-2">Revised Prompt:</h4>
                    <p className="text-sm text-green-800 font-mono">{testCase.revised}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Advantage:</h4>
                    <p className="text-sm text-blue-800">{testCase.advantage}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Reference */}
        <section id="quickref" className="rounded-xl shadow-lg p-8 text-white hover-lift animate-fadeIn" style={{ background: GRADIENT_DIAGONAL }}>
          <h2 className="text-2xl font-semibold mb-4">
            Quick Reference: UMG Music Industry Prompting
          </h2>
          <div className="space-y-3">
            {[
              "Specify date anchoring (send date vs open date vs current date)",
              "Use 'ALL' for comprehensive engagement, 'ANY' for at least one interaction",
              "Include timeframes and request exploration of all available data",
              "Guide AI toward data exploration rather than assuming definitions",
              "Reference both subscription data and behavioral data for acquisition",
              "Consider UTM parameters and web tracking for social media analysis"
            ].map((item, idx) => (
              <div key={idx} className="flex gap-3 items-start animate-slideIn" style={{ animationDelay: `${idx * 0.1}s` }}>
                <span className="flex-shrink-0 w-7 h-7 text-sm font-bold rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white" style={{ color: PRIMARY }}>
                  {idx + 1}
                </span>
                <p className="text-slate-50 pt-1">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Quiz Section */}
        <section id="quiz" className="rounded-xl shadow-lg p-8 text-white hover-lift animate-fadeIn" style={{ background: GRADIENT_DIAGONAL }}>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp size={28} className="animate-bounce-subtle" />
            <h2 className="text-2xl font-semibold">Test Your UMG Prompt Skills</h2>
          </div>
          <p className="text-slate-100 mb-6">
            Enter a music industry prompt below and get instant feedback on its quality
          </p>

          <div className="bg-white rounded-lg p-6 shadow-xl">
            <textarea
              value={quizPrompt}
              onChange={(e) => setQuizPrompt(e.target.value)}
              placeholder="Example: Create a segment of Drake fans who opened at least 3 email campaigns in the last 90 days of send date..."
              className="w-full h-32 p-4 border-2 border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 resize-none transition-all"
              style={{ '--tw-ring-color': PRIMARY }}
              onFocus={(e) => { e.target.style.borderColor = PRIMARY; }}
              onBlur={(e) => { e.target.style.borderColor = ''; }}
            />

            <button
              onClick={() => analyzePrompt(quizPrompt)}
              disabled={!quizPrompt.trim() || isAnalyzing}
              className="mt-4 w-full flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg hover:shadow-lg disabled:bg-slate-300 disabled:cursor-not-allowed transition-all font-medium transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: !quizPrompt.trim() || isAnalyzing ? undefined : PRIMARY }}
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Analyze Prompt
                </>
              )}
            </button>

            {quizResult && (
              <div className="mt-6 space-y-4 animate-fadeIn">
                {quizResult.warnings && quizResult.warnings.filter(w => w.type === 'error').length > 0 && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-5">
                    <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                      <XCircle size={20} />
                      Critical Issues Detected
                    </h4>
                    <ul className="space-y-3">
                      {quizResult.warnings.filter(w => w.type === 'error').map((warning, idx) => (
                        <li key={idx} className="text-red-800">
                          <span className="font-semibold block">{warning.title}</span>
                          <span className="text-sm">{warning.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {quizResult.warnings && quizResult.warnings.filter(w => w.type === 'warning').length > 0 && (
                  <div className="bg-orange-50 border border-orange-300 rounded-lg p-5">
                    <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                      <AlertCircle size={20} />
                      Warnings
                    </h4>
                    <ul className="space-y-3">
                      {quizResult.warnings.filter(w => w.type === 'warning').map((warning, idx) => (
                        <li key={idx} className="text-orange-800">
                          <span className="font-semibold block">{warning.title}</span>
                          <span className="text-sm">{warning.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="bg-slate-50 rounded-lg p-6 border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-700 font-medium">Prompt Quality Score</span>
                    <span className={`text-3xl font-bold ${
                      quizResult.color === 'green' ? 'text-green-600' :
                      quizResult.color === 'blue' ? 'text-blue-600' :
                      quizResult.color === 'yellow' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {quizResult.score}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 mb-2">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        quizResult.color === 'green' ? 'bg-green-600' :
                        quizResult.color === 'blue' ? 'bg-blue-600' :
                        quizResult.color === 'yellow' ? 'bg-yellow-600' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${quizResult.score}%` }}
                    ></div>
                  </div>
                  <p className={`text-center font-semibold ${
                    quizResult.color === 'green' ? 'text-green-700' :
                    quizResult.color === 'blue' ? 'text-blue-700' :
                    quizResult.color === 'yellow' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    {quizResult.rating}
                  </p>
                </div>

                {!quizResult.complexityFlags?.isTooComplex && quizResult.positives.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <CheckCircle size={20} />
                      Strengths
                    </h4>
                    <ul className="space-y-2">
                      {quizResult.positives.map((positive, idx) => (
                        <li key={idx} className="text-green-800 flex gap-2">
                          <span>&#10003;</span>
                          <span>{positive}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {quizResult.feedback.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
                    <h4 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                      <AlertCircle size={20} />
                      Areas for Improvement
                    </h4>
                    <ul className="space-y-2">
                      {quizResult.feedback.map((item, idx) => (
                        <li key={idx} className="text-amber-800 flex gap-2">
                          <span>&#8226;</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-center text-slate-600 text-sm pt-2">
                  Try another music industry prompt to practice!
                </p>
              </div>
            )}
          </div>
        </section>

        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center gap-3">
            <p className="text-center text-slate-600 text-sm">
              Universal Music Group - Treasure Data Audience Agent Integration
            </p>
            <img src="/td-logo.png" alt="Treasure Data" className="h-8" />
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 p-3 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-110 active:scale-95 animate-fadeIn z-50"
          style={{ backgroundColor: PRIMARY }}
          aria-label="Scroll to top"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  );
};

export default UMGHandbook;