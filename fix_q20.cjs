const fs = require('fs');

const inputMd = `
## प्रश्न 20 (बहु-कथन कूट / Multi-Statement Code)
**विषय: सूचना तकनीकी (Information Technology) - राजस्थान ई-गवर्नेंस पहल**

राजस्थान सरकार की प्रमुख ई-गवर्नेंस एवं डिजिटल पहलों के संदर्भ में निम्नलिखित कथनों का विश्लेषण कीजिए:
1. **राज-ईवॉल्ट (Raj-eVault):** यह नागरिकों और सरकारी विभागों के लिए एक सुरक्षित इलेक्ट्रॉनिक दस्तावेज़ प्रबंधक (डिजिटल वॉलेट) है, जिसके दस्तावेज़ कानूनी रूप से मान्य हैं।
2. **जन सूचना पोर्टल (2019):** सूचना का अधिकार (RTI) की धारा 4(2) के तहत नागरिकों को बिना आवेदन किए सरकारी योजनाओं की सूचनाएं स्वतः (Proactive) उपलब्ध कराने वाला भारत का पहला पोर्टल है।
3. **राजनेट (RajNet):** यह ग्राम पंचायत स्तर तक सरकारी कार्यालयों को ब्रॉडबैंड एवं सैटेलाइट नेटवर्क कनेक्टिविटी प्रदान करने वाला राज्य का एकीकृत नेटवर्क ढांचा है।

**विकल्प:**
* [A] 1, 2 और 3 सभी
* [B] केवल 1 और 2
* [C] केवल 2 और 3
* [D] केवल 1 और 3

**सही उत्तर: [A]**
**विस्तृत व्याख्या:**
तीनों कथन DOIT&C (सूचना प्रौद्योगिकी विभाग, राजस्थान) के आधिकारिक प्रोजेक्ट्स के अनुसार सत्य हैं। जन सूचना पोर्टल 13 सितंबर 2019 को शुरू हुआ था। राज-ईवॉल्ट पेपरलेस ऑफिस के लिए डिजिटल साइन युक्त स्टोरेज है और राजनेट ग्राम पंचायत स्तर तक कनेक्टिविटी देता है।
`;

const block = inputMd;
const qMatch = block.match(/## प्रश्न (\d+) \((.*?)\)/);
const id = parseInt(qMatch[1], 10);
const qType = qMatch[2].trim();

const subjectMatch = block.match(/\*\*विषय:\s*(.*?)\*\*/);
const subject = subjectMatch ? subjectMatch[1].trim() : '';

const optMatch = block.match(/\*\*विकल्प:\*\*\n([\s\S]*?)\n\n\*\*सही उत्तर:/);
const optionsRaw = optMatch ? optMatch[1] : '';
const options = optionsRaw.split('\n').filter(l => l.trim().startsWith('*')).map(l => l.replace(/^\*\s*/, '').trim());

const ansMatch = block.match(/\*\*सही उत्तर:\s*\[([A-D])\]\*\*/);
const answer = ansMatch ? ansMatch[1] : '';

const expMatch = block.match(/\*\*विस्तृत व्याख्या:\*\*\s*\n?([\s\S]*)$/);
const explanation = expMatch ? expMatch[1].trim() : '';

const qBodyMatch = block.match(/\*\*विषय:.*?\*\*\n+([\s\S]*?)\n+\*\*विकल्प:\*\*/);
let questionText = qBodyMatch ? qBodyMatch[1].trim() : '';

questionText = questionText.replace(/\*\*(.*?)\*\*/g, '$1');
const cleanOptions = options.map(o => o.replace(/\*\*(.*?)\*\*/g, '$1'));

const q = {
  id,
  section: subject,
  questionType: qType,
  difficulty: "advanced",
  topic: subject,
  question: questionText,
  options: cleanOptions,
  answer,
  explanation
};

const htmlPath = 'mock-test/teaching-exams/3rd-grade-mock-test-6.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const jsonRegex = /const thirdGradeMockTest6 = (\{[\s\S]*?\});\s*const testConfig/;
const match = html.match(jsonRegex);
if (match) {
  const testData = JSON.parse(match[1]);
  const section = testData.sections[0];
  const idx = section.questions.findIndex(x => x.id === q.id);
  if (idx !== -1) {
    section.questions[idx] = q;
  }
  const updatedJson = JSON.stringify(testData, null, 2);
  html = html.replace(jsonRegex, `const thirdGradeMockTest6 = ${updatedJson};\n      const testConfig`);
  fs.writeFileSync(htmlPath, html);
  console.log('Successfully fixed Q20.');
}
