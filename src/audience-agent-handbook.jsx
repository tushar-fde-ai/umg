import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Send, TrendingUp, Sparkles, Copy, Check, ArrowUp } from 'lucide-react';

const AudienceAgentHandbook = () => {
  const [quizPrompt, setQuizPrompt] = useState('');
  const [quizResult, setQuizResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedPrompts, setCopiedPrompts] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [activeSection, setActiveSection] = useState('intro');

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);

      const sections = ['intro', 'section1', 'section2', 'section3', 'section4', 'section5', 'section6', 'quickref', 'quiz'];
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

        if ((lowerPrompt.match(/\band\b/gi) || []).length >= 1 && (lowerPrompt.match(/\band\b/gi) || []).length <= 4) {
          score += 10;
          positives.push('Multiple conditions defined');
        }

        if (lowerPrompt.match(/product|purchase|order|subscription|transaction|campaign/)) {
          score += 5;
          positives.push('Specific business concepts mentioned');
        }

        if (lowerPrompt.includes('email') || lowerPrompt.includes('gmail') || lowerPrompt.includes('city') || lowerPrompt.includes('country') || lowerPrompt.includes('region')) {
          score += 5;
          positives.push('Relevant data fields identified');
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

  const PRIMARY = '#0F766E';
  const GRADIENT = 'linear-gradient(to right, #0F766E, #115E59)';
  const GRADIENT_DIAGONAL = 'linear-gradient(to bottom right, #0F766E, #134E4A)';

  const tocItems = [
    { id: 'intro', label: 'Introduction' },
    { id: 'section1', label: '1. Start Small' },
    { id: 'section2', label: '2. Add Rules' },
    { id: 'section3', label: '3. Complex Rules' },
    { id: 'section4', label: '4. Text Matching' },
    { id: 'section5', label: '5. Insights' },
    { id: 'section6', label: '6. Prompt Limits' },
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
              Audience Agent Prompting Guide
            </h1>
          </div>
        </div>
      </div>

      {/* Subtitle Header */}
      <header className="text-white" style={{ background: GRADIENT }}>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <h2 className="text-2xl font-semibold mb-2">
            Best Practices for Segment Creation & Analysis
          </h2>
          <p className="text-teal-100">Treasure Data Audience Agent</p>
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
            <Sparkles size={28} style={{ color: PRIMARY }} />
            <h2 className="text-2xl font-semibold text-slate-900">Introduction</h2>
          </div>
          <p className="text-slate-700 leading-relaxed">
            The Audience Agent is a powerful tool for analyzing user data segments and creating new targeted segments. This guide will help you craft effective prompts to maximize its capabilities.
          </p>
        </section>

        {/* Section 1: Start Small */}
        <section id="section1" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            1. Start with Simple Segment Rules
          </h2>
          <p className="text-slate-700 mb-4">Begin with basic, single-condition segments before adding complexity.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-2 flex items-center gap-2">
              <AlertCircle size={20} style={{ color: PRIMARY }} />
              Why this matters:
            </h3>
            <ul className="space-y-2 ml-7">
              <li className="text-slate-700">Easier to validate results and understand segment behavior</li>
              <li className="text-slate-700">Faster processing and clearer insights</li>
              <li className="text-slate-700">Provides a solid foundation for iterative refinement</li>
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Good Prompt Example</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono pr-8">
                  "Create a segment of users who made a purchase in the last 30 days."
                </p>
                <button
                  onClick={() => copyPrompt('start-good', 'Create a segment of users who made a purchase in the last 30 days.')}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['start-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Clear, specific timeframe, single action, one condition.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Avoid This Approach</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Show me everyone who might be interested in our products or bought something recently or visited the website."
                </p>
              </div>
              <p className="text-sm text-red-800">Too vague, multiple unclear conditions, no specific criteria.</p>
            </div>
          </div>
        </section>

        {/* Section 2: Add Rules */}
        <section id="section2" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            2. Incrementally Add More Rules
          </h2>
          <p className="text-slate-700 mb-4">Once your basic segment works, layer on additional conditions strategically.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Recommended Approach:</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              {[
                "Start with your core defining criteria",
                "Test and verify the initial segment",
                "Add one additional rule at a time",
                "Validate after each addition to track impact"
              ].map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 text-white rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: PRIMARY }}>
                    {idx + 1}
                  </span>
                  <p className="text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Good Progressive Prompt</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono whitespace-pre-line pr-8">
                  "Refine the recent purchasers segment to include only users who: (1) made a purchase in the last 30 days, AND (2) have spent more than $500 total, AND (3) are located in New York."
                </p>
                <button
                  onClick={() => copyPrompt('add-good', 'Refine the recent purchasers segment to include only users who: (1) made a purchase in the last 30 days, AND (2) have spent more than $500 total, AND (3) are located in New York.')}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['add-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Clear progression, numbered conditions, logical AND relationship.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Avoid This Approach</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Add more filters to find better customers who buy more and are valuable."
                </p>
              </div>
              <p className="text-sm text-red-800">No specific criteria, vague qualifiers, unclear what 'better' means.</p>
            </div>
          </div>
        </section>

        {/* Section 3: Complex Rules */}
        <section id="section3" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            3. Handling Multiple Conditions (AND/OR Logic)
          </h2>
          <p className="text-slate-700 mb-4">When your segment requires complex logic, structure your prompt clearly.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Best Practices:</h3>
            <ul className="space-y-2 bg-slate-50 rounded-lg p-4">
              {[
                "Explicitly state AND/OR relationships",
                "Use numbered lists for multiple conditions",
                "Group related conditions with parentheses",
                "Be specific about precedence when mixing AND/OR"
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
                <h4 className="font-semibold text-green-900">Good Complex Prompt</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono whitespace-pre-line pr-8">{"Create a segment where users meet ALL of these criteria:\n1. Purchased (Product A OR Product B OR Product C) in last 60 days\n2. Total lifetime spend > $1000\n3. Located in (New York OR Los Angeles OR Chicago)\n4. Age between 25-45 years"}</p>
                <button
                  onClick={() => copyPrompt('complex-good', "Create a segment where users meet ALL of these criteria:\n1. Purchased (Product A OR Product B OR Product C) in last 60 days\n2. Total lifetime spend > $1000\n3. Located in (New York OR Los Angeles OR Chicago)\n4. Age between 25-45 years")}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['complex-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Clear structure, explicit AND/OR operators, organized conditions, specific values.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Avoid This Approach</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Get users who bought something or maybe browsed and spent money and live in major cities or are the right age."
                </p>
              </div>
              <p className="text-sm text-red-800">Ambiguous logic, unclear AND/OR relationships, vague quantities.</p>
            </div>
          </div>
        </section>

        {/* Section 4: String Matching */}
        <section id="section4" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            4. Using Text Matching for Filters
          </h2>
          <p className="text-slate-700 mb-4">When filtering by text fields like email, location, or product names, be clear about what you're looking for.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Guidelines:</h3>
            <ul className="space-y-2 bg-slate-50 rounded-lg p-4">
              {[
                "Specify when you want exact matches vs. partial matches",
                "For email filtering, mention the domain or provider you want",
                "For locations, specify if you want cities, states, or regions",
                "When referencing product names, be as specific as possible"
              ].map((rule, idx) => (
                <li key={idx} className="text-slate-700 flex gap-2">
                  <span className="text-slate-900">&#8226;</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Good Text Matching Prompt</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono whitespace-pre-line pr-8">
                  "Create a segment of users with Gmail or corporate email addresses who purchased the Premium Bundle and live in or around Chicago."
                </p>
                <button
                  onClick={() => copyPrompt('text-good', 'Create a segment of users with Gmail or corporate email addresses who purchased the Premium Bundle and live in or around Chicago.')}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['text-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Clear intent about email domains, specific product, flexible location matching ('in or around').</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Avoid This Approach</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Find people with emails and who bought products in some big cities."
                </p>
              </div>
              <p className="text-sm text-red-800">No specific email criteria, vague product reference, undefined cities.</p>
            </div>
          </div>
        </section>

        {/* Section 5: Insights */}
        <section id="section5" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <h2 className="text-2xl font-semibold text-slate-900 mb-3">
            5. Requesting Segment Insights
          </h2>
          <p className="text-slate-700 mb-4">When analyzing existing segments, be specific about what insights you need.</p>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-800 mb-3">Effective Insight Requests:</h3>
            <ul className="space-y-2 bg-slate-50 rounded-lg p-4">
              {[
                "Specify the metrics you want to analyze",
                "Define comparison groups if needed",
                "Set clear timeframes for analysis",
                "Ask for actionable recommendations"
              ].map((point, idx) => (
                <li key={idx} className="text-slate-700 flex gap-2">
                  <span className="text-slate-900">&#8226;</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Good Insight Prompt</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-green-200 relative group">
                <p className="text-sm text-slate-800 font-mono whitespace-pre-line pr-8">{"Analyze the 'High-Value Buyers' segment and provide:\n1. Average purchase frequency in the last 90 days\n2. Most popular products within this segment\n3. Geographic distribution across all regions\n4. Comparison with overall customer base\n5. Recommendations for targeted campaigns"}</p>
                <button
                  onClick={() => copyPrompt('insight-good', "Analyze the 'High-Value Buyers' segment and provide:\n1. Average purchase frequency in the last 90 days\n2. Most popular products within this segment\n3. Geographic distribution across all regions\n4. Comparison with overall customer base\n5. Recommendations for targeted campaigns")}
                  className="absolute top-2 right-2 p-1.5 rounded hover:bg-green-100 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy prompt"
                >
                  {copiedPrompts['insight-good'] ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-slate-600" />}
                </button>
              </div>
              <p className="text-sm text-green-800">Specific metrics requested, clear timeframe, structured format, asks for actionable insights.</p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-5 hover-lift transition-all">
              <div className="flex items-center gap-2 mb-3">
                <XCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Avoid This Approach</h4>
              </div>
              <div className="bg-white rounded p-3 mb-3 border border-red-200">
                <p className="text-sm text-slate-800 font-mono">
                  "Tell me about this segment and what we should know."
                </p>
              </div>
              <p className="text-sm text-red-800">No specific metrics, no timeframe, too vague, unclear what information is needed.</p>
            </div>
          </div>
        </section>

        {/* Section 6: Prompt Limits */}
        <section id="section6" className="bg-white rounded-xl shadow-sm p-8 border border-slate-200 hover-lift animate-fadeIn">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="text-orange-600" size={28} />
            <h2 className="text-2xl font-semibold text-slate-900">
              6. Prompt Limits & Complexity Guidelines
            </h2>
          </div>
          <p className="text-slate-700 mb-6">The Audience Agent works best with focused, single-objective prompts. Avoid overly complex prompts that try to accomplish too much at once.</p>

          {/* Recommended Limits */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Recommended Limits</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Character Limit", value: "500", max: "1,500", description: "Keep prompts concise. Aim for under 500 characters, never exceed 1,500." },
                { label: "Segment Rules", value: "3-5", max: "6", description: "Limit conditions per prompt. More rules = break into multiple prompts." },
                { label: "Sections", value: "0", max: "1", description: "Avoid multi-section prompts. Each section should be a separate request." },
                { label: "Definitions", value: "1-2", max: "2", description: "Define one concept at a time, then reference in follow-up prompts." }
              ].map((limit, idx) => (
                <div key={idx} className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                  <div className="text-sm font-semibold text-slate-600 mb-1">{limit.label}</div>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold" style={{ color: PRIMARY }}>{limit.value}</span>
                    <span className="text-sm text-slate-500">(max {limit.max})</span>
                  </div>
                  <p className="text-xs text-slate-600">{limit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What to Avoid */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center gap-2">
              <XCircle size={20} className="text-red-600" />
              What to Avoid
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { title: "Meta-Instructions", description: "Phrases like 'EXECUTION RULES', 'APPROVAL GATE', 'DO NOT BEGIN', 'STOP HERE' confuse the agent." },
                { title: "Multiple Objectives", description: "Don't combine analysis, segment creation, and reporting in one prompt." },
                { title: "Complex Logical Chains", description: "Deeply nested AND/OR logic with many conditions should be simplified." },
                { title: "Custom Data Definitions", description: "Avoid redefining loyalty tiers, cohort definitions, or business logic inline." }
              ].map((item, idx) => (
                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 mb-1">{item.title}</h4>
                  <p className="text-sm text-red-800">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* When to Break Down */}
          <div className="mb-8">
            <h3 className="text-lg font-medium text-slate-800 mb-3">When to Break Down Prompts</h3>
            <p className="text-slate-600 mb-3">If your prompt has any of these, consider splitting it:</p>
            <ul className="space-y-2 bg-orange-50 border border-orange-200 rounded-lg p-4">
              {[
                "Multiple SECTION headers (SECTION 1, SECTION 2, etc.)",
                "More than 5 numbered rules or conditions",
                "Custom definitions for loyalty tiers or cohorts",
                "Multiple analysis objectives or output requirements",
                "Instructions about how to process the prompt itself"
              ].map((item, idx) => (
                <li key={idx} className="text-orange-800 flex gap-2">
                  <span className="text-orange-600 font-bold">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Example: Breaking Down */}
          <div>
            <h3 className="text-lg font-medium text-slate-800 mb-4">Example: Breaking Down a Complex Request</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={18} className="text-red-600" />
                <span className="font-semibold text-red-900">Too Complex:</span>
              </div>
              <p className="text-sm text-red-800 font-mono">
                "SECTION 1: Define loyalty segments based on purchase history. SECTION 2: Apply product category logic. SECTION 3: Analyze churn risk by segment."
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-green-600" />
                <span className="font-semibold text-green-900">Better - Broken into steps:</span>
              </div>
              <div className="space-y-3">
                {[
                  'Prompt 1: "Create loyalty segments based on purchase frequency in the last 12 months: VIP (50+ purchases), Regular (15-49), Occasional (5-14), Dormant (fewer than 5)."',
                  'Prompt 2: "For the loyalty segments created, identify users who primarily purchase from Category A or Category B."',
                  'Prompt 3: "Analyze churn risk for each loyalty segment, comparing users with decreasing purchase frequency over the last 3 months."'
                ].map((prompt, idx) => (
                  <div key={idx} className="bg-white rounded p-3 border border-green-200">
                    <p className="text-sm text-green-800 font-mono">{prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Reference */}
        <section id="quickref" className="rounded-xl shadow-lg p-8 text-white hover-lift animate-fadeIn" style={{ background: GRADIENT_DIAGONAL }}>
          <h2 className="text-2xl font-semibold mb-4">
            Quick Reference: Prompt Structure Template
          </h2>
          <div className="space-y-3">
            {[
              "State your objective clearly (create segment / analyze segment)",
              "Define core criteria with explicit operators (AND/OR/CONTAINS/EQUALS)",
              "Use numbered lists for multiple conditions",
              "Specify quantitative thresholds precisely",
              "Include timeframes where relevant",
              "For insights: list specific metrics needed"
            ].map((item, idx) => (
              <div key={idx} className="flex gap-3 items-start animate-slideIn" style={{ animationDelay: `${idx * 0.1}s` }}>
                <span className="flex-shrink-0 w-7 h-7 text-sm font-bold rounded-full flex items-center justify-center hover:scale-110 transition-transform bg-white" style={{ color: PRIMARY }}>
                  {idx + 1}
                </span>
                <p className="text-teal-50 pt-1">{item}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Quiz Section */}
        <section id="quiz" className="rounded-xl shadow-lg p-8 text-white hover-lift animate-fadeIn" style={{ background: GRADIENT_DIAGONAL }}>
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp size={28} className="animate-bounce-subtle" />
            <h2 className="text-2xl font-semibold">Test Your Prompt Skills</h2>
          </div>
          <p className="text-teal-100 mb-6">
            Enter a prompt below and get instant feedback on its quality
          </p>

          <div className="bg-white rounded-lg p-6 shadow-xl">
            <textarea
              value={quizPrompt}
              onChange={(e) => setQuizPrompt(e.target.value)}
              placeholder="Example: Create a segment of users who purchased in the last 30 days and have spent more than $500..."
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

                {quizResult.complexityFlags && (
                  <div className="bg-slate-100 border border-slate-300 rounded-lg p-5">
                    <h4 className="font-semibold text-slate-900 mb-3">Prompt Analysis</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className={`p-3 rounded-lg ${
                        quizResult.complexityFlags.charCount > quizResult.complexityFlags.charLimitError ? 'bg-red-100 text-red-800' :
                        quizResult.complexityFlags.charCount > quizResult.complexityFlags.charLimitWarning ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        <div className="font-semibold">Characters</div>
                        <div className="text-lg font-bold">{quizResult.complexityFlags.charCount.toLocaleString()}</div>
                        <div className="text-xs opacity-75">max {quizResult.complexityFlags.charLimitError}</div>
                      </div>
                      <div className={`p-3 rounded-lg ${
                        quizResult.complexityFlags.ruleCount > 6 ? 'bg-red-100 text-red-800' :
                        quizResult.complexityFlags.ruleCount > 3 ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        <div className="font-semibold">Rules</div>
                        <div className="text-lg font-bold">{quizResult.complexityFlags.ruleCount}</div>
                        <div className="text-xs opacity-75">max 5</div>
                      </div>
                      <div className={`p-3 rounded-lg ${
                        quizResult.complexityFlags.sectionCount >= 2 ? 'bg-red-100 text-red-800' :
                        quizResult.complexityFlags.sectionCount === 1 ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        <div className="font-semibold">Sections</div>
                        <div className="text-lg font-bold">{quizResult.complexityFlags.sectionCount}</div>
                        <div className="text-xs opacity-75">max 0</div>
                      </div>
                      <div className={`p-3 rounded-lg ${
                        quizResult.complexityFlags.definitionCount >= 3 ? 'bg-red-100 text-red-800' :
                        quizResult.complexityFlags.definitionCount >= 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        <div className="font-semibold">Definitions</div>
                        <div className="text-lg font-bold">{quizResult.complexityFlags.definitionCount}</div>
                        <div className="text-xs opacity-75">max 2</div>
                      </div>
                    </div>
                    {quizResult.complexityFlags.hasExecutionRules && (
                      <div className="mt-3 p-2 bg-red-100 text-red-800 rounded text-sm flex items-center gap-2">
                        <XCircle size={16} />
                        Contains meta-instructions (EXECUTION RULES, APPROVAL GATE, etc.)
                      </div>
                    )}
                  </div>
                )}

                {quizResult.complexityFlags && quizResult.complexityFlags.suggestedSubPrompts > 1 && (
                  <div className="bg-blue-50 border border-blue-300 rounded-lg p-5">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Sparkles size={20} />
                      Suggested Breakdown
                    </h4>
                    <p className="text-blue-800 mb-3">
                      This prompt should be broken into approximately {quizResult.complexityFlags.suggestedSubPrompts} separate prompts for better results.
                    </p>
                    <div className="text-sm text-blue-700 bg-blue-100 rounded p-3">
                      <p className="font-medium mb-2">Recommended approach:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        {quizResult.complexityFlags.sectionCount >= 2 && <li>Separate each SECTION into its own prompt</li>}
                        {quizResult.complexityFlags.definitionCount >= 2 && <li>Define one concept at a time, then reference in follow-ups</li>}
                        {quizResult.complexityFlags.ruleCount > 5 && <li>Group related rules (3-5 max) into separate prompts</li>}
                        {quizResult.complexityFlags.hasExecutionRules && <li>Remove meta-instructions and use direct data requests</li>}
                        <li>Start with the simplest query, then refine iteratively</li>
                      </ol>
                    </div>
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

                {!quizResult.complexityFlags?.isTooComplex && quizResult.positives.length === 0 && (
                  <div className="bg-slate-100 border border-slate-300 rounded-lg p-5">
                    <p className="text-slate-700">No specific strengths detected. Try including clear objectives, timeframes, and specific criteria.</p>
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

                {!quizResult.complexityFlags?.isTooComplex && quizResult.feedback.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-5 hover-lift transition-all">
                    <p className="text-green-800 font-medium">Great prompt! No major improvements needed.</p>
                  </div>
                )}

                <p className="text-center text-slate-600 text-sm pt-2">
                  Try another prompt to practice!
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
              For any support contact{' '}
              <a
                href="mailto:tushar.badhwar@treasure-data.com"
                className="font-medium underline"
                style={{ color: PRIMARY }}
              >
                Tushar
              </a>
              {' '}- Forward Deployed Engineering
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

export default AudienceAgentHandbook;
