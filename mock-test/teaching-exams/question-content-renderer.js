(() => {
  const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const readArgument = (source, start) => {
    let index = start;
    while (/\s/.test(source[index] || '')) index += 1;
    if (source[index] !== '{') return null;
    let depth = 0;
    let content = '';
    for (let cursor = index; cursor < source.length; cursor += 1) {
      const character = source[cursor];
      if (character === '{') {
        if (depth) content += character;
        depth += 1;
      } else if (character === '}') {
        depth -= 1;
        if (!depth) return { content, end: cursor + 1 };
        content += character;
      } else {
        content += character;
      }
    }
    return null;
  };

  const symbols = {
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε',
    theta: 'θ', lambda: 'λ', mu: 'μ', pi: 'π', sigma: 'σ',
    phi: 'φ', omega: 'ω', times: '×', cdot: '·', div: '÷',
    pm: '±', leq: '≤', geq: '≥', neq: '≠', approx: '≈',
    propto: '∝', infty: '∞', rightarrow: '→', leftarrow: '←',
    Rightarrow: '⇒', Leftrightarrow: '⇔', circ: '∘', degree: '°',
    quad: ' ', qquad: '  ', space: ' ', comma: ','
  };

  const renderMath = (value = '') => {
    const source = String(value)
      .replace(/\\left\b/g, '')
      .replace(/\\right\b/g, '')
      .replace(/\\textstyle\b/g, '')
      .replace(/\\displaystyle\b/g, '');
    let html = '';
    for (let index = 0; index < source.length;) {
      if (source.startsWith('\\frac', index)) {
        const numerator = readArgument(source, index + 5);
        const denominator = numerator && readArgument(source, numerator.end);
        if (numerator && denominator) {
          html += `<span class="math-fraction"><span>${renderMath(numerator.content)}</span><span>${renderMath(denominator.content)}</span></span>`;
          index = denominator.end;
          continue;
        }
      }
      if (source.startsWith('\\sqrt', index)) {
        const radicand = readArgument(source, index + 5);
        if (radicand) {
          html += `<span class="math-root"><span class="math-radical">√</span><span>${renderMath(radicand.content)}</span></span>`;
          index = radicand.end;
          continue;
        }
      }
      if (source.startsWith('\\text', index)) {
        const text = readArgument(source, index + 5);
        if (text) {
          html += escapeHtml(text.content);
          index = text.end;
          continue;
        }
      }
      const suffix = source[index] === '^' || source[index] === '_' ? source[index] : '';
      if (suffix) {
        const argument = readArgument(source, index + 1);
        const simple = argument || (/^[A-Za-z0-9+-]/.exec(source.slice(index + 1)) || [])[0];
        if (simple) {
          const content = typeof simple === 'string' ? simple : simple.content;
          const end = typeof simple === 'string' ? index + 1 + simple.length : simple.end;
          html += `<${suffix === '^' ? 'sup' : 'sub'}>${renderMath(content)}</${suffix === '^' ? 'sup' : 'sub'}>`;
          index = end;
          continue;
        }
      }
      if (source[index] === '\\') {
        const command = /^\\([A-Za-z]+|.)/.exec(source.slice(index));
        if (command) {
          const symbol = symbols[command[1]];
          html += escapeHtml(symbol ?? (command[1].length === 1 ? command[1] : ''));
          index += command[0].length;
          continue;
        }
      }
      html += escapeHtml(source[index]);
      index += 1;
    }
    return html;
  };

  const renderMathInText = (value = '') => {
    let source = String(value)
      .replace(/&lt;br\s*\/?&gt;/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&lt;\/?(?:b|i|u|strong|em|br|p|div|span|ul|ol|li|sup|sub)(?:\s+[^&]*?)?&gt;/gi, '')
      .replace(/&lt;\/?[a-z][^&]*?&gt;/gi, '')
      .replace(/<[^>]*>/g, '');
    const pattern = /(\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$|\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\\(?:frac|sqrt|text)\s*\{|\\[A-Za-z]+)/g;
    let result = '';
    let last = 0;
    let match;
    while ((match = pattern.exec(source))) {
      result += escapeHtml(source.slice(last, match.index));
      if (match[1].endsWith('{')) {
        const argument = readArgument(source, match.index + match[1].length - 1);
        if (!argument) {
          result += escapeHtml(match[1]);
          last = pattern.lastIndex;
          continue;
        }
        const command = match[1].slice(1, match[1].indexOf('{'));
        if (command === 'frac') {
          const denominator = readArgument(source, argument.end);
          if (denominator) {
            result += renderMath(command === 'frac'
              ? `\\frac{${argument.content}}{${denominator.content}}`
              : `\\${command}{${argument.content}}`);
            last = denominator.end;
            pattern.lastIndex = denominator.end;
            continue;
          }
        }
        result += renderMath(`\\${command}{${argument.content}}`);
        last = argument.end;
        pattern.lastIndex = argument.end;
        continue;
      }
      result += renderMath(match[2] ?? match[3] ?? match[4] ?? match[5] ?? match[1]);
      last = pattern.lastIndex;
    }
    result += escapeHtml(source.slice(last));
    return result
      .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
      .replace(/(^|<br>)\s*([-*])\s+/g, '$1<span class="content-list-item">• </span>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/\r?\n/g, '<br>');
  };

  window.ToolshalaQuestionContentRenderer = {
    render: renderMathInText,
    renderMath
  };
})();
