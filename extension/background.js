// Poll server for commands to control A/B tabs and execute in the captured tabs
async function pollAndExecute(side) {
  try {
    const r = await fetch(`http://localhost:8080/api/extension/nextCommand?side=${side}`);
    const j = await r.json();
    if (!j || !j.ok || !j.cmd) return;
    const cmd = j.cmd;
    const key = side === 'a' ? 'aTabId' : 'bTabId';
    const store = await chrome.storage.local.get([key, 'lastWindowId']);
    const tabId = store[key];
    if (!tabId) return;

    if (cmd.type === 'SCROLL_BY') {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (dy) => { try { window.scrollBy(0, dy || 0); } catch (e) {} },
          args: [cmd.payload && cmd.payload.dy]
        });
      } catch (e) {
        // ignore
      }
    }
    if (cmd.type === 'SET_CONSTRAINTS') {
      const dims = cmd.payload || {};
      await chrome.storage.local.set({ [`${side}Dims`]: { w: dims.w, h: dims.h, fps: dims.fps || 15 } });
      // Restart capture with new constraints on next offer
      try { (side === 'a' ? capStreamA : capStreamB)?.getTracks().forEach(t => t.stop()); } catch (_) {}
    }
  } catch (_) {}
}

setInterval(() => { pollAndExecute('a'); }, 300);
setInterval(() => { pollAndExecute('b'); }, 300);

// WebRTC sender: poll for SDP offers from page, start tabCapture and answer
let pcA = null, pcB = null;
let capStreamA = null, capStreamB = null;

async function ensureAnswerFor(side) {
  try {
    const offerResp = await fetch(`http://localhost:8080/api/ctab/offer?side=${side}`).then(r => r.json());
    if (!offerResp || !offerResp.ok || !offerResp.sdp) return;
    const key = side === 'a' ? 'aTabId' : 'bTabId';
    const store = await chrome.storage.local.get([key]);
    const tabId = store[key];
    if (!tabId) {
      console.log(`[Extension] No tabId stored for side ${side}`);
      return;
    }
    console.log(`[Extension] Received offer for side ${side}, tabId: ${tabId}`);

    const pc = new RTCPeerConnection({ iceServers: [] });
    if (side === 'a') pcA = pc; else pcB = pc;

    // stop previous capture
    try { (side === 'a' ? capStreamA : capStreamB)?.getTracks().forEach(t => t.stop()); } catch (_) {}

    // Set capture constraints (basic; can be updated via commands)
    const dimsStore = await chrome.storage.local.get([`${side}Dims`, key, 'lastWindowId']);
    const dims = dimsStore[`${side}Dims`] || { w: 1280, h: 800, fps: 15 };
    const constraints = {
      audio: false,
      video: true,
      videoConstraints: {
        mandatory: {
          maxWidth: dims.w,
          maxHeight: dims.h,
          maxFrameRate: dims.fps
        }
      }
    };

    // Temporarily focus the target tab to satisfy captureVisibleTab requirement, then restore previous active tab
    const windows = await chrome.windows.getAll({ populate: true });
    const targetWinId = dimsStore.lastWindowId || (windows.find(w => w.tabs?.some(t => t.id === tabId))?.id);
    const prevActiveTab = windows.find(w => w.id === targetWinId)?.tabs?.find(t => t.active);
    console.log(`[Extension] Focusing tab ${tabId} for capture`);
    if (tabId) { try { await chrome.tabs.update(tabId, { active: true }); } catch (e) { console.error('Tab focus error:', e); } }
    const stream = await new Promise((resolve, reject) => {
      try { chrome.tabCapture.capture(constraints, (s) => { 
        if (chrome.runtime.lastError || !s) {
          console.error('[Extension] Tab capture error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log('[Extension] Tab capture successful', s);
          resolve(s);
        }
      }); }
      catch (e) { reject(e); }
    });
    // Restore previous active tab
    if (prevActiveTab && prevActiveTab.id && prevActiveTab.id !== tabId) {
      console.log(`[Extension] Restoring focus to tab ${prevActiveTab.id}`);
      try { await chrome.tabs.update(prevActiveTab.id, { active: true }); } catch (e) {}
    }
    if (side === 'a') capStreamA = stream; else capStreamB = stream;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    console.log(`[Extension] Added ${stream.getTracks().length} tracks to peer connection`);

    pc.onicecandidate = async (ev) => {
      try {
        if (ev && ev.candidate) {
          await fetch('http://localhost:8080/api/ctab/candidate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ side, from: 'ext', candidate: ev.candidate })
          });
        }
      } catch (e) {}
    };
    await pc.setRemoteDescription({ type: 'offer', sdp: offerResp.sdp });
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    console.log(`[Extension] Sending answer for side ${side}`);
    await fetch('http://localhost:8080/api/ctab/answer', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ side, sdp: ans.sdp })
    });
    // poll page ICE candidates
    setInterval(async () => {
      try {
        const rr = await fetch(`http://localhost:8080/api/ctab/candidate?side=${side}&to=ext`).then(r => r.json());
        if (rr && rr.ok && Array.isArray(rr.candidates)) {
          for (const c of rr.candidates) {
            try { await pc.addIceCandidate(c); } catch (e) {}
          }
        }
      } catch (e) {}
    }, 600);
  } catch (_) {}
}

setInterval(() => { ensureAnswerFor('a'); }, 1000);
setInterval(() => { ensureAnswerFor('b'); }, 1000);

