(() => {
  const letters = ['A', 'B', 'C', 'D'];
  const config = window.ptetPracticeConfig || {};
  const bank = window.ptetPracticeQuestionBank || { sections: [] };
  const section = (bank.sections || []).find((item) => item.slug === config.slug);
  const data = (section?.questions || []).filter(Boolean);
  const state = { current: 0, answers: {}, checked: {} };

  const $ = (id) => document.getElementById(id);
  const escapeHtml = (v = '') => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function readBrace(source, start) {
    if (source[start] !== '{') return { content: '', end: start };
    let depth = 0, content = '';
    for (let i = start; i < source.length; i += 1) {
      const char = source[i];
      if (char === '{' && source[i - 1] !== '\\') {
        if (depth > 0) content += char;
        depth += 1;
        continue;
      }
      if (char === '}' && source[i - 1] !== '\\') {
        depth -= 1;
        if (depth === 0) return { content, end: i + 1 };
        content += char;
        continue;
      }
      if (depth > 0) content += char;
    }
    return { content, end: source.length };
  }

  function renderArrayEnvironment(content) {
    const rows = content.replace(/^\{[^}]*\}/, '').split(/\\\\/).map((row) => row.trim()).filter(Boolean);
    return `<span class="math-array">${rows.map((row) => {
      const hasLine = /^\\hline\s*/.test(row);
      const cells = row.replace(/^\\hline\s*/, '').split(/\s*&\s*/).map((cell) => `<span class="math-array-cell">${renderLatexMath(cell.trim())}</span>`).join('');
      return `<span class="math-array-row ${hasLine ? 'math-hline' : ''}">${cells}</span>`;
    }).join('')}</span>`;
  }

  const latexCommands = {
    '\\left': '', '\\right': '',
    '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔', '\\implies': '⇒', '\\iff': '⇔',
    '\\lambda': 'λ', '\\theta': 'θ', '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ', '\\pi': 'π', '\\sigma': 'σ', '\\omega': 'ω', '\\mu': 'μ', '\\phi': 'φ', '\\rho': 'ρ', '\\tau': 'τ', '\\Delta': 'Δ', '\\Omega': 'Ω', '\\Sigma': 'Σ',
    '\\times': '×', '\\div': '÷', '\\cdot': '·', '\\qquad': '&nbsp;&nbsp;&nbsp;&nbsp;', '\\quad': '&nbsp;&nbsp;', '\\propto': '∝', '\\circ': '°', '\\cric': '°', '\\degree': '°',
    '\\pm': '±', '\\mp': '∓', '\\leq': '≤', '\\ge': '≥', '\\geq': '≥', '\\le': '≤', '\\neq': '≠', '\\approx': '≈', '\\infty': '∞',
    '\\angle': '∠', '\\triangle': '△', '\\cap': '∩', '\\cup': '∪', '\\hline': ''
  };
  const sortedCommandKeys = Object.keys(latexCommands).sort((a, b) => b.length - a.length);

  function renderLatexMath(source = '') {
    let html = '';
    for (let i = 0; i < source.length; i += 1) {
      if (source.startsWith('\\begin{array}', i)) {
        const end = source.indexOf('\\end{array}', i);
        if (end >= 0) { html += renderArrayEnvironment(source.slice(i + '\\begin{array}'.length, end)); i = end + '\\end{array}'.length - 1; continue; }
      }
      if (source.startsWith('\\frac', i)) {
        const num = readBrace(source, i + 5), den = readBrace(source, num.end);
        if (num.end > i + 5 && den.end > num.end) { html += `<span class="math-inline math-fraction"><span class="math-num">${renderLatexMath(num.content)}</span><span class="math-den">${renderLatexMath(den.content)}</span></span>`; i = den.end - 1; continue; }
      }
      if (source.startsWith('\\sqrt', i)) {
        const rad = readBrace(source, i + 5);
        if (rad.end > i + 5) { html += `<span class="math-root"><span class="math-radical">√</span><span class="math-radicand">${renderLatexMath(rad.content)}</span></span>`; i = rad.end - 1; continue; }
      }
      if (source.startsWith('\\text', i)) {
        const txt = readBrace(source, i + 5);
        if (txt.end > i + 5) { html += renderLatexMath(txt.content); i = txt.end - 1; continue; }
      }
      if (source.startsWith('\\overline', i)) {
        const over = readBrace(source, i + 9);
        if (over.end > i + 9) { html += `<span class="math-overline">${renderLatexMath(over.content)}</span>`; i = over.end - 1; continue; }
      }
      if (source.startsWith('\\cancel', i)) {
        const can = readBrace(source, i + 7);
        if (can.end > i + 7) { html += `<span class="math-cancel">${renderLatexMath(can.content)}</span>`; i = can.end - 1; continue; }
      }
      const command = sortedCommandKeys.find((key) => source.startsWith(key, i));
      if (command) { html += latexCommands[command]; i += command.length - 1; continue; }
      if (source[i] === '^' || source[i] === '_') {
        const isSup = source[i] === '^', next = source[i + 1] === '{' ? readBrace(source, i + 1) : { content: source[i + 1] || '', end: i + 2 };
        html += `<${isSup ? 'sup' : 'sub'}>${renderLatexMath(next.content)}</${isSup ? 'sup' : 'sub'}>`; i = next.end - 1; continue;
      }
      if (source[i] === '\\') {
        const match = source.slice(i).match(/^\\([a-zA-Z]+)/);
        if (match) { i += match[0].length - 1; continue; }
      }
      if (source[i] === '<') {
        const tagMatch = source.slice(i).match(/^<\/?(?:b|i|u|strong|em|br|hr|p|div|span|ul|ol|li|sup|sub)(?:\s+[^>]*)?>/i);
        if (tagMatch) { html += tagMatch[0]; i += tagMatch[0].length - 1; continue; }
      }
      html += escapeHtml(source[i]);
    }
    return html;
  }

  function formatText(value = '') {
    const normalized = String(value)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\\cric/g, '°')
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$${math}$$`)
      .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math}$`)
      .replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => `@@DISPLAY:${renderLatexMath(math)}@@`)
      .replace(/\$([^$\n]+)\$/g, (_, math) => `@@INLINE:${renderLatexMath(math)}@@`);
    return normalized.split(/(@@(?:DISPLAY|INLINE):[\s\S]*?@@)/).map((part) => {
      if (part.startsWith('@@DISPLAY:')) return `<span class="math-display">${part.slice(10, -2)}</span>`;
      if (part.startsWith('@@INLINE:')) return `<span class="math-inline">${part.slice(9, -2)}</span>`;
      return renderLatexMath(part).replace(/&lt;br\s*\/?&gt;/gi, '<br>').replace(/\r?\n/g, '<br>');
    }).join('');
  }

  const formatPreservedText = (value = '') => formatText(value);
  const renderLabelBlock = (title, content = '') => `<div class="question-block"><span class="question-block-title">${title}</span><div>${formatPreservedText(content)}</div></div>`;
  const embeddedOptionLine = /^\s*(?:[A-D]|[एबीसीडी])\s*[.)।:-]\s+/;
  const optionGuideLabel = /^(.*?)(?:\n\s*)?((?:सही\s+|अशुद्ध वाक्यों का\s+|असंगत\s+)?कूट|विकल्प)(?:\s*\([^)]*\))?\s*[:：]\s*(.*)$/is;
  const stripEmbeddedOptionLines = (value = '') => String(value).split(/\r?\n/).filter((line) => !embeddedOptionLine.test(line)).join('\n').replace(/(?:\n\s*)?(?:कूट|विकल्प)(?:\s*\([^)]*\))?\s*[:：]\s*$/i, '').trim();
  const splitOptionGuide = (value = '') => {
    const match = String(value).match(optionGuideLabel);
    if (!match) return { body: stripEmbeddedOptionLines(value), guide: '' };
    return { body: stripEmbeddedOptionLines(match[1]), guide: stripEmbeddedOptionLines(match[3]) };
  };
  const parseAssertionReason = (question = '') => {
    const match = String(question).match(/(.*?)(कथन\s*\(A\)\s*[:：])(.*?)(कारण\s*\(R\)\s*[:：])(.*)$/is);
    if (!match) return null;
    const reason = splitOptionGuide(match[5]);
    return { intro: match[1].trim(), statement: stripEmbeddedOptionLines(match[3]), reason: reason.body, guide: reason.guide };
  };
  const parseStatementConclusion = (question = '') => {
    const match = String(question).match(/(.*?)(कथन\s*[:：])(.*?)(निष्कर्ष\s*[:：]?)(.*)$/is);
    if (!match) return null;
    const conclusions = splitOptionGuide(match[5]);
    return { intro: match[1].trim(), statements: stripEmbeddedOptionLines(match[3]), conclusions: conclusions.body, guide: conclusions.guide };
  };
  const parseMatching = (question = '') => {
    const match = String(question).match(/(.*?)(सूची[-\s]*(?:1|I+)[^\n\r:：]*)(?:\s*[:：])?\s*\r?\n(.*?)(?:\r?\n\s*)+(सूची[-\s]*(?:2|II)[^\n\r:：]*)(?:\s*[:：])?\s*\r?\n(.*)$/is);
    if (!match) return null;
    const list2 = splitOptionGuide(match[5]);
    return { intro: stripEmbeddedOptionLines(match[1]), list1Title: match[2].trim(), list1: stripEmbeddedOptionLines(match[3]), list2Title: match[4].trim(), list2: list2.body, guide: list2.guide };
  };

  function renderStructuredQuestion(question) {
    const questionText = $('question-text');
    const matchingBlock = $('matching-block');
    const raw = String(question.question || '');
    const assertionData = question.questionType === 'Assertion-Reason' ? parseAssertionReason(raw) : null;
    if (assertionData) {
      questionText.innerHTML = `<div class="question-structured">${assertionData.intro ? `<div>${formatPreservedText(assertionData.intro)}</div>` : ''}${renderLabelBlock('कथन (A):', assertionData.statement)}${renderLabelBlock('कारण (R):', assertionData.reason)}${assertionData.guide ? renderLabelBlock('कूट:', assertionData.guide) : ''}</div>`;
      matchingBlock.innerHTML = '';
      return;
    }
    const statementData = question.questionType === 'Statement-Conclusion' ? parseStatementConclusion(raw) : null;
    if (statementData) {
      questionText.innerHTML = `<div class="question-structured">${statementData.intro ? `<div>${formatPreservedText(statementData.intro)}</div>` : ''}${renderLabelBlock('कथन:', statementData.statements)}${renderLabelBlock('निष्कर्ष:', statementData.conclusions)}${statementData.guide ? renderLabelBlock('कूट:', statementData.guide) : ''}</div>`;
      matchingBlock.innerHTML = '';
      return;
    }
    const matching = question.questionType === 'Matching' ? parseMatching(raw) : null;
    if (matching) {
      questionText.innerHTML = matching.intro ? formatPreservedText(matching.intro) : '';
      matchingBlock.innerHTML = `<div class="matching-grid"><div class="matching-list"><strong>${formatPreservedText(matching.list1Title || 'सूची-1')}</strong><div class="mt-2">${formatPreservedText(matching.list1)}</div></div><div class="matching-list"><strong>${formatPreservedText(matching.list2Title || 'सूची-2')}</strong><div class="mt-2">${formatPreservedText(matching.list2)}</div></div></div>`;
      return;
    }
    questionText.innerHTML = formatPreservedText(stripEmbeddedOptionLines(raw));
    matchingBlock.innerHTML = '';
  }

  function optionHtml(question) {
    return (question.options || []).map((option, index) => {
      const key = letters[index];
      const selected = state.answers[question.id] === key;
      const checked = Boolean(state.checked[question.id]);
      const correct = question.answer === key;
      const wrong = checked && selected && !correct;
      const classes = ['option-item', 'cursor-pointer'];
      if (selected) classes.push('selected');
      if (checked && correct) classes.push('correct');
      if (wrong) classes.push('wrong');
      return `<label class="${classes.join(' ')}"><input class="mr-2 mt-1 align-top" type="radio" name="option" value="${key}" ${selected ? 'checked' : ''}/> <span class="option-code">${key}.</span> <span>${formatPreservedText(option)}</span></label>`;
    }).join('');
  }

  function renderFeedback(question) {
    const feedback = $('feedback');
    const explanation = $('explanation');
    if (!state.checked[question.id]) {
      feedback.classList.add('hidden');
      explanation.classList.add('hidden');
      return;
    }
    const selected = state.answers[question.id];
    const correctAnswerText = question.options[letters.indexOf(question.answer)] || '';
    const isCorrect = selected === question.answer;
    feedback.className = `mt-6 review-card ${isCorrect ? 'status-correct' : 'status-wrong'}`;
    feedback.innerHTML = isCorrect
      ? `<p class="font-bold">✅ सही उत्तर! आपने सही विकल्प चुना।</p><p class="mt-2 text-sm"><strong>Correct Answer:</strong> <span class="answer-pill correct">${question.answer}. ${formatPreservedText(correctAnswerText)}</span></p>`
      : `<p class="font-bold">❌ गलत उत्तर।</p><p class="mt-2 text-sm"><strong>Your Answer:</strong> <span class="answer-pill user-wrong">${selected || '—'}</span></p><p class="mt-2 text-sm"><strong>Correct Answer:</strong> <span class="answer-pill correct">${question.answer}. ${formatPreservedText(correctAnswerText)}</span></p>`;
    explanation.classList.remove('hidden');
    $('explanation-text').innerHTML = formatPreservedText(question.explanation || 'Explanation available नहीं है।');
  }

  function renderPalette() {
    const palette = $('practice-palette');
    if (!palette) return;
    palette.innerHTML = data.map((question, index) => {
      const classes = ['practice-palette-btn'];
      if (state.current === index) classes.push('active');
      if (state.checked[question.id]) classes.push('checked');
      if (!state.checked[question.id] && state.answers[question.id]) classes.push('unchecked-attempted');
      return `<button type="button" data-index="${index}" class="${classes.join(' ')}">${index + 1}</button>`;
    }).join('');
    palette.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        state.current = Number(button.dataset.index) || 0;
        renderQuestion();
      });
    });
  }

  function renderQuestion() {
    if (!data.length) {
      $('question-meta').textContent = 'Questions unavailable';
      $('question-text').textContent = 'PTET practice question data could not be loaded.';
      return;
    }
    const question = data[state.current];
    $('practice-title').textContent = section.title;
    $('practice-description').textContent = section.description;
    $('question-meta').textContent = `प्रश्न / Question ${state.current + 1} of ${data.length}`;
    $('section-tag').textContent = `${question.section} • ${question.difficulty} • ${question.questionType}`;
    renderStructuredQuestion(question);
    $('options').innerHTML = optionHtml(question);
    $('options').querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', (event) => {
        state.answers[question.id] = event.target.value;
        if (!state.checked[question.id]) renderFeedback(question);
        renderQuestion();
      });
    });
    $('prev-btn').disabled = state.current === 0;
    $('next-btn').disabled = state.current === data.length - 1;
    renderFeedback(question);
    renderPalette();
  }

  function bindEvents() {
    $('check-btn').addEventListener('click', () => {
      const question = data[state.current];
      if (!state.answers[question.id]) {
        const feedback = $('feedback');
        feedback.className = 'mt-6 review-card status-attempted';
        feedback.innerHTML = '<p class="font-bold">कृपया पहले एक विकल्प चुनें।</p>';
        $('explanation').classList.add('hidden');
        return;
      }
      state.checked[question.id] = true;
      renderQuestion();
    });
    $('prev-btn').addEventListener('click', () => {
      if (state.current > 0) {
        state.current -= 1;
        renderQuestion();
      }
    });
    $('next-btn').addEventListener('click', () => {
      if (state.current < data.length - 1) {
        state.current += 1;
        renderQuestion();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!section) {
      $('practice-title').textContent = 'PTET Practice Set';
      $('practice-description').textContent = 'Practice section not found. Please return to the PTET Practice Sets hub.';
      $('question-meta').textContent = 'Questions unavailable';
      return;
    }
    bindEvents();
    renderQuestion();
  });
})();
