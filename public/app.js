(function () {
  const $ = (sel) => document.querySelector(sel);

  const url1 = $('#url1');
  const url2 = $('#url2');
  const width = $('#width');
  const widthSlider = $('#widthSlider');
  const widthValue = $('#widthValue');
  const dpr = $('#dpr');
  const wait = $('#wait');

  const renderMode = $('#renderMode');
  const compareMode = $('#compareMode');
  const overlayMode = $('#overlayMode');
  const opacity = $('#opacity');
  const swipe = $('#swipe');
  const offset1 = $('#offset1');
  const offset2 = $('#offset2');

  const refreshBtn = $('#refreshBtn');
  const toggleDrawer = $('#toggleDrawer');
  const controlsDrawer = $('#controlsDrawer');
  const closeDrawer = $('#closeDrawer');

  const overlayView = $('#overlayView');
  const overlayCanvas = $('#overlayCanvas');
  const wrap1 = $('#wrap1');
  const wrap2 = $('#wrap2');
  const img1 = $('#img1');
  const img2 = $('#img2');
  const iframe1 = $('#iframe1');
  const iframe2 = $('#iframe2');
  const swipeHandle = $('#swipeHandle');

  const sbsView = $('#sbsView');
  const sbs1 = $('#sbs1');
  const sbs2 = $('#sbs2');
  const sbsIframe1 = $('#sbsIframe1');
  const sbsIframe2 = $('#sbsIframe2');

  const overlayModeField = $('#overlayModeField');
  const opacityField = $('#opacityField');
  const swipeField = $('#swipeField');
  const notice = document.getElementById('notice');

  function readParams() {
    const p = new URLSearchParams(location.search);
    if (p.has('u1')) url1.value = p.get('u1');
    if (p.has('u2')) url2.value = p.get('u2');
    if (p.has('w')) width.value = p.get('w');
    if (p.has('dpr')) dpr.value = p.get('dpr');
    if (p.has('wait')) wait.value = p.get('wait');
    if (p.has('render')) renderMode.value = p.get('render');
    if (p.has('mode')) compareMode.value = p.get('mode');
    if (p.has('om')) overlayMode.value = p.get('om');
    if (p.has('opacity')) opacity.value = p.get('opacity');
    if (p.has('swipe')) swipe.value = p.get('swipe');
    if (p.has('off1')) offset1.value = p.get('off1');
    if (p.has('off2')) offset2.value = p.get('off2');
  }

  function writeParams() {
    const p = new URLSearchParams();
    if (url1.value) p.set('u1', url1.value);
    if (url2.value) p.set('u2', url2.value);
    p.set('w', width.value);
    p.set('dpr', dpr.value);
    if (Number(wait.value) > 0) p.set('wait', String(wait.value));
    p.set('render', renderMode.value);
    p.set('mode', compareMode.value);
    p.set('om', overlayMode.value);
    p.set('opacity', String(opacity.value));
    p.set('swipe', String(swipe.value));
    p.set('off1', String(offset1.value));
    p.set('off2', String(offset2.value));
    const newUrl = `${location.pathname}?${p.toString()}`;
    history.replaceState(null, '', newUrl);
  }

  function isFileUrl(u) {
    if (!u) return false;
    const t = String(u).trim();
    return /^file:\/\//i.test(t) || t.startsWith('/') || /^[a-zA-Z]:\\\\/.test(t);
  }

  function isHttpUrl(u) {
    if (!u) return false;
    return /^https?:\/\//i.test(String(u).trim());
  }

  function toLiveIframeSrc(u, mode) {
    if (!u) return '';
    if (isFileUrl(u)) {
      // Both iframe and proxy modes need /fileview for file:// URLs
      return `/fileview?path=${encodeURIComponent(u)}`;
    }
    if (mode === 'proxy' && isHttpUrl(u)) {
      return `/proxy?url=${encodeURIComponent(u)}`;
    }
    // For iframe mode with http URLs, use direct
    return u;
  }

  function showNotice(msg, isError = false) {
    if (!notice) return;
    notice.textContent = msg;
    notice.style.display = msg ? '' : 'none';
    notice.style.background = isError ? '#ffebee' : '#fff7cc';
    notice.style.color = isError ? '#c62828' : '#664c00';
    notice.style.borderColor = isError ? '#ef5350' : '#ffe58f';
  }

  // Health check on load
  async function checkServerHealth() {
    try {
      const response = await fetch('/health');
      if (!response.ok) {
        showNotice('⚠️ Server health check failed. Some features may not work.', true);
      }
    } catch (err) {
      showNotice('❌ Cannot connect to server. Please restart the application.', true);
    }
  }

  function buildShotUrl(u) {
    if (!u) return '';
    const p = new URLSearchParams();
    p.set('url', u);
    p.set('width', String(width.value || 1440));
    p.set('height', String(3000)); // Large height for full page capture
    p.set('dpr', String(dpr.value || 1));
    p.set('fullPage', '1'); // Always full page
    if (Number(wait.value) > 0) p.set('wait', String(wait.value));
    p.set('ts', String(Date.now()));
    return `/screenshot?${p.toString()}`;
  }

  function updateModeControls() {
    const isOverlay = compareMode.value === 'overlay';
    overlayModeField.style.display = isOverlay ? '' : 'none';
    overlayView.style.display = isOverlay ? '' : 'none';
    sbsView.style.display = isOverlay ? 'none' : '';

    const om = overlayMode.value;
    opacityField.style.display = isOverlay && om === 'onion' ? '' : 'none';
    swipeField.style.display = isOverlay && om === 'swipe' ? '' : 'none';

    overlayView.classList.toggle('mode-onion', isOverlay && om === 'onion');
    overlayView.classList.toggle('mode-swipe', isOverlay && om === 'swipe');
    overlayView.classList.toggle('mode-blend', isOverlay && om === 'blend');

    if (om === 'blend') {
      // ensure full opacity for accurate blend rendering
      img2.style.opacity = '1';
      swipeHandle.style.display = 'none';
    }
  }

  function updateOverlayStyles() {
    // onion opacity
    const op = Math.max(0, Math.min(100, Number(opacity.value) || 60)) / 100;
    overlayView.style.setProperty('--onion-opacity', String(op));
    // also set legacy/custom var used by some themes
    overlayView.style.setProperty('--opacity-value', String(op));
    // Apply directly to top wrapper for robust behavior
    if (overlayMode.value === 'onion') {
      wrap2.style.opacity = String(op);
    } else {
      wrap2.style.opacity = '';
    }

    // swipe percentage and handle
    const sw = Math.max(0, Math.min(100, Number(swipe.value) || 50));
    overlayView.style.setProperty('--swipe', `${sw}%`);
    // also set legacy/custom var used by some themes
    overlayView.style.setProperty('--swipe-value', `${sw}%`);
    if (overlayMode.value === 'swipe') {
      swipeHandle.style.left = `${sw}%`;
      swipeHandle.style.display = '';
    } else {
      swipeHandle.style.display = 'none';
    }

    // vertical offsets
    const o1 = Number(offset1.value) || 0;
    const o2 = Number(offset2.value) || 0;
    wrap1.style.transform = `translateY(${o1}px)`;
    wrap2.style.transform = `translateY(${o2}px)`;
  }

  function render() {
    writeParams();
    updateModeControls();
    updateOverlayStyles();

    // Set viewport width CSS variable
    const viewportWidth = width.value || 1440;
    document.documentElement.style.setProperty('--viewport-width', `${viewportWidth}px`);

    const u1 = url1.value.trim();
    const u2 = url2.value.trim();
    const mode = renderMode.value; // 'iframe', 'proxy', or 'screenshot'
    const useIframe = mode === 'iframe' || mode === 'proxy';
    
    // Clear any previous notices
    showNotice('');

    if (compareMode.value === 'overlay') {
      if (useIframe) {
        // Show iframes, hide images
        img1.style.display = 'none';
        img2.style.display = 'none';
        iframe1.style.display = 'block';
        iframe2.style.display = 'block';
        
        // Allow internal scrolling (better for animations/parallax in pages)
        iframe1.setAttribute('scrolling', 'auto');
        iframe2.setAttribute('scrolling', 'auto');
        
        const src1 = toLiveIframeSrc(u1, mode) || 'about:blank';
        const src2 = toLiveIframeSrc(u2, mode) || 'about:blank';
        
        // Add error handlers
        iframe1.onerror = () => showNotice(`❌ Failed to load: ${u1}`, true);
        iframe2.onerror = () => showNotice(`❌ Failed to load: ${u2}`, true);
        
        iframe1.src = src1;
        iframe2.src = src2;
      } else {
        // Show images (screenshots), hide iframes
        iframe1.style.display = 'none';
        iframe2.style.display = 'none';
        img1.style.display = 'block';
        img2.style.display = 'block';
        const src1 = buildShotUrl(u1);
        const src2 = buildShotUrl(u2);
        
        // Add error handlers for screenshots
        img1.onerror = () => showNotice(`❌ Screenshot failed for: ${u1}. Server may be down.`, true);
        img2.onerror = () => showNotice(`❌ Screenshot failed for: ${u2}. Server may be down.`, true);
        
        img1.src = u1 ? src1 : '';
        img2.src = u2 ? src2 : '';
      }
    } else {
      // Side-by-side
      if (useIframe) {
        sbs1.style.display = 'none';
        sbs2.style.display = 'none';
        sbsIframe1.style.display = 'block';
        sbsIframe2.style.display = 'block';
        
        // Enable iframe internal scrolling for side-by-side mode
        sbsIframe1.setAttribute('scrolling', 'auto');
        sbsIframe2.setAttribute('scrolling', 'auto');
        
        const src1 = toLiveIframeSrc(u1, mode) || 'about:blank';
        const src2 = toLiveIframeSrc(u2, mode) || 'about:blank';
        
        // Add error handlers
        sbsIframe1.onerror = () => showNotice(`❌ Failed to load: ${u1}`, true);
        sbsIframe2.onerror = () => showNotice(`❌ Failed to load: ${u2}`, true);
        
        sbsIframe1.src = src1;
        sbsIframe2.src = src2;
      } else {
        sbsIframe1.style.display = 'none';
        sbsIframe2.style.display = 'none';
        sbs1.style.display = 'block';
        sbs2.style.display = 'block';
        const src1 = buildShotUrl(u1);
        const src2 = buildShotUrl(u2);
        
        // Add error handlers for screenshots
        sbs1.onerror = () => showNotice(`❌ Screenshot failed for: ${u1}. Server may be down.`, true);
        sbs2.onerror = () => showNotice(`❌ Screenshot failed for: ${u2}. Server may be down.`, true);
        
        sbs1.src = u1 ? src1 : '';
        sbs2.src = u2 ? src2 : '';
      }
    }
    
    // Setup synchronized scrolling
    setupSyncScroll();
  }
  
  let syncScrollEnabled = true;
  let scrollTimeout = null;
  
  function setupSyncScroll() {
    if (compareMode.value === 'sbs') {
      // Side-by-side scrolling
      const col1 = sbsView.querySelector('.sbs-col:first-child');
      const col2 = sbsView.querySelector('.sbs-col:last-child');
      
      if (!col1 || !col2) return;
      
      function syncScroll1(e) {
        if (!syncScrollEnabled) return;
        syncScrollEnabled = false;
        
        requestAnimationFrame(() => {
          col2.scrollTop = col1.scrollTop;
          col2.scrollLeft = col1.scrollLeft;
        });
        
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => syncScrollEnabled = true, 50);
      }
      
      function syncScroll2(e) {
        if (!syncScrollEnabled) return;
        syncScrollEnabled = false;
        
        requestAnimationFrame(() => {
          col1.scrollTop = col2.scrollTop;
          col1.scrollLeft = col2.scrollLeft;
        });
        
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => syncScrollEnabled = true, 50);
      }
      
      col1.removeEventListener('scroll', syncScroll1);
      col2.removeEventListener('scroll', syncScroll2);
      col1.addEventListener('scroll', syncScroll1, { passive: true });
      col2.addEventListener('scroll', syncScroll2, { passive: true });
    } else if (compareMode.value === 'overlay') {
      // Overlay: drive both iframes by messaging so their own scroll events/animations run
      const mode = renderMode.value;
      const useIframe = mode === 'iframe' || mode === 'proxy';
      
      if (useIframe) {
        // Wheel/touch on overlayView -> send scroll-by to both iframes
        function onWheel(e) {
          if (!iframe1.contentWindow || !iframe2.contentWindow) return;
          e.preventDefault();
          const dy = e.deltaY || 0;
          try { iframe1.contentWindow.postMessage({ type: 'SYNC_SCROLL_BY', dy }, '*'); } catch (_) {}
          try { iframe2.contentWindow.postMessage({ type: 'SYNC_SCROLL_BY', dy }, '*'); } catch (_) {}
        }
        overlayView.removeEventListener('wheel', onWheel, { passive: false });
        overlayView.addEventListener('wheel', onWheel, { passive: false });

        // When one iframe scrolls (emits SCROLL_POS), forward to the other to keep aligned
        function onMessage(e) {
          const d = e && e.data || {};
          if (d && d.type === 'SCROLL_POS') {
            try { if (iframe1.contentWindow !== e.source) iframe1.contentWindow.postMessage({ type: 'SYNC_SCROLL_TO', x: d.x, y: d.y }, '*'); } catch (_) {}
            try { if (iframe2.contentWindow !== e.source) iframe2.contentWindow.postMessage({ type: 'SYNC_SCROLL_TO', x: d.x, y: d.y }, '*'); } catch (_) {}
          }
        }
        window.removeEventListener('message', onMessage);
        window.addEventListener('message', onMessage);
        
        // Wait for iframes to load and set their heights to match content
        function getDocHeight(iframeEl) {
          try {
            if (!iframeEl || !iframeEl.contentWindow) return 0;
            const d = iframeEl.contentWindow.document;
            if (!d) return 0;
            return Math.max(
              d.documentElement ? d.documentElement.scrollHeight : 0,
              d.documentElement ? d.documentElement.offsetHeight : 0,
              d.body ? d.body.scrollHeight : 0,
              d.body ? d.body.offsetHeight : 0
            );
          } catch (_) {
            return 0; // cross-origin or not ready
          }
        }

        // Temporarily disabled infinite scroll - just use viewport height
        // This lets hero animations/lazy-loading work naturally
        iframe1.style.height = '100vh';
        iframe2.style.height = '100vh';
        overlayCanvas.style.height = '100vh';
        wrap1.style.height = '100vh';
        wrap2.style.height = '100vh';
      }
    }
  }

  function attachEvents() {
    let renderTimer = null;
    const requestRender = () => { if (renderTimer) clearTimeout(renderTimer); renderTimer = setTimeout(() => render(), 120); };
    [url1, url2, width, dpr, wait, renderMode, compareMode, overlayMode, opacity, swipe, offset1, offset2]
      .forEach((el) => el.addEventListener('change', requestRender));
    [url1, url2, width, dpr, wait, renderMode, compareMode, overlayMode, opacity, swipe, offset1, offset2]
      .forEach((el) => el.addEventListener('input', requestRender));
    [opacity, swipe].forEach((el) => el.addEventListener('input', () => { updateOverlayStyles(); }));
    refreshBtn.addEventListener('click', (e) => { e.preventDefault(); requestRender(); });

    // Drawer toggle (burger/close)
    function updateDrawerButton() {
      const isOpen = !controlsDrawer.classList.contains('collapsed');
      toggleDrawer.textContent = isOpen ? '×' : '☰';
      toggleDrawer.setAttribute('aria-expanded', String(isOpen));
      toggleDrawer.title = isOpen ? 'Close Controls' : 'Open Controls';
      if (closeDrawer) closeDrawer.style.display = 'none';
    }
    toggleDrawer.addEventListener('click', () => {
      controlsDrawer.classList.toggle('collapsed');
      updateDrawerButton();
    });
    if (closeDrawer) {
      closeDrawer.addEventListener('click', () => {
        controlsDrawer.classList.add('collapsed');
        updateDrawerButton();
      });
    }
    // initialize
    updateDrawerButton();

    // Width slider sync
    widthSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      width.value = val;
      widthValue.textContent = val;
    });
    width.addEventListener('input', (e) => {
      const val = e.target.value;
      widthSlider.value = val;
      widthValue.textContent = val;
    });

    // Auto-close drawer on mouse leave (with small delay to avoid flicker)
    let leaveTimer = null;
    controlsDrawer.addEventListener('mouseleave', () => {
      if (leaveTimer) clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => {
        if (!controlsDrawer.classList.contains('collapsed')) {
          controlsDrawer.classList.add('collapsed');
          updateDrawerButton();
        }
      }, 400);
    });
    controlsDrawer.addEventListener('mouseenter', () => { if (leaveTimer) clearTimeout(leaveTimer); });

    // Dragging the swipe handle
    let dragging = false;
    function setSwipeByClientX(clientX) {
      const rect = overlayCanvas.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      swipe.value = String(Math.round(pct * 100));
      updateOverlayStyles();
    }
    swipeHandle.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
    window.addEventListener('mousemove', (e) => { if (!dragging) return; setSwipeByClientX(e.clientX); });
    window.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; writeParams(); });

    // Touch support
    swipeHandle.addEventListener('touchstart', (e) => { dragging = true; e.preventDefault(); });
    window.addEventListener('touchmove', (e) => { if (!dragging) return; const t = e.touches[0]; setSwipeByClientX(t.clientX); });
    window.addEventListener('touchend', () => { if (!dragging) return; dragging = false; writeParams(); });
  }

  // Initialize
  readParams();
  
  // Sync width slider with width input on load
  widthSlider.value = width.value;
  widthValue.textContent = width.value;
  
  attachEvents();
  checkServerHealth();
  render();
})();


