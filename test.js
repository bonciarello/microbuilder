/**
 * MicroBuilder Test Suite
 * Validates the application against acceptance criteria and quality metrics.
 *
 * Run: node test.js
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 4599;
const BASE_URL = `http://localhost:${PORT}`;

let serverProcess = null;
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    const msg = `  ✗ ${message}`;
    console.log(msg);
    failures.push(msg);
  }
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) reject(new Error('Server start timeout'));
    }, 10000);

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('running') && !started) {
        started = true;
        clearTimeout(timeout);
        // Give it a moment to fully bind
        setTimeout(resolve, 500);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      // If port is in use, try to proceed anyway (server may already be running)
      const errStr = data.toString();
      if (errStr.includes('EADDRINUSE')) {
        clearTimeout(timeout);
        started = true;
        resolve();
      }
    });

    serverProcess.on('error', reject);
    serverProcess.on('exit', (code) => {
      if (!started) {
        clearTimeout(timeout);
        reject(new Error(`Server exited with code ${code}`));
      }
    });
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

async function runTests() {
  console.log('\n🔬 MicroBuilder Test Suite\n');
  console.log('Starting server...');

  try {
    await startServer();
  } catch (e) {
    console.log(`  ⚠ Could not start server: ${e.message}`);
    console.log('  Trying to connect to an already-running server...');
  }

  // Give the server a moment
  await new Promise(r => setTimeout(r, 1000));

  console.log('\n📄 HTML Structure & Content\n');

  // Test 1: Main page loads
  let html;
  try {
    const res = await fetch(BASE_URL + '/');
    html = res.body;
    assert(res.status === 200, 'Main page returns HTTP 200');
    assert(res.headers['content-type']?.includes('text/html'), 'Content-Type is text/html');
  } catch (e) {
    assert(false, `Main page loads: ${e.message}`);
    console.log('\n❌ Cannot proceed without page load. Stopping tests.');
    stopServer();
    printSummary();
    return;
  }

  // Test 2: Required HTML elements
  assert(html.includes('<!DOCTYPE html>'), 'Document has DOCTYPE declaration');
  assert(html.includes('<html lang="it"'), 'HTML has lang="it" attribute');
  assert(html.includes('<meta name="viewport"'), 'Viewport meta tag present');
  assert(html.includes('<title>MicroBuilder'), 'Title tag contains "MicroBuilder"');
  assert(html.includes('<meta name="description"'), 'Meta description present');

  // Test 3: Semantic landmarks
  assert(html.includes('<header'), 'Header landmark present');
  assert(html.includes('<main'), 'Main landmark present');
  assert(html.includes('<footer'), 'Footer landmark present');

  // Test 4: Exactly one h1
  const h1Count = (html.match(/<h1/g) || []).length;
  assert(h1Count === 1, `Exactly one <h1> (found ${h1Count})`);

  // Test 5: SEO elements
  assert(html.includes('og:title'), 'Open Graph og:title present');
  assert(html.includes('og:description'), 'Open Graph og:description present');
  assert(html.includes('og:type'), 'Open Graph og:type present');
  assert(html.includes('og:url'), 'Open Graph og:url present');
  assert(html.includes('rel="canonical"'), 'Canonical link present');
  assert(html.includes('application/ld+json'), 'JSON-LD structured data present');
  assert(html.includes('WebApplication'), 'JSON-LD has WebApplication type');

  // Test 6: Essential UI text/content
  assert(html.includes('MicroBuilder'), 'App name "MicroBuilder" in content');
  assert(html.includes('Calcolatrice'), 'Calculator template mentioned');
  assert(html.includes('Conto alla Rovescia'), 'Countdown template mentioned');
  assert(html.includes('Lista di Controllo'), 'Checklist template mentioned');
  assert(html.includes('Quiz'), 'Quiz template mentioned');
  assert(html.includes('Convertitore'), 'Converter template mentioned');

  console.log('\n🎨 Design & Accessibility\n');

  // Test 7: CSS variables / design tokens
  assert(html.includes('--primary'), 'CSS custom property --primary defined');
  assert(html.includes('--bg'), 'CSS custom property --bg defined');
  assert(html.includes('--font-body'), 'CSS custom property for body font defined');
  assert(html.includes('--font-mono'), 'CSS custom property for mono font defined');

  // Test 8: Font loading
  assert(html.includes('fonts.googleapis.com'), 'Google Fonts linked');
  assert(html.includes('Fredoka'), 'Fredoka display font included');
  assert(html.includes('Nunito'), 'Nunito body font included');
  assert(html.includes('JetBrains+Mono'), 'JetBrains Mono code font included');

  // Test 9: Focus-visible support
  assert(html.includes(':focus-visible'), ':focus-visible styles present');

  // Test 10: Reduced motion support
  assert(html.includes('prefers-reduced-motion'), 'prefers-reduced-motion media query present');

  // Test 11: Touch targets
  assert(html.includes('min-height:44px'), '44px minimum touch target specified');
  assert(html.includes('min-height:56px'), '56px button touch targets present');

  console.log('\n🔧 JavaScript & Vue Integration\n');

  // Test 12: Vue.js CDN
  assert(html.includes('vue@3.4'), 'Vue 3.4 CDN script tag present');
  assert(html.includes('vue.global.prod.js'), 'Vue production build loaded');
  assert(html.includes('Vue.createApp'), 'Vue.createApp call present');

  // Test 13: Template data
  assert(html.includes("id: 'calculator'"), 'Calculator template ID present');
  assert(html.includes("id: 'countdown'"), 'Countdown template ID present');
  assert(html.includes("id: 'checklist'"), 'Checklist template ID present');
  assert(html.includes("id: 'quiz'"), 'Quiz template ID present');
  assert(html.includes("id: 'converter'"), 'Converter template ID present');

  // Test 14: Template count (at least 4)
  const templateIdCount = (html.match(/id:\s*'[a-z]+'/g) || []).filter(id =>
    ['calculator', 'countdown', 'checklist', 'quiz', 'converter'].some(t => id.includes(t))
  ).length;
  assert(templateIdCount >= 4, `At least 4 templates defined (found ${templateIdCount})`);

  // Test 15: Code generation functions
  assert(html.includes('function wrapApp'), 'wrapApp helper function present');
  assert(html.includes('.generate'), 'Template generate methods present');

  // Test 16: Clipboard API
  assert(html.includes('navigator.clipboard'), 'Clipboard API usage present');
  assert(html.includes('writeText'), 'writeText clipboard method used');

  // Test 17: Fallback copy
  assert(html.includes('fallbackCopy'), 'Fallback copy method present');
  assert(html.includes('document.execCommand'), 'execCommand fallback present');

  // Test 18: Download functionality
  assert(html.includes('downloadCode'), 'Download code function present');
  assert(html.includes('URL.createObjectURL'), 'Blob download URL creation present');

  // Test 19: Live preview iframe
  assert(html.includes('srcdoc'), 'Iframe srcdoc for live preview present');
  assert(html.includes('sandbox="allow-scripts'), 'Iframe sandbox attribute present');

  // Test 20: Copy feedback
  assert(html.includes('copySuccess'), 'Copy success state tracked');
  assert(html.includes('Copiato negli appunti'), 'Copy feedback message in Italian');

  // Test 21: Color presets
  assert(html.includes('colorPresets'), 'Color presets array defined');
  assert(html.includes("'#FF5E5B'"), 'Coral red in presets');
  assert(html.includes("'#247BA0'"), 'Teal blue in presets');

  // Test 22: Step indicator
  assert(html.includes("step === 'select'"), 'Step selection logic present');
  assert(html.includes("step === 'customize'"), 'Step customization logic present');

  // Test 23: input labels
  const labelForCount = (html.match(/<label\s+for=/g) || []).length;
  assert(labelForCount >= 3, `At least 3 <label for="..."> elements (found ${labelForCount})`);

  // Test 24: ARIA attributes
  assert(html.includes('aria-label'), 'aria-label attributes present');
  assert(html.includes('aria-labelledby'), 'aria-labelledby attributes present');
  assert(html.includes('role="tablist"'), 'Tablist role present');
  assert(html.includes('role="tab"'), 'Tab role present');
  assert(html.includes('aria-selected'), 'aria-selected attributes present');

  console.log('\n🤖 SEO Files\n');

  // Test 25: robots.txt
  try {
    const robotsRes = await fetch(BASE_URL + '/robots.txt');
    assert(robotsRes.status === 200, 'robots.txt returns HTTP 200');
    assert(robotsRes.body.includes('User-agent'), 'robots.txt has User-agent directive');
    assert(robotsRes.body.includes('Sitemap:'), 'robots.txt has Sitemap directive');
  } catch (e) {
    assert(false, `robots.txt fetch: ${e.message}`);
  }

  // Test 26: sitemap.xml
  try {
    const sitemapRes = await fetch(BASE_URL + '/sitemap.xml');
    assert(sitemapRes.status === 200, 'sitemap.xml returns HTTP 200');
    assert(sitemapRes.body.includes('<urlset'), 'sitemap.xml has urlset element');
  } catch (e) {
    assert(false, `sitemap.xml fetch: ${e.message}`);
  }

  console.log('\n📱 Responsive Design\n');

  // Test 27: Responsive media queries
  assert(html.includes('@media'), 'CSS media queries present');
  assert(html.includes('max-width:639px'), 'Mobile breakpoint (639px) present');
  assert(html.includes('max-width:380px'), 'Small mobile breakpoint (380px) present');
  assert(html.includes('min-width:768px'), 'Tablet breakpoint (768px) present');

  // Test 28: Font size minimums
  assert(html.includes('font-size:0.9375rem') || html.includes('font-size: 0.9375rem'), 'Minimum 15px font size for inputs');

  // Test 29: Line height
  assert(html.includes('line-height:1.6'), 'Body line-height of 1.6 present');

  // Test 30: Touch spacing (8px grid)
  assert(html.includes('--grid') && html.includes('8px'), '8px grid spacing token defined');

  console.log('\n🚀 Template Code Generation\n');

  // Test 31: Calculator template has complete structure
  const calcIdx = html.indexOf("id: 'calculator'");
  assert(calcIdx > 0, 'Calculator template found in source');
  assert(html.includes("wrapApp(opts.title, opts.color, styles, body, js)"), 'Templates use wrapApp helper');

  // Test 32: No Lorem Ipsum
  const hasLorem = /\blorem\b/i.test(html);
  assert(!hasLorem, 'No Lorem Ipsum placeholder text');

  // Test 33: No unescaped template literal issues
  assert(!html.includes('$ {'), 'No malformed template interpolations');

  // Test 34: Proper script tag escaping in generated code
  assert(html.includes('\\/script>') || html.includes('script>\\n</body>'), 'Script tags properly escaped in template literals');

  // Final summary
  stopServer();
  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(50));
  const total = passed + failed;
  console.log(`\n📊 Results: ${passed}/${total} passed`);
  if (failed > 0) {
    console.log(`\n❌ ${failed} test(s) failed:`);
    failures.forEach(f => console.log(f));
    console.log('\n⚠ Some tests failed.');
  } else {
    console.log('\n✅ All tests passed!');
  }
  console.log('\n' + '='.repeat(50) + '\n');
}

// Handle cleanup
process.on('SIGINT', () => { stopServer(); process.exit(0); });
process.on('SIGTERM', () => { stopServer(); process.exit(0); });

// Run
runTests().catch((e) => {
  console.error('Test suite error:', e.message);
  stopServer();
  process.exit(1);
});
