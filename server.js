'use strict';

const path = require('path');
const fs = require('fs');
const { pathToFileURL, fileURLToPath } = require('url');
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    services: {
      screenshot: 'available',
      proxy: 'available',
      fileview: 'available'
    },
    timestamp: new Date().toISOString()
  });
});

let browserInstance = null;
async function getBrowser() {
  if (browserInstance) return browserInstance;
  
  // Set HEADLESS=false in environment to see Chrome window (useful for captchas)
  const headlessMode = process.env.HEADLESS !== 'false';
  
  browserInstance = await puppeteer.launch({
    headless: headlessMode,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });
  return browserInstance;
}

function normalizeTargetUrl(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Already a file URL
  if (/^file:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Absolute local path (macOS/Linux) or Windows drive path
  if (trimmed.startsWith('/') || /^[a-zA-Z]:\\/.test(trimmed)) {
    const abs = path.resolve(trimmed);
    return pathToFileURL(abs).href;
  }

  // http(s) URL
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Bare host or localhost, assume http
  return `http://${trimmed}`;
}

app.get('/healthz', (_req, res) => {
  res.type('text/plain').send('ok');
});

app.get('/screenshot', async (req, res) => {
  const rawUrl = req.query.url;
  const targetUrl = normalizeTargetUrl(rawUrl);
  if (!targetUrl) {
    res.status(400).type('text/plain').send('Missing or invalid url');
    return;
  }

  const width = Math.max(200, Math.min(4000, parseInt(req.query.width || '1440', 10) || 1440));
  const height = Math.max(200, Math.min(8000, parseInt(req.query.height || '900', 10) || 900));
  const dpr = Math.max(1, Math.min(3, parseFloat(req.query.dpr || '1') || 1));
  const fullPageParam = String(req.query.fullPage || '').toLowerCase();
  const fullPage = fullPageParam === '1' || fullPageParam === 'true' || fullPageParam === 'yes';
  // Default to 2000ms wait if not specified, to allow images/fonts to load
  const waitMs = Math.max(0, Math.min(60000, parseInt(req.query.wait || '2000', 10) || 2000));

  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: dpr });

    // For file:// URLs, use simpler wait strategy as networkidle doesn't work well
    const isFileUrl = targetUrl.startsWith('file://');
    const waitStrategy = isFileUrl ? ['load', 'domcontentloaded'] : ['domcontentloaded', 'networkidle2'];
    await page.goto(targetUrl, { waitUntil: waitStrategy, timeout: 45000 });

    // Always wait a bit for dynamic content, images, fonts, etc.
    await new Promise(resolve => setTimeout(resolve, waitMs));

    const buffer = await page.screenshot({ type: 'png', fullPage });

    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store');
    res.end(buffer, 'binary');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('screenshot error:', err);
    res.status(500).type('text/plain').send(`Screenshot error: ${err && err.message ? err.message : String(err)}`);
  } finally {
    if (page) {
      try { await page.close(); } catch (_) {}
    }
  }
});

