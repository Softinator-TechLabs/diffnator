# 🔥 DiffNator - The Ultimate Visual Comparison Tool

A powerful, local-first web application for pixel-perfect comparison of websites, supporting live iframes, proxied content, and screenshots. Perfect for:
- 🎨 Visual regression testing
- 📱 Responsive design QA
- 🔄 Before/after comparisons
- 🌐 Cross-browser testing
- 💻 Local development vs production

## ✨ Features

> Status: Only the Live (proxy) + Overlay mode is fully tested and recommended right now. Other modes (Live iframe, Screenshot; Side-by-side) are available and generally work, but are considered experimental.

### 🎭 Three Rendering Modes
- **Live (iframe)**: Direct iframe embedding for `localhost` and `file://` URLs
- **Live (proxy)**: Server-side proxy to bypass X-Frame-Options restrictions
- **Screenshot**: Puppeteer-based screenshots for sites that block all iframe methods

### 🔍 Comparison Modes
- **Overlay**: Stack two pages with opacity/swipe/blend controls
  - **Onion Skin**: Adjust opacity to see through layers
  - **Swipe**: Drag a handle to reveal differences
  - **Difference Blend**: Mix-blend-mode for visual diff
- **Side-by-Side**: Compare pages next to each other with synchronized scrolling

### 🎯 Key Capabilities
- ✅ Compare `https://` URLs, `http://localhost`, and `file://` paths
- ✅ Adjustable viewport width (320px - 3840px) with range slider
- ✅ Synchronized scrolling in both overlay and side-by-side modes
- ✅ Collapsible control drawer for maximum comparison area
- ✅ Deep-linking support (share comparisons via URL)
- ✅ Natural page scrolling (no height constraints)
- ✅ Responsive design with touch support

## 🚀 Quick Start

### Prerequisites
- **Node.js** 16.0.0 or higher
- **npm** 8.0.0 or higher

### Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/Softinator-TechLabs/diffnator.git
cd diffnator

# 2. Install dependencies (includes Puppeteer + Chromium)
npm install

# 3. Start the server (includes web server + proxy)
npm start

# The app will be available at http://localhost:8080
```

**First-time setup**: The `npm install` will download Chromium (~170-250MB) for Puppeteer. This is normal and required for screenshot functionality.

### Available Commands

**Using npm:**
```bash
npm start          # Start the server (web server + proxy + screenshot service)
npm stop           # Stop all running server processes
npm restart        # Stop and restart the server
npm run dev        # Same as start (development mode)
npm run dev:visible # Start with visible browser (for debugging security checks)
npm run health     # Check if server is running
```

**Using the CLI helper (easier):**
```bash
./diffnator.sh start      # Start everything
./diffnator.sh stop       # Stop all services
./diffnator.sh restart    # Restart all services
./diffnator.sh status     # Check health
./diffnator.sh dev:visible # Debug mode with visible browser
```

## 📖 Usage

### Basic Comparison
1. Enter two URLs in the input fields
2. Select a **Render mode**:
   - `Live (iframe)` for direct embedding
   - `Live (proxy)` for sites that block iframes
   - `Screenshot` for full compatibility
3. Choose **Overlay** or **Side-by-side** comparison
4. Adjust viewport width using the slider
5. Click **Refresh** to reload

### URL Support

| URL Type | Live (iframe) | Live (proxy) | Screenshot |
|----------|--------------|--------------|------------|
| `http://localhost:3000` | ✅ Direct | ✅ Proxied | ✅ Captured |
| `https://example.com` | ⚠️ If allowed | ✅ Proxied | ✅ Captured |
| `file:///path/to/file.html` | ✅ Served | ✅ Served | ⚠️ Limited |

**Notes:**
- `file://` URLs are automatically served via HTTP to bypass browser security
- Screenshot mode uses a default 2000ms wait for content to load (adjustable via Wait field)
- Live modes support animations, hover effects, and interactive elements

