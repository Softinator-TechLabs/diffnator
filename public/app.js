(function () {
  const $ = (sel) => document.querySelector(sel);

  const url1 = $('#url1');
  const url2 = $('#url2');
  const width = $('#width');
  const widthSlider = $('#widthSlider');
  const widthValue = $('#widthValue');
  const dpr = $('#dpr');
  const wait = $('#wait');

  const renderModeA = $('#renderModeA');
  const renderModeB = $('#renderModeB');
  const compareMode = $('#compareMode');
  const overlayMode = $('#overlayMode');
  const opacity = $('#opacity');
  const swipe = $('#swipe');
  const offset1 = $('#offset1');
  const offset2 = $('#offset2');
  // Optional deep-link only: CSS selectors to start from
  let startSel1 = '';
  let startSel2 = '';
  const interactMode = $('#interactMode');

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
  const video1 = $('#video1');
  const video2 = $('#video2');
  const iframe1 = $('#iframe1');
  const iframe2 = $('#iframe2');
  const swipeHandle = $('#swipeHandle');
  // Inline offset controls
  const offsetCtrlA = $('#offsetCtrlA');
  const offsetCtrlB = $('#offsetCtrlB');
  const offsetAUp = $('#offsetAUp');
  const offsetADown = $('#offsetADown');
  const offsetBUp = $('#offsetBUp');
  const offsetBDown = $('#offsetBDown');
  const offsetAVal = $('#offsetAVal');
  const offsetBVal = $('#offsetBVal');
  // New: horizontal/zoom controls
  const hoffALeft = $('#hoffALeft');
  const hoffARight = $('#hoffARight');
  const hoffBLeft = $('#hoffBLeft');
  const hoffBRight = $('#hoffBRight');
  const zoomAIn = $('#zoomAIn');
  const zoomAOut = $('#zoomAOut');
  const zoomBIn = $('#zoomBIn');
  const zoomBOut = $('#zoomBOut');
  const zoomAVal = $('#zoomAVal');
  const zoomBVal = $('#zoomBVal');

  const sbsView = $('#sbsView');
  const sbs1 = $('#sbs1');
  const sbs2 = $('#sbs2');
  const sbsIframe1 = $('#sbsIframe1');
  const sbsIframe2 = $('#sbsIframe2');

  const overlayModeField = $('#overlayModeField');
  const opacityField = $('#opacityField');
  const swipeField = $('#swipeField');
  const interactField = $('#interactField');
  const ctabHelp = $('#ctabHelp');
  const notice = document.getElementById('notice');
  // Upload inputs
  const uploadA = $('#uploadA');
  const uploadB = $('#uploadB');
  const clearUploadA = $('#clearUploadA');
  const clearUploadB = $('#clearUploadB');

  // Virtual scroll offset used for overlay + screenshot mode
  let screenshotScrollY = 0;
  let overlayWheelHandler = null;
  let overlayMessageHandler = null;
  let lastOverlayForwardAt = 0;
  let lastPosA = { x: 0, y: 0 };
  let lastPosB = { x: 0, y: 0 };
  // Upload state and transforms
  let useUploadA = false;
  let useUploadB = false;
  let uploadUrlA = '';
  let uploadUrlB = '';
  let hOffset1 = 0; // horizontal px for A
  let hOffset2 = 0; // horizontal px for B
  let zoom1 = 1; // scale for A
  let zoom2 = 1; // scale for B
  // Drag state for image alignment
  let dragState = { active: false, side: null, startX: 0, startY: 0, baseHX: 0, baseV: 0 };
  let dragStartA = null, dragStartB = null, dragMove = null, dragEnd = null;
  let ctabTimer = null;
  let ctabLastA = null;
  let ctabLastB = null;
  let pcA = null, pcB = null;

  function readParams() {
    const p = new URLSearchParams(location.search);
    if (p.has('u1')) url1.value = p.get('u1');
    if (p.has('u2')) url2.value = p.get('u2');
    if (p.has('w')) width.value = p.get('w');
    if (p.has('dpr')) dpr.value = p.get('dpr');
    if (p.has('wait')) wait.value = p.get('wait');
    // Per-side render modes, backward compatible with legacy 'render'
    if (p.has('ra')) { const v = p.get('ra'); if (renderModeA) renderModeA.value = v; }
    if (p.has('rb')) { const v = p.get('rb'); if (renderModeB) renderModeB.value = v; }
    if (!p.has('ra') && !p.has('rb') && p.has('render')) {
      const v = p.get('render');
      if (renderModeA) renderModeA.value = v;
      if (renderModeB) renderModeB.value = v;
    }
    if (p.has('mode')) compareMode.value = p.get('mode');
    if (p.has('om')) overlayMode.value = p.get('om');
    if (p.has('opacity')) opacity.value = p.get('opacity');
    if (p.has('swipe')) swipe.value = p.get('swipe');
    if (p.has('off1')) offset1.value = p.get('off1');
    if (p.has('off2')) offset2.value = p.get('off2');
    if (p.has('hx1')) hOffset1 = Number(p.get('hx1')) || 0;
    if (p.has('hx2')) hOffset2 = Number(p.get('hx2')) || 0;
    if (p.has('z1')) zoom1 = Math.max(0.1, Math.min(4, Number(p.get('z1')) || 1));
    if (p.has('z2')) zoom2 = Math.max(0.1, Math.min(4, Number(p.get('z2')) || 1));
    // Optional deep link: start at CSS selector for each URL
    if (p.has('sa')) startSel1 = p.get('sa') || '';
    if (p.has('sb')) startSel2 = p.get('sb') || '';
    if (interactMode) {
      const ioParam = p.get('io');
      if (ioParam) {
        const val = ioParam === '1' ? 'a' : ioParam; // backward compat for old boolean
        interactMode.value = (val === 'a' || val === 'b' || val === 'none') ? val : 'a';
      } else {
        interactMode.value = 'a'; // default to URL A
      }
    }
  }

  function writeParams() {
    const p = new URLSearchParams();
    if (url1.value) p.set('u1', url1.value);
    if (url2.value) p.set('u2', url2.value);
    p.set('w', width.value);
    p.set('dpr', dpr.value);
    if (Number(wait.value) > 0) p.set('wait', String(wait.value));
    if (renderModeA) p.set('ra', renderModeA.value);
    if (renderModeB) p.set('rb', renderModeB.value);
    p.set('mode', compareMode.value);
    p.set('om', overlayMode.value);
    p.set('opacity', String(opacity.value));
    p.set('swipe', String(swipe.value));
    p.set('off1', String(offset1.value));
    p.set('off2', String(offset2.value));
    p.set('hx1', String(hOffset1));
    p.set('hx2', String(hOffset2));
    p.set('z1', String(Number(zoom1.toFixed(2))));
    p.set('z2', String(Number(zoom2.toFixed(2))));
    if (interactMode) p.set('io', interactMode.value);
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
    const bothIframes = (renderModeA && renderModeB) &&
      ((renderModeA.value === 'iframe' || renderModeA.value === 'proxy') && (renderModeB.value === 'iframe' || renderModeB.value === 'proxy'));
    overlayModeField.style.display = isOverlay ? '' : 'none';
    overlayView.style.display = isOverlay ? '' : 'none';
    sbsView.style.display = isOverlay ? 'none' : '';

    const om = overlayMode.value;
    opacityField.style.display = isOverlay && om === 'onion' ? '' : 'none';
    swipeField.style.display = isOverlay && om === 'swipe' ? '' : 'none';
    if (interactField) interactField.style.display = isOverlay && bothIframes ? '' : 'none';
    if (ctabHelp) ctabHelp.style.display = ((renderModeA && renderModeA.value === 'ctab') || (renderModeB && renderModeB.value === 'ctab')) ? '' : 'none';
    // Toggle inline offset controls
    if (offsetCtrlA && offsetCtrlB) {
      offsetCtrlA.style.display = isOverlay ? '' : 'none';
      offsetCtrlB.style.display = isOverlay ? '' : 'none';
    }

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

    // vertical offsets: apply as visual transforms so sync remains intact
    const o1 = Number(offset1.value) || 0;
    const o2 = Number(offset2.value) || 0;
    const isOverlayMode = compareMode.value === 'overlay';
    const ra = renderModeA ? renderModeA.value : 'proxy';
    const rb = renderModeB ? renderModeB.value : 'proxy';
    const sideAIsImage = isOverlayMode && ((ra === 'screenshot' || ra === 'ctab') || useUploadA);
    const sideBIsImage = isOverlayMode && ((rb === 'screenshot' || rb === 'ctab') || useUploadB);
    const syA = sideAIsImage ? -screenshotScrollY : 0;
    const syB = sideBIsImage ? -screenshotScrollY : 0;
    const dx1 = sideAIsImage ? (Number(hOffset1) || 0) : 0;
    const dx2 = sideBIsImage ? (Number(hOffset2) || 0) : 0;
    const zf1 = sideAIsImage ? (Number(zoom1) || 1) : 1;
    const zf2 = sideBIsImage ? (Number(zoom2) || 1) : 1;
    wrap1.style.transform = `translate(${dx1}px, ${o1 + syA}px) scale(${zf1})`;
    wrap2.style.transform = `translate(${dx2}px, ${o2 + syB}px) scale(${zf2})`;
    if (offsetAVal) offsetAVal.textContent = `${o1} px`;
    if (offsetBVal) offsetBVal.textContent = `${o2} px`;
    if (zoomAVal) zoomAVal.textContent = `${(zf1 * 100).toFixed(2)}%`;
    if (zoomBVal) zoomBVal.textContent = `${(zf2 * 100).toFixed(2)}%`;

    // Keep Chrome Tab capture constraints in sync with viewport
    try {
      const viewportH = overlayCanvas ? overlayCanvas.clientHeight : window.innerHeight;
      const viewportW = parseInt(width.value || '1440', 10) || 1440;
      if (renderModeA && renderModeA.value === 'ctab') {
        fetch('/api/extension/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ side: 'a', type: 'SET_CONSTRAINTS', w: viewportW, h: viewportH, fps: 15 }) }).catch(() => {});
      }
      if (renderModeB && renderModeB.value === 'ctab') {
        fetch('/api/extension/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ side: 'b', type: 'SET_CONSTRAINTS', w: viewportW, h: viewportH, fps: 15 }) }).catch(() => {});
      }
    } catch (_) {}
  }

  // Apply initial starting positions inside iframes
  // This happens once on load; sync stays active after
  function applyInitialStarts() {
    // Only apply selector start jumps here; visual offsets handled by CSS transforms
    const o1 = Number(offset1.value) || 0;
    const o2 = Number(offset2.value) || 0;

    const mode = compareMode.value;
    const isOverlay = mode === 'overlay';
    const win1 = isOverlay ? iframe1 : sbsIframe1;
    const win2 = isOverlay ? iframe2 : sbsIframe2;

    // Resolve interactive target (leader) for overlay; follower will sync from messages
    const ioVal = interactMode ? interactMode.value : 'a';
    const interactive = isOverlay && ioVal !== 'none';

    // Helper send functions with logging
    const sendTo = (win, msg, label) => { 
      console.log(`[Offset] Sending to ${label}:`, msg);
      try { 
        if (win && win.contentWindow) {
          win.contentWindow.postMessage(msg, '*');
          console.log(`[Offset] Message sent to ${label}`);
        } else {
          console.warn(`[Offset] Cannot send to ${label}: iframe or contentWindow not ready`);
        }
      } catch(e) {
        console.error(`[Offset] Error sending to ${label}:`, e);
      }
    };

    // Only handle selectors here; offsets are visual transforms (updateOverlayStyles)
    if (interactive) {
      const leaderWin = ioVal === 'a' ? win1 : win2;
      const sel = ioVal === 'a' ? startSel1 : startSel2;
      if (sel) sendTo(leaderWin, { type: 'SCROLL_TO_SELECTOR', selector: sel, offset: ioVal === 'a' ? o1 : o2 }, 'leader (selector)');
    } else {
      if (startSel1) sendTo(win1, { type: 'SCROLL_TO_SELECTOR', selector: startSel1, offset: o1 }, 'URL A (selector)');
      if (startSel2) sendTo(win2, { type: 'SCROLL_TO_SELECTOR', selector: startSel2, offset: o2 }, 'URL B (selector)');
    }
  }

  function render() {
    writeParams();
    updateModeControls();
    updateOverlayStyles();
    // Apply overlay interactivity setting
    const ioVal = interactMode ? interactMode.value : 'a';
    overlayView.classList.remove('io-none', 'io-a', 'io-b');
    overlayView.classList.add(`io-${ioVal}`);

    // Set viewport width CSS variable
    const viewportWidth = width.value || 1440;
    document.documentElement.style.setProperty('--viewport-width', `${viewportWidth}px`);

    const u1 = url1.value.trim();
    const u2 = url2.value.trim();
    const renderA = renderModeA ? renderModeA.value : 'proxy';
    const renderB = renderModeB ? renderModeB.value : 'proxy';
    
    // Clear any previous notices
    showNotice('');

    if (compareMode.value === 'overlay') {
      // Decide per-side representation (image vs iframe)
      const sideAAsImage = (renderA === 'screenshot' || renderA === 'ctab') || useUploadA;
      const sideBAsImage = (renderB === 'screenshot' || renderB === 'ctab') || useUploadB;

      // Display toggles
      // Decide between video (ctab live), img (screenshot/upload), or iframe
      const sideAAsVideo = (renderA === 'ctab');
      const sideBAsVideo = (renderB === 'ctab');
      if (video1) video1.style.display = sideAAsVideo ? 'block' : 'none';
      if (video2) video2.style.display = sideBAsVideo ? 'block' : 'none';
      img1.style.display = (!sideAAsVideo && sideAAsImage) ? 'block' : 'none';
      iframe1.style.display = (!sideAAsVideo && !sideAAsImage) ? 'block' : 'none';
      img2.style.display = (!sideBAsVideo && sideBAsImage) ? 'block' : 'none';
      iframe2.style.display = (!sideBAsVideo && !sideBAsImage) ? 'block' : 'none';

      // Set sizes
      overlayCanvas.style.height = '100vh';
      wrap1.style.height = '100vh';
      wrap2.style.height = '100vh';

      // Sources per side
      if (sideAAsImage && !sideAAsVideo) {
        if (useUploadA && uploadUrlA) {
          img1.onerror = null;
          img1.onload = () => updateOverlayStyles();
          img1.src = uploadUrlA;
        } else {
          const srcA = renderA === 'ctab' ? null : buildShotUrl(u1);
          img1.onerror = () => showNotice(`❌ Screenshot failed for: ${u1}. Server may be down.`, true);
          img1.onload = () => updateOverlayStyles();
          img1.src = renderA === 'ctab' ? '' : (u1 ? srcA : '');
        }
      } else {
        iframe1.setAttribute('scrolling', 'auto');
        const srcA = toLiveIframeSrc(u1, renderA) || 'about:blank';
        iframe1.onerror = () => showNotice(`❌ Failed to load: ${u1}`, true);
        iframe1.onload = () => { /* noop */ };
        iframe1.src = srcA;
      }

      if (sideBAsImage && !sideBAsVideo) {
        if (useUploadB && uploadUrlB) {
          img2.onerror = null;
          img2.onload = () => updateOverlayStyles();
          img2.src = uploadUrlB;
        } else {
          const srcB = renderB === 'ctab' ? null : buildShotUrl(u2);
          img2.onerror = () => showNotice(`❌ Screenshot failed for: ${u2}. Server may be down.`, true);
          img2.onload = () => updateOverlayStyles();
          img2.src = renderB === 'ctab' ? '' : (u2 ? srcB : '');
        }
      } else {
        iframe2.setAttribute('scrolling', 'auto');
        const srcB = toLiveIframeSrc(u2, renderB) || 'about:blank';
        iframe2.onerror = () => showNotice(`❌ Failed to load: ${u2}`, true);
        iframe2.onload = () => { /* noop */ };
        iframe2.src = srcB;
      }

      // Reset virtual scroll when images are involved
      if (sideAAsImage || sideBAsImage) {
        screenshotScrollY = 0;
        updateOverlayStyles();
      }

      // Toggle horizontal/zoom controls visibility based on images presence
      const hzA = offsetCtrlA ? offsetCtrlA.querySelector('.hz-controls') : null;
      const hzB = offsetCtrlB ? offsetCtrlB.querySelector('.hz-controls') : null;
      if (hzA) hzA.style.display = sideAAsImage ? '' : 'none';
      if (hzB) hzB.style.display = sideBAsImage ? '' : 'none';

      // Attach drag to images to adjust offsets (only when side is image)
      function setupDragForSide(which, enabled) {
        const imgEl = which === 'a' ? img1 : img2;
        if (!imgEl) return;
        // prevent default browser drag image ghost
        imgEl.addEventListener('dragstart', (ev) => { ev.preventDefault(); });
        const startHandler = (ev) => {
          if (!enabled) return;
          ev.preventDefault();
          const isTouch = ev.type === 'touchstart';
          const pt = isTouch ? ev.touches[0] : ev;
          dragState.active = true;
          dragState.side = which;
          dragState.startX = pt.clientX;
          dragState.startY = pt.clientY;
          dragState.baseHX = which === 'a' ? (Number(hOffset1) || 0) : (Number(hOffset2) || 0);
          dragState.baseV = which === 'a' ? (Number(offset1.value) || 0) : (Number(offset2.value) || 0);
          document.body.style.cursor = 'grabbing';
        };
        const moveHandler = (ev) => {
          if (!dragState.active) return;
          const isTouch = ev.type === 'touchmove';
          const pt = isTouch ? ev.touches[0] : ev;
          const dx = pt.clientX - dragState.startX;
          const dy = pt.clientY - dragState.startY;
          if (dragState.side === 'a') {
            hOffset1 = dragState.baseHX + dx;
            offset1.value = String(dragState.baseV + dy);
          } else {
            hOffset2 = dragState.baseHX + dx;
            offset2.value = String(dragState.baseV + dy);
          }
          updateOverlayStyles();
        };
        const endHandler = () => {
          if (!dragState.active) return;
          dragState.active = false;
          dragState.side = null;
          document.body.style.cursor = '';
          writeParams();
        };
        // Remove previous listeners if any
        if (which === 'a' && dragStartA) {
          img1.removeEventListener('mousedown', dragStartA);
          img1.removeEventListener('touchstart', dragStartA);
        }
        if (which === 'b' && dragStartB) {
          img2.removeEventListener('mousedown', dragStartB);
          img2.removeEventListener('touchstart', dragStartB);
        }
        // Set new handlers and attach
        if (which === 'a') dragStartA = startHandler; else dragStartB = startHandler;
        imgEl.addEventListener('mousedown', startHandler);
        imgEl.addEventListener('touchstart', startHandler, { passive: false });
        if (dragMove) {
          window.removeEventListener('mousemove', dragMove);
          window.removeEventListener('touchmove', dragMove);
        }
        if (dragEnd) {
          window.removeEventListener('mouseup', dragEnd);
          window.removeEventListener('mouseleave', dragEnd);
          window.removeEventListener('touchend', dragEnd);
          window.removeEventListener('touchcancel', dragEnd);
        }
        dragMove = moveHandler;
        dragEnd = endHandler;
        window.addEventListener('mousemove', moveHandler);
        window.addEventListener('touchmove', moveHandler, { passive: false });
        window.addEventListener('mouseup', endHandler);
        window.addEventListener('mouseleave', endHandler);
        window.addEventListener('touchend', endHandler);
        window.addEventListener('touchcancel', endHandler);
      }

      setupDragForSide('a', !!sideAAsImage);
      setupDragForSide('b', !!sideBAsImage);

      // Start/stop Chrome Tab live: WebRTC offer from page; extension answers
      async function startCtabReceiver(which) {
        try {
          console.log(`[DiffNator] Starting Chrome Tab receiver for side ${which}`);
          const pc = new RTCPeerConnection({ iceServers: [] });
          const vEl = which === 'a' ? video1 : video2;
          pc.ontrack = (ev) => { 
            console.log(`[DiffNator] Received track for side ${which}`, ev.streams[0]);
            if (vEl) {
              vEl.srcObject = ev.streams[0];
              vEl.play().catch(e => console.error('Video play error:', e));
            }
          };
          pc.addTransceiver('video', { direction: 'recvonly' });
          pc.onicecandidate = (ev) => {
            if (ev && ev.candidate) {
              console.log(`[DiffNator] Sending ICE candidate for side ${which}`);
              fetch('/api/ctab/candidate', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ side: which, from: 'page', candidate: ev.candidate })
              }).catch(() => {});
            }
          };
          pc.onconnectionstatechange = () => {
            console.log(`[DiffNator] Connection state for side ${which}: ${pc.connectionState}`);
          };
          const off = await pc.createOffer({ offerToReceiveVideo: true });
          await pc.setLocalDescription(off);
          console.log(`[DiffNator] Created offer for side ${which}, posting to server`);
          await fetch('/api/ctab/offer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ side: which, sdp: off.sdp }) });
          // poll answer
          let tries = 0;
          const pollAns = async () => {
            const r = await fetch(`/api/ctab/answer?side=${which}`).then((x) => x.json()).catch(() => null);
            if (r && r.ok && r.sdp) {
              console.log(`[DiffNator] Received answer for side ${which}`);
              await pc.setRemoteDescription({ type: 'answer', sdp: r.sdp });
              return true;
            }
            return false;
          };
          while (tries < 20) { 
            if (await pollAns()) break; 
            await new Promise(r => setTimeout(r, 500)); 
            tries++; 
          }
          if (tries >= 20) {
            console.warn(`[DiffNator] No answer received for side ${which} after 20 tries. Extension may not be running or tab not captured.`);
            showNotice(`⚠️ Chrome Tab ${which.toUpperCase()}: No response from extension. Make sure extension is installed and you clicked "Capture URL ${which.toUpperCase()}" on the target tab.`, true);
          }
          // start polling for ext ICE candidates
          const candTimer = setInterval(async () => {
            try {
              const rr = await fetch(`/api/ctab/candidate?side=${which}&to=page`).then((x) => x.json()).catch(() => null);
              if (rr && rr.ok && Array.isArray(rr.candidates)) {
                for (const c of rr.candidates) {
                  try { await pc.addIceCandidate(c); } catch (_) {}
                }
              }
            } catch (_) {}
          }, 600);
          pc.addEventListener('connectionstatechange', () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
              clearInterval(candTimer);
            }
          });
          return pc;
        } catch (e) { 
          console.error(`[DiffNator] Error starting Chrome Tab receiver for side ${which}:`, e);
          return null; 
        }
      }

      if (renderA === 'ctab') { if (pcA) { try { pcA.close(); } catch (_) {} } pcA = null; startCtabReceiver('a').then((pc) => pcA = pc); }
      else { if (pcA) { try { pcA.close(); } catch (_) {} pcA = null; if (video1) video1.srcObject = null; } }

      if (renderB === 'ctab') { if (pcB) { try { pcB.close(); } catch (_) {} } pcB = null; startCtabReceiver('b').then((pc) => pcB = pc); }
      else { if (pcB) { try { pcB.close(); } catch (_) {} pcB = null; if (video2) video2.srcObject = null; } }

      // Fallback still-capture polling for ctab if WebRTC not connected
      if (renderA === 'ctab' || renderB === 'ctab') {
        if (ctabTimer) clearInterval(ctabTimer);
        const poll = async () => {
          try {
            const a = await fetch('/api/extension/latest?side=a').then(r => r.json()).catch(() => null);
            const b = await fetch('/api/extension/latest?side=b').then(r => r.json()).catch(() => null);
            if (a && a.ok && a.path && a.path !== ctabLastA) {
              ctabLastA = a.path;
              if (img1 && img1.style.display !== 'none') img1.src = a.path + `?ts=${Date.now()}`;
            }
            if (b && b.ok && b.path && b.path !== ctabLastB) {
              ctabLastB = b.path;
              if (img2 && img2.style.display !== 'none') img2.src = b.path + `?ts=${Date.now()}`;
            }
          } catch (_) {}
        };
        poll();
        ctabTimer = setInterval(poll, 1500);
      } else {
        if (ctabTimer) { clearInterval(ctabTimer); ctabTimer = null; }
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
        
        // Track load state to apply offsets only after both are ready
        let loaded = { a: false, b: false };
        let offsetApplied = false;
        
        const tryApply = () => {
          if (loaded.a && loaded.b && !offsetApplied) {
            offsetApplied = true;
            setTimeout(() => {
              console.log('[Offset] Both SBS iframes loaded, applying offsets...');
              applyInitialStarts();
            }, 600);
          }
        };
        
        const checkIfReady = () => {
          try {
            if (sbsIframe1.contentWindow && sbsIframe1.contentWindow.document && sbsIframe1.contentWindow.document.readyState === 'complete') {
              loaded.a = true;
            }
            if (sbsIframe2.contentWindow && sbsIframe2.contentWindow.document && sbsIframe2.contentWindow.document.readyState === 'complete') {
              loaded.b = true;
            }
            tryApply();
          } catch(_) {}
        };
        
        sbsIframe1.onload = () => { 
          console.log('[Offset] sbsIframe1 loaded');
          loaded.a = true; 
          tryApply(); 
        };
        sbsIframe2.onload = () => { 
          console.log('[Offset] sbsIframe2 loaded');
          loaded.b = true; 
          tryApply(); 
        };
        
        sbsIframe1.src = src1;
        sbsIframe2.src = src2;
        
        setTimeout(checkIfReady, 100);
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

        showNotice('⏳ Loading screenshots...');
        let sbsLoaded = { a: false, b: false };
        const sbsMaybeClear = () => { if (sbsLoaded.a && sbsLoaded.b) showNotice(''); };
        sbs1.onload = () => { sbsLoaded.a = true; sbsMaybeClear(); };
        sbs2.onload = () => { sbsLoaded.b = true; sbsMaybeClear(); };

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
      
      const mode = renderMode.value;
      const useIframe = mode === 'iframe' || mode === 'proxy';
      
      if (useIframe) {
        // For iframes, use postMessage to sync scrolling
        function onMessage(e) {
          const d = (e && e.data) || {};
          if (!d || !d.type) return;
          // When one iframe scrolls, update the other
          if (d.type === 'SCROLL_POS') {
            try { if (sbsIframe1.contentWindow !== e.source && sbsIframe1.contentWindow) sbsIframe1.contentWindow.postMessage({ type: 'SYNC_SCROLL_TO', x: d.x, y: d.y }, '*'); } catch (_) {}
            try { if (sbsIframe2.contentWindow !== e.source && sbsIframe2.contentWindow) sbsIframe2.contentWindow.postMessage({ type: 'SYNC_SCROLL_TO', x: d.x, y: d.y }, '*'); } catch (_) {}
          } else if (d.type === 'SCROLL_BY') {
            try { if (sbsIframe1.contentWindow !== e.source && sbsIframe1.contentWindow) sbsIframe1.contentWindow.postMessage({ type: 'SYNC_SCROLL_BY', dy: d.dy || 0 }, '*'); } catch (_) {}
            try { if (sbsIframe2.contentWindow !== e.source && sbsIframe2.contentWindow) sbsIframe2.contentWindow.postMessage({ type: 'SYNC_SCROLL_BY', dy: d.dy || 0 }, '*'); } catch (_) {}
          }
        }
        window.removeEventListener('message', onMessage);
        window.addEventListener('message', onMessage);
      } else {
        // For screenshots (images), sync column scrolling
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
      }
    } else if (compareMode.value === 'overlay') {
      // Overlay: mixed handling per-side
      const renderA = renderModeA ? renderModeA.value : 'proxy';
      const renderB = renderModeB ? renderModeB.value : 'proxy';
      const bothIframes = (renderA === 'iframe' || renderA === 'proxy') && (renderB === 'iframe' || renderB === 'proxy');
      {
        // Overlay always listens to wheel to guarantee scrolling even when the leader is underneath
        const ioVal = interactMode ? interactMode.value : 'a';
        const interactive = ioVal !== 'none';

        function isInside(el, x, y) {
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        }

        function onWheel(e) {
          const dy = e.deltaY || 0;
          e.preventDefault();
          const aIsImg = (renderA === 'screenshot' || renderA === 'ctab') || useUploadA;
          const bIsImg = (renderB === 'screenshot' || renderB === 'ctab') || useUploadB;

          // Drive iframe sides via messaging
          if (!aIsImg && iframe1.contentWindow) { try { iframe1.contentWindow.postMessage({ type: 'SYNC_SCROLL_BY', dy }, '*'); } catch (_) {} }
          if (!bIsImg && iframe2.contentWindow) { try { iframe2.contentWindow.postMessage({ type: 'SYNC_SCROLL_BY', dy }, '*'); } catch (_) {} }

          // Drive image sides via virtual scroll
          if (aIsImg || bIsImg) {
            const viewportH = overlayCanvas ? overlayCanvas.clientHeight : window.innerHeight;
            const h1 = aIsImg && img1 ? img1.clientHeight : 0;
            const h2 = bIsImg && img2 ? img2.clientHeight : 0;
            const maxScroll = Math.max(0, Math.max(h1, h2) - viewportH);
            screenshotScrollY = Math.max(0, Math.min(maxScroll, screenshotScrollY + dy));
            updateOverlayStyles();
          }

          // If any side is Chrome Tab, send scroll command to extension via server
          try {
            if (renderA === 'ctab') {
              fetch('/api/extension/command', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ side: 'a', type: 'SCROLL_BY', dy })
              }).catch(() => {});
            }
            if (renderB === 'ctab') {
              fetch('/api/extension/command', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ side: 'b', type: 'SCROLL_BY', dy })
              }).catch(() => {});
            }
          } catch (_) {}
          lastOverlayForwardAt = (window.performance && performance.now) ? performance.now() : Date.now();
        }

        if (overlayWheelHandler) overlayView.removeEventListener('wheel', overlayWheelHandler);
        overlayWheelHandler = onWheel;
        overlayView.addEventListener('wheel', onWheel, { passive: false });

        // Listen for messages from iframes (scroll position updates and wheel events)
        function onMessage(e) {
          const d = (e && e.data) || {};
          if (!d || !d.type) return;
          
          const sourceId = e.source === iframe1.contentWindow ? 'A' : e.source === iframe2.contentWindow ? 'B' : '?';
          // Track last known positions for both frames
          if (d.type === 'SCROLL_POS') {
            if (sourceId === 'A') { lastPosA = { x: d.x || 0, y: d.y || 0 }; }
            if (sourceId === 'B') { lastPosB = { x: d.x || 0, y: d.y || 0 }; }
          }

          // If any side is an image, skip message coupling to avoid conflicts
          const anyImage = (renderA === 'screenshot' || renderA === 'ctab' || useUploadA) || (renderB === 'screenshot' || renderB === 'ctab' || useUploadB);
          if (anyImage) return;
          
          // If overlay is driving (interact=none), ignore iframe messages
          if (!interactive) return;

          // Only treat the interactive iframe as the leader; ignore follower-origin events
          const leaderWin = ioVal === 'a' ? iframe1.contentWindow : ioVal === 'b' ? iframe2.contentWindow : null;
          const followerWin = ioVal === 'a' ? iframe2.contentWindow : ioVal === 'b' ? iframe1.contentWindow : null;
          if (!leaderWin || !followerWin) return;
          if (e.source !== leaderWin) return; // ignore follower-origin messages to avoid ping-pong

          // Forward wheel deltas for smooth coupling
          if (d.type === 'SCROLL_BY') {
            // If we just forwarded via overlay wheel, skip duplicate
            const now = (window.performance && performance.now) ? performance.now() : Date.now();
            const dy = d.dy || 0;
            if (!lastOverlayForwardAt || now - lastOverlayForwardAt > 40) {
              try { followerWin.postMessage({ type: 'SYNC_SCROLL_BY', dy }, '*'); } catch (_) {}
            }
            return;
          }
          
          // Ignore SCROLL_POS while in interactive mode to avoid ping-pong flicker
          if (d.type === 'SCROLL_POS') {
            return;
          }
        }
        if (overlayMessageHandler) window.removeEventListener('message', overlayMessageHandler);
        if (bothIframes) {
          overlayMessageHandler = onMessage;
          window.addEventListener('message', onMessage);
        }
        
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

        // After switching interact leader, ensure the target iframe is focused and responsive
        // and nudge scroll by +1/-1 to "wake" scroll handlers without visible shift
        setTimeout(() => {
          try {
            const currIo = interactMode ? interactMode.value : 'a';
            const leaderFrame = currIo === 'a' ? iframe1 : currIo === 'b' ? iframe2 : null;
            if (leaderFrame && leaderFrame.contentWindow) {
              try { leaderFrame.contentWindow.focus(); } catch (_) {}
              try { leaderFrame.contentWindow.postMessage({ type: 'SYNC_SCROLL_BY', dy: 1 }, '*'); } catch (_) {}
              setTimeout(() => {
                try { leaderFrame.contentWindow.postMessage({ type: 'SYNC_SCROLL_BY', dy: -1 }, '*'); } catch (_) {}
              }, 30);
            }
          } catch (_) {}
        }, 50);
      }
    }
  }

  function attachEvents() {
    let renderTimer = null;
    const requestRender = () => { if (renderTimer) clearTimeout(renderTimer); renderTimer = setTimeout(() => render(), 120); };
    [url1, url2, width, dpr, wait, renderModeA, renderModeB, compareMode, overlayMode, interactMode]
      .forEach((el) => el.addEventListener('change', requestRender));
    [url1, url2, width, dpr, wait, renderModeA, renderModeB, compareMode, overlayMode, interactMode]
      .forEach((el) => el.addEventListener('input', requestRender));
    // Offsets update instantly without full re-render
    if (offset1) {
      offset1.addEventListener('input', () => { updateOverlayStyles(); writeParams(); });
      offset1.addEventListener('change', () => { updateOverlayStyles(); writeParams(); });
    }
    if (offset2) {
      offset2.addEventListener('input', () => { updateOverlayStyles(); writeParams(); });
      offset2.addEventListener('change', () => { updateOverlayStyles(); writeParams(); });
    }
    // Inline offset controls (overlay): step 10px
    const step = 1;
    function bumpOffset(which, delta) {
      const el = which === 'a' ? offset1 : offset2;
      const val = Number(el.value) || 0;
      el.value = String(val + delta);
      updateOverlayStyles();
      writeParams();
    }
    if (offsetAUp) offsetAUp.addEventListener('click', () => bumpOffset('a', -step));
    if (offsetADown) offsetADown.addEventListener('click', () => bumpOffset('a', step));
    if (offsetBUp) offsetBUp.addEventListener('click', () => bumpOffset('b', -step));
    if (offsetBDown) offsetBDown.addEventListener('click', () => bumpOffset('b', step));

    // Press-and-hold auto repeat for offset buttons
    function addHoldRepeat(btn, which, delta) {
      if (!btn) return;
      let holdTimer = null;
      let repeatTimer = null;
      const start = (e) => {
        e.preventDefault();
        bumpOffset(which, delta); // immediate bump
        // start repeating after short delay
        holdTimer = setTimeout(() => {
          repeatTimer = setInterval(() => bumpOffset(which, delta), 16); // ~60fps
        }, 200);
      };
      const stop = () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
      };
      btn.addEventListener('mousedown', start);
      btn.addEventListener('touchstart', start, { passive: false });
      window.addEventListener('mouseup', stop);
      window.addEventListener('mouseleave', stop);
      window.addEventListener('touchend', stop);
      window.addEventListener('touchcancel', stop);
    }
    addHoldRepeat(offsetAUp, 'a', -step);
    addHoldRepeat(offsetADown, 'a', step);
    addHoldRepeat(offsetBUp, 'b', -step);
    addHoldRepeat(offsetBDown, 'b', step);
    [opacity, swipe].forEach((el) => el.addEventListener('input', () => { updateOverlayStyles(); writeParams(); }));
    refreshBtn.addEventListener('click', (e) => { e.preventDefault(); requestRender(); });

    // Horizontal offset + Zoom controls
    function bumpHOffset(which, delta) {
      if (which === 'a') { hOffset1 = (Number(hOffset1) || 0) + delta; }
      else { hOffset2 = (Number(hOffset2) || 0) + delta; }
      updateOverlayStyles();
      writeParams();
    }
    function bumpZoom(which, delta) {
      if (which === 'a') { zoom1 = Math.max(0.1, Math.min(4, (Number(zoom1) || 1) + delta)); }
      else { zoom2 = Math.max(0.1, Math.min(4, (Number(zoom2) || 1) + delta)); }
      updateOverlayStyles();
      writeParams();
    }
    const hStep = 1;
    const zStep = 0.0005; // 0.05%
    if (hoffALeft) hoffALeft.addEventListener('click', () => bumpHOffset('a', -hStep));
    if (hoffARight) hoffARight.addEventListener('click', () => bumpHOffset('a', hStep));
    if (hoffBLeft) hoffBLeft.addEventListener('click', () => bumpHOffset('b', -hStep));
    if (hoffBRight) hoffBRight.addEventListener('click', () => bumpHOffset('b', hStep));
    if (zoomAOut) zoomAOut.addEventListener('click', () => bumpZoom('a', -zStep));
    if (zoomAIn) zoomAIn.addEventListener('click', () => bumpZoom('a', zStep));
    if (zoomBOut) zoomBOut.addEventListener('click', () => bumpZoom('b', -zStep));
    if (zoomBIn) zoomBIn.addEventListener('click', () => bumpZoom('b', zStep));

    // Hold-repeat for horizontal/zoom
    function addHoldRepeatFn(btn, fn) {
      if (!btn) return;
      let holdTimer = null;
      let repeatTimer = null;
      const start = (e) => {
        e.preventDefault();
        fn();
        holdTimer = setTimeout(() => {
          repeatTimer = setInterval(fn, 16);
        }, 200);
      };
      const stop = () => {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
      };
      btn.addEventListener('mousedown', start);
      btn.addEventListener('touchstart', start, { passive: false });
      window.addEventListener('mouseup', stop);
      window.addEventListener('mouseleave', stop);
      window.addEventListener('touchend', stop);
      window.addEventListener('touchcancel', stop);
    }
    addHoldRepeatFn(hoffALeft, () => bumpHOffset('a', -hStep));
    addHoldRepeatFn(hoffARight, () => bumpHOffset('a', hStep));
    addHoldRepeatFn(hoffBLeft, () => bumpHOffset('b', -hStep));
    addHoldRepeatFn(hoffBRight, () => bumpHOffset('b', hStep));
    addHoldRepeatFn(zoomAOut, () => bumpZoom('a', -zStep));
    addHoldRepeatFn(zoomAIn, () => bumpZoom('a', zStep));
    addHoldRepeatFn(zoomBOut, () => bumpZoom('b', -zStep));
    addHoldRepeatFn(zoomBIn, () => bumpZoom('b', zStep));

    // Upload handling
    if (uploadA) uploadA.addEventListener('change', (e) => {
      const f = uploadA.files && uploadA.files[0];
      if (!f) return;
      if (uploadUrlA) try { URL.revokeObjectURL(uploadUrlA); } catch (_) {}
      uploadUrlA = URL.createObjectURL(f);
      useUploadA = true;
      requestRender();
    });
    if (uploadB) uploadB.addEventListener('change', (e) => {
      const f = uploadB.files && uploadB.files[0];
      if (!f) return;
      if (uploadUrlB) try { URL.revokeObjectURL(uploadUrlB); } catch (_) {}
      uploadUrlB = URL.createObjectURL(f);
      useUploadB = true;
      requestRender();
    });
    if (clearUploadA) clearUploadA.addEventListener('click', () => {
      if (uploadUrlA) { try { URL.revokeObjectURL(uploadUrlA); } catch (_) {} uploadUrlA = ''; }
      useUploadA = false;
      requestRender();
    });
    if (clearUploadB) clearUploadB.addEventListener('click', () => {
      if (uploadUrlB) { try { URL.revokeObjectURL(uploadUrlB); } catch (_) {} uploadUrlB = ''; }
      useUploadB = false;
      requestRender();
    });

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