// Proxy for http(s) URLs to bypass iframe restrictions
// GET /proxy?url=<http(s) URL>
app.get('/proxy', async (req, res) => {
  try {
    const targetUrl = String(req.query.url || '').trim();
    if (!targetUrl) {
      res.status(400).type('text/plain').send('Missing url');
      return;
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      res.status(400).type('text/plain').send('Only http(s) URLs supported in proxy');
      return;
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    if (!response.ok) {
      const errorMsg = `
        <html>
          <head><title>Proxy Error</title></head>
          <body style="font-family: system-ui; padding: 40px; background: #f5f5f5;">
            <h2>⚠️ Cannot proxy this URL</h2>
            <p>The target website (${targetUrl}) is blocking server-side access (HTTP ${response.status}).</p>
            <p><strong>Solution:</strong> Switch to <strong>Screenshot mode</strong> instead of Live (iframe) mode to view this site.</p>
            <p style="color: #666; font-size: 14px;">Note: Screenshot mode won't show animations or parallax effects, but it works for all sites.</p>
          </body>
        </html>
      `;
      res.type('html').send(errorMsg);
      return;
    }

    const contentType = response.headers.get('content-type') || '';
    
    // If it's HTML, rewrite it to proxy assets
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const urlObj = new URL(targetUrl);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      
      // Rewrite absolute URLs to go through proxy
      html = html.replace(/(src|href)=("|')https?:\/\/[^"']+/gi, (match, attr, quote) => {
        const urlMatch = match.match(/(src|href)=("|')(https?:\/\/[^"']+)/i);
        if (urlMatch) {
          const originalUrl = urlMatch[3];
          return `${attr}=${quote}/proxy?url=${encodeURIComponent(originalUrl)}`;
        }
        return match;
      });
      
      // Rewrite protocol-relative URLs (//cdn.example.com/file.js)
      html = html.replace(/(src|href)=("|')\/\/([^"']+)/gi, `$1=$2/proxy?url=${encodeURIComponent(urlObj.protocol)}//$3`);
      
      // Rewrite root-relative URLs (/path/to/file.js)
      html = html.replace(/(src|href)=("|')\/(?!\/|proxy)/gi, `$1=$2/proxy?url=${encodeURIComponent(baseUrl)}/`);
      
      // Add base tag
      html = html.replace(/<head[^>]*>/i, (m) => `${m}\n<base href="/proxy?url=${encodeURIComponent(baseUrl)}/" />`);

      // Rewrite srcset attributes (support for <img> / <source>)
      html = html.replace(/srcset=("|')([^"']+)("|')/gi, (m, q1, value, q2) => {
        const sources = value.split(',').map((source) => {
          const parts = source.trim().split(/\s+/);
          const url = parts[0];
          const descriptor = parts.slice(1).join(' ');
          let absolute = url;
          if (/^\/\//.test(url)) absolute = `${urlObj.protocol}${url}`;
          else if (/^\//.test(url)) absolute = `${baseUrl}${url}`;
          else if (!/^https?:\/\//i.test(url)) absolute = new URL(url, targetUrl).toString();
          const proxied = `/proxy?url=${encodeURIComponent(absolute)}`;
          return descriptor ? `${proxied} ${descriptor}` : proxied;
        });
        return `srcset=${q1}${sources.join(', ')}${q2}`;
      });

      // Rewrite url(...) occurrences in inline style attributes
      html = html.replace(/style=("|')(.*?)("|')/gi, (m, q1, content, q2) => {
        const rewritten = content
          // url(https://...)
          .replace(/url\(("|')?(https?:\/\/[^\)"']+)("|')?\)/gi, (_m, _qa, abs, _qb) => `url(/proxy?url=${encodeURIComponent(abs)})`)
          // url(//...)
          .replace(/url\(("|')?\/\/([^\)"']+)("|')?\)/gi, (_m, _qa, rest, _qb) => `url(/proxy?url=${encodeURIComponent(urlObj.protocol + '//' + rest)})`)
          // url(/path)
          .replace(/url\(("|')?(\/[^\)"']+)("|')?\)/gi, (_m, _qa, p, _qb) => `url(/proxy?url=${encodeURIComponent(baseUrl + p)})`)
          // url(relative)
          .replace(/url\(("|')?([^:\/\)"'][^\)"']*)("|')?\)/gi, (_m, _qa, rel, _qb) => `url(/proxy?url=${encodeURIComponent(new URL(rel, targetUrl).toString())})`);
        return `style=${q1}${rewritten}${q2}`;
      });

      // Inject lightweight scroll-sync helper so overlay can drive inner scroll
      const syncScript = `\n<script>(function(){try{var lastSent=0;window.addEventListener('message',function(e){var d=e&&e.data||{};if(d.type==='SYNC_SCROLL_BY'){window.scrollBy(0, d.dy||0);}else if(d.type==='SYNC_SCROLL_TO'){window.scrollTo(d.x||0,d.y||0);} },{passive:true});var raf;window.addEventListener('scroll',function(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){lastSent=Date.now();try{parent&&parent.postMessage({type:'SCROLL_POS',x:window.scrollX||0,y:window.scrollY||0},'*');}catch(_){}});},{passive:true});}catch(_){}})();</script>`;

      const assetScript = `\n<script>(function(){try{function getBase(){var b=document.querySelector('base');if(b&&b.href){var m=b.href.match(/\\?url=([^&]+)/);if(m) return decodeURIComponent(m[1]);}try{var u=new URL(location.href);var t=u.searchParams.get('url');if(t) return t;}catch(_){ }return location.origin;}var ORIGIN=getBase();function abs(u){if(!u) return null;u=u.trim();if(/^data:|^#/.test(u)) return u; if(/^https?:\\/\\//i.test(u)) return u; if(/^\\/\\//.test(u)) return location.protocol + u; if(u[0]=='/') return ORIGIN.replace(/\\/$/,'') + u; try{return new URL(u, ORIGIN).toString();}catch(_){return u;}}function prox(u){var a=abs(u); if(!a) return u; return '/proxy?url=' + encodeURIComponent(a);}function rewriteSrcset(el){var v=el.getAttribute('srcset'); if(!v) return; var out=v.split(',').map(function(s){s=s.trim(); var sp=s.split(/\s+/); var url=sp[0]; var rest=sp.slice(1).join(' '); var p=prox(url); return rest? (p+' '+rest): p;}).join(', '); el.setAttribute('srcset', out);}function rewriteStyle(el){var v=el.getAttribute('style'); if(!v) return; var out=v.replace(/url\\((\\"|')?([^\\)\\"']+)(\\"|')?\\)/g, function(_,q1,uri){return 'url(' + prox(uri) + ')';}); el.setAttribute('style', out);}function handle(el){if(!el||!el.tagName) return; if(el.hasAttribute('src')){var s=el.getAttribute('src'); if(s && !/\\/proxy\\?url=/.test(s)) el.setAttribute('src', prox(s));} if(el.hasAttribute('href')){var h=el.getAttribute('href'); if(h && !/\\/proxy\\?url=/.test(h) && !/^\//.test(h)) el.setAttribute('href', prox(h));} if(el.hasAttribute('srcset')) rewriteSrcset(el); if(el.hasAttribute('style')) rewriteStyle(el);}Array.prototype.forEach.call(document.querySelectorAll('[src],[href],[srcset],[style]'), handle); var mo=new MutationObserver(function(muts){muts.forEach(function(m){if(m.type==='attributes'){var n=m.attributeName; if(n==='src'||n==='href') handle(m.target); if(n==='srcset') rewriteSrcset(m.target); if(n==='style') rewriteStyle(m.target);} else if(m.type==='childList'){m.addedNodes&&m.addedNodes.forEach(function(n){ if(n.nodeType===1) Array.prototype.forEach.call(n.querySelectorAll('[src],[href],[srcset],[style]'), handle);});}});}); mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','href','srcset','style']});}catch(_){}})();</script>`;
      if (/<\/body>/i.test(html)) {
        html = html.replace(/<\/body>/i, syncScript + assetScript + '\n</body>');
      } else {
        html = html + syncScript + assetScript;
      }
      
      res.set('Cache-Control', 'no-store');
      res.type('html').send(html);
    } else if (contentType.includes('text/css')) {
      // For CSS, rewrite url(...) to go through proxy with correct base resolution
      const cssBuffer = await response.arrayBuffer();
      let css = Buffer.from(cssBuffer).toString('utf8');
      const urlObj = new URL(targetUrl);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

      // url(https://...)
      css = css.replace(/url\(("|')?(https?:\/\/[^\)"']+)("|')?\)/gi, (_m, _qa, abs, _qb) => `url(/proxy?url=${encodeURIComponent(abs)})`);
      // url(//...)
      css = css.replace(/url\(("|')?\/\/([^\)"']+)("|')?\)/gi, (_m, _qa, rest, _qb) => `url(/proxy?url=${encodeURIComponent(urlObj.protocol + '//' + rest)})`);
      // url(/path)
      css = css.replace(/url\(("|')?(\/[^\)"']+)("|')?\)/gi, (_m, _qa, p, _qb) => `url(/proxy?url=${encodeURIComponent(baseUrl + p)})`);
      // url(relative)
      css = css.replace(/url\(("|')?([^:\/\)"'][^\)"']*)("|')?\)/gi, (_m, _qa, rel, _qb) => {
        if (!rel || rel.startsWith('data:') || rel.startsWith('#')) return `url(${rel})`;
        const resolved = new URL(rel, targetUrl).toString();
        return `url(/proxy?url=${encodeURIComponent(resolved)})`;
      });

      res.set('Cache-Control', 'no-store');
      res.set('Content-Type', 'text/css');
      res.send(css);
    } else {
      // For non-HTML (CSS, JS, images, etc), just proxy as-is
      const buffer = await response.arrayBuffer();
      res.set('Cache-Control', 'no-store');
      res.set('Content-Type', contentType);
      res.send(Buffer.from(buffer));
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('proxy error:', err);
    res.status(500).type('text/plain').send(`Proxy error: ${err && err.message ? err.message : String(err)}`);
  }
});

// Serve local files for LIVE iframe mode
// GET /fileview?path=<absolute path or file:// URL>
app.get('/fileview', async (req, res) => {
  try {
    const rawPath = String(req.query.path || '').trim();
    if (!rawPath) {
      res.status(400).type('text/plain').send('Missing path');
      return;
    }

    let absPath;
    if (/^file:\/\//i.test(rawPath)) {
      absPath = fileURLToPath(rawPath);
    } else {
      absPath = path.resolve(rawPath);
    }

    const exists = fs.existsSync(absPath);
    if (!exists) {
      res.status(404).type('text/plain').send('File not found');
      return;
    }

    const baseDir = path.dirname(absPath);
    const encodedBase = encodeURIComponent(baseDir);

    let html = await fs.promises.readFile(absPath, 'utf8');

    // Rewrite asset URLs so that:
    // - relative URLs → /filefs (serve from local _files folder)
    // - absolute http(s) URLs → /proxy?url=... (bypass CORP/CSP and referer issues)
    // Match: src|href|srcset
    html = html.replace(/(src|href|srcset)=("|')([^"']+)("|')/gi, (match, attr, quote1, value, quote2) => {
      // For srcset, handle comma-separated list of URLs with optional descriptors
      if (attr.toLowerCase() === 'srcset') {
        const sources = value.split(',').map(source => {
          const parts = source.trim().split(/\s+/);
          const url = parts[0];
          const descriptor = parts.slice(1).join(' ');
          
          // Absolute URLs → proxy
          if (/^(https?:\/\/|\/\/)/i.test(url)) {
            const absolute = url.startsWith('//') ? `http:${url}` : url;
            const proxied = `/proxy?url=${encodeURIComponent(absolute)}`;
            return descriptor ? `${proxied} ${descriptor}` : proxied;
          }

          // data: or anchors → leave as-is
          if (/^(data:|#)/i.test(url)) return source;
          
          // Skip absolute paths
          if (url.startsWith('/')) {
            return source;
          }
          
          // It's a relative path - resolve it
          const resolved = path.resolve(baseDir, url);
          const encodedResolved = encodeURIComponent(path.dirname(resolved));
          const filename = path.basename(resolved);
          const newUrl = `/filefs/${encodedResolved}/${filename}`;
          return descriptor ? `${newUrl} ${descriptor}` : newUrl;
        });
        return `${attr}=${quote1}${sources.join(', ')}${quote2}`;
      }
      
      // For src/href
      // Absolute URLs → proxy (except data: and anchors)
      if (/^(https?:\/\/|\/\/)/i.test(value)) {
        const absolute = value.startsWith('//') ? `http:${value}` : value;
        return `${attr}=${quote1}/proxy?url=${encodeURIComponent(absolute)}${quote2}`;
      }
      if (/^(data:|#)/i.test(value)) return match;
      
      // Skip absolute paths (starting with /)
      if (value.startsWith('/')) {
        return match;
      }
      
      // It's a relative path - resolve it
      const resolved = path.resolve(baseDir, value);
      const encodedResolved = encodeURIComponent(path.dirname(resolved));
      const filename = path.basename(resolved);
      return `${attr}=${quote1}/filefs/${encodedResolved}/${filename}${quote2}`;
    });

    // Rewrite url(...) inside inline style attributes to go through proxy for absolute URLs
    html = html.replace(/style=("|')(.*?)("|')/gi, (m, q1, content, q2) => {
      const rewritten = content.replace(/url\(("|')?(https?:\/\/[^\)"']+)("|')?\)/gi, (_m, _qa, abs, _qb) => {
        return `url(/proxy?url=${encodeURIComponent(abs)})`;
      }).replace(/url\(("|')?\/\/([^\)"']+)("|')?\)/gi, (_m, _qa, rest, _qb) => {
        const abs = `http://${rest}`;
        return `url(/proxy?url=${encodeURIComponent(abs)})`;
      });
      return `style=${q1}${rewritten}${q2}`;
    });

    // Inject <base> for any remaining relative URLs
    let transformed = html.replace(/<head[^>]*>/i, (m) => `${m}\n<base href="/filefs/${encodedBase}/" />`);
    if (transformed === html) {
      transformed = `<!doctype html>\n<html>\n<head><base href="/filefs/${encodedBase}/" /></head>\n<body>\n${html}\n</body>\n</html>`;
    }

    // Inject lightweight scroll-sync helper and dynamic asset rewrites for local files too
    const syncScript = `\n<script>(function(){try{var lastSent=0;window.addEventListener('message',function(e){var d=e&&e.data||{};if(d.type==='SYNC_SCROLL_BY'){window.scrollBy(0, d.dy||0);}else if(d.type==='SYNC_SCROLL_TO'){window.scrollTo(d.x||0,d.y||0);} },{passive:true});var raf;window.addEventListener('scroll',function(){if(raf)cancelAnimationFrame(raf);raf=requestAnimationFrame(function(){lastSent=Date.now();try{parent&&parent.postMessage({type:'SCROLL_POS',x:window.scrollX||0,y:window.scrollY||0},'*');}catch(_){}});},{passive:true});}catch(_){}})();</script>`;
    const assetScript = `\n<script>(function(){try{var BASE='${`/filefs/${encodedBase}/`}';function isAbs(u){return /^([a-z]+:)?\/\//i.test(u);}function toAbs(u){if(!u) return u;u=u.trim();if(/^data:|^#/.test(u)) return u; if(/^\/\//.test(u)) return location.protocol + u; if(isAbs(u)) return u; if(u[0]=='/') return (location.origin + u); return BASE + u;}function prox(u){var a=toAbs(u); if(!a) return u; if(/^https?:\/\//i.test(a)) return '/proxy?url=' + encodeURIComponent(a); return a;}function rewriteSrcset(el){var v=el.getAttribute('srcset'); if(!v) return; var out=v.split(',').map(function(s){s=s.trim(); var sp=s.split(/\s+/); var url=sp[0]; var rest=sp.slice(1).join(' '); var p=prox(url); return rest? (p+' '+rest): p;}).join(', '); el.setAttribute('srcset', out);}function rewriteStyle(el){var v=el.getAttribute('style'); if(!v) return; var out=v.replace(/url\\((\\"|')?([^\\)\\"']+)(\\"|')?\\)/g, function(_,q1,uri){return 'url(' + prox(uri) + ')';}); el.setAttribute('style', out);}function handle(el){if(!el||!el.tagName) return; if(el.hasAttribute('src')){var s=el.getAttribute('src'); if(s && !/\/proxy\?url=/.test(s)) el.setAttribute('src', prox(s)); } if(el.hasAttribute('href')){var h=el.getAttribute('href'); if(h && !/\/proxy\?url=/.test(h)) el.setAttribute('href', prox(h)); } if(el.hasAttribute('srcset')) rewriteSrcset(el); if(el.hasAttribute('style')) rewriteStyle(el);}Array.prototype.forEach.call(document.querySelectorAll('[src],[href],[srcset],[style]'), handle); var mo=new MutationObserver(function(muts){muts.forEach(function(m){if(m.type==='attributes'){var n=m.attributeName; if(n==='src'||n==='href') handle(m.target); if(n==='srcset') rewriteSrcset(m.target); if(n==='style') rewriteStyle(m.target);} else if(m.type==='childList'){m.addedNodes&&m.addedNodes.forEach(function(n){ if(n.nodeType===1) Array.prototype.forEach.call(n.querySelectorAll('[src],[href],[srcset],[style]'), handle);});}});}); mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','href','srcset','style']});}catch(_){}})();</script>`;
    if (/<\/body>/i.test(transformed)) {
      transformed = transformed.replace(/<\/body>/i, syncScript + assetScript + '\n</body>');
    } else {
      transformed = transformed + syncScript + assetScript;
    }


    res.set('Cache-Control', 'no-store');
    res.type('html').send(transformed);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('fileview error:', err);
    res.status(500).type('text/plain').send(`fileview error: ${err && err.message ? err.message : String(err)}`);
  }
});

// Static file proxy for assets referenced by /fileview HTML
// Example: /filefs/<encodedBase>/<relative-path>
app.get('/filefs/:encodedBase/*', async (req, res) => {
  try {
    const encodedBase = req.params.encodedBase;
    const relPath = req.params[0] || '';
    const baseDir = path.resolve(decodeURIComponent(encodedBase));
    const target = path.resolve(baseDir, relPath);
    if (!target.startsWith(baseDir)) {
      res.status(403).type('text/plain').send('Forbidden');
      return;
    }
    if (!fs.existsSync(target)) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    res.set('Cache-Control', 'no-store');
    if (target.toLowerCase().endsWith('.css')) {
      // Rewrite CSS url(...) to proxy for absolute URLs so images load
      let css = await fs.promises.readFile(target, 'utf8');
      // url(https://...)
      css = css.replace(/url\(("|')?(https?:\/\/[^\)"']+)("|')?\)/gi, (_m, _qa, abs, _qb) => `url(/proxy?url=${encodeURIComponent(abs)})`);
      // url(//...)
      css = css.replace(/url\(("|')?\/\/([^\)"']+)("|')?\)/gi, (_m, _qa, rest, _qb) => `url(/proxy?url=${encodeURIComponent('http://' + rest)})`);
      res.type('text/css').send(css);
      return;
    }
    res.sendFile(target);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('filefs error:', err);
    res.status(500).type('text/plain').send('filefs error');
  }
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Local Diff Viewer running on http://localhost:${PORT}`);
});

async function gracefulShutdown() {
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log('HTTP server closed');
  });
  if (browserInstance) {
    try { await browserInstance.close(); } catch (_) {}
    browserInstance = null;
  }
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);