### Overlay Modes
- **Onion (opacity)**: Slide the opacity control to blend pages
- **Swipe**: Drag the vertical handle to reveal differences
- **Difference Blend**: See visual differences highlighted

### Keyboard Shortcuts
### Scrolling in Overlay (Important)
- In Overlay with Live (proxy), the parent view captures the scroll and forwards it to both pages for perfect sync.
- You can scroll directly while your mouse is over the viewport.
- Interactions (click/hover) inside the pages are intentionally disabled in Overlay to keep scrolling consistent. Switch to Side-by-side or Live (iframe) if you need interactivity.
- Click **☰** button to toggle control drawer
- Drag swipe handle in overlay mode

## 🔧 Advanced Configuration

### Environment Variables
```bash
# Run with visible Chrome (for CAPTCHA/security checks)
HEADLESS=false npm start

# Use custom port
PORT=9000 npm start
```

### Deep Linking
Share comparisons by copying the URL:
```
http://localhost:8080/?u1=https://example.com&u2=http://localhost:3000&w=1440&render=proxy&mode=sbs
```

Parameters:
- `u1` / `u2`: URLs to compare
- `w`: Viewport width (px)
- `dpr`: Device pixel ratio (1, 1.5, 2, 3)
- `wait`: Wait time before screenshot (ms)
- `render`: Render mode (`iframe`, `proxy`, `screenshot`)
- `mode`: Comparison mode (`overlay`, `sbs`)
- `om`: Overlay mode (`onion`, `swipe`, `blend`)
- `opacity`: Opacity percentage (0-100)
- `swipe`: Swipe position percentage (0-100)

## 🎨 Use Cases

### Visual Regression Testing
Compare production vs staging environments:
```
u1=https://staging.example.com
u2=https://example.com
render=proxy
mode=overlay
om=blend
```

### Responsive Design QA
Test different viewport widths:
```
u1=http://localhost:3000
u2=http://localhost:3000
w=375 (then adjust to 1440)
mode=sbs
```

### Local File Comparison
Compare a saved HTML file with live site:
```
u1=file:///Users/you/Downloads/saved-page.html
u2=https://example.com
render=iframe
mode=overlay
```

## 🛠️ Technical Details

### Architecture
- **Frontend**: Vanilla JavaScript, CSS Grid/Flexbox
- **Backend**: Express.js + Puppeteer
- **Proxy System**: Server-side fetch with HTML rewriting

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Performance
- Optimized scroll sync with `requestAnimationFrame`
- Debounced event handlers (50ms)
- Efficient DOM updates

## 📝 Troubleshooting

### "Proxy fetch failed: Forbidden"
**Cause**: Some sites block server-side access (e.g., Revolut, banking sites).  
**Solution**: Switch to **Screenshot mode** which uses a headless browser.

### Screenshots appear blank or incomplete
**Cause**: Page needs more time to load dynamic content.  
**Solution**: Increase the **Wait (ms)** value (try 3000-5000ms for heavy sites).

### CAPTCHA or security checks blocking access
**Cause**: Site detects headless browser.  
**Solution**: Run with visible Chrome to manually solve:
```bash
HEADLESS=false npm start
```

### Port 8080 already in use
**Cause**: Another service is using port 8080.  
**Solution**: Use a different port:
```bash
PORT=9000 npm start
```

### High memory usage
**Cause**: Puppeteer keeps browser instances open.  
**Solution**: Restart the server periodically using `npm restart`, or reduce concurrent screenshot requests.

### Saved HTML files missing images
**Cause**: Images reference external CDNs with CORS restrictions.  
**Solution**: The app automatically proxies external assets in Live modes. If issues persist, try Screenshot mode.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🌟 Credits

Built with:
- [Express](https://expressjs.com/)
- [Puppeteer](https://pptr.dev/)
- Inspired by [diffsite](https://pianomister.github.io/diffsite/)

---

Made with ❤️ for designers and developers who care about pixel perfection.

**Quick Commands:**
- `npm start` - Start everything (web server + proxy + screenshots)
- `npm restart` - Restart all services
- `npm stop` - Stop all services
