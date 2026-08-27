<div align="center">

# ⚡ Toolstack

**A reference hub for the free web — Which tool do I use?**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Toolstack-2038c8?style=for-the-badge&logo=githubpages&logoColor=white)](https://vantheravibes.github.io/toolstack/)
[![Support on Ko-fi](https://img.shields.io/badge/Ko--fi-Buy%20Me%20a%20Coffee-ff5e5b?style=for-the-badge&logo=kofi&logoColor=white)](https://ko-fi.com/R3X123880A)
[![License: MIT](https://img.shields.io/badge/License-MIT-black?style=for-the-badge)](LICENSE)
[![Zero Build Step](https://img.shields.io/badge/Build%20Step-Zero%20%2F%20Pure%20Static-10b981?style=for-the-badge)](https://vantheravibes.github.io/toolstack/)

<br />

<p align="center">
  <b>Toolstack</b> curates and objectively scores the best free online tools — converters, editors, generators, developer utilities, security tools & AI assistants — so you can skip the ad-swamps, avoid dark-pattern paywalls, and go straight to what works.
</p>

[Explore Tools](https://vantheravibes.github.io/toolstack/#directory) • [About Project](https://vantheravibes.github.io/toolstack/#about) • [Contribute a Tool](#-how-to-add-a-tool) • [Support](https://ko-fi.com/R3X123880A)

---

</div>

<br />

## 🌟 Highlights

```
INDEX: 194+ TOOLS  │  CATEGORIES: 37  │  SCORING: 5 CRITERIA  │  BACKEND: ZERO
```

- ⚡ **194+ Curated Utilities** across 37 precise categories (PDF, Images, Audio/Video, Code, Security & more).
- 🎯 **Objective 10-Point Score Rating** based on pricing transparency, privacy, account friction, and ad load.
- 🔒 **Privacy-First Indexing** highlighting tools with 100% in-browser, client-side WebAssembly/JS processing.
- 🔍 **Instant Multi-Word Search Engine** with debounced real-time token filtering.
- ⚖️ **Side-by-Side Comparison Matrix** to compare up to 3 tools across all attributes simultaneously.
- 🔍 **Score Inspector Modal** displaying a detailed breakdown of points and key feature lists for each tool.
- ⭐ **Local Bookmarking System** allowing you to save favorite tools right in your browser (`localStorage`).
- 🌓 **Dynamic Theme Switcher** supporting Dark and Light blueprint modes with system preference sync.
- ⌨️ **Keyboard Navigation** (`/` or `Ctrl + K` to search, `Esc` to dismiss modals).
- 🚀 **100% Static & Lightweight** — Pure HTML, CSS, and Vanilla JavaScript with **0 build steps** and **0 dependencies**.

---

## 📊 The 5-Point Scoring System

Every tool indexed on Toolstack is evaluated and scored out of **10 points** across five objective criteria:

| Criterion | +2 Points | +1 Point | 0 Points |
| :--- | :--- | :--- | :--- |
| **Pricing Model** | **100% Free** (No paywalls) | **Freemium** (Generous free tier) | Paid / Trial only |
| **Account Requirement** | **No Signup** (Instant use) | — | Registration mandatory |
| **Privacy & Processing** | **100% Local / In-browser** (Client-side) | — | Cloud / Server upload |
| **Ad Burden** | **Zero Ads** (Clean UI) | **Moderate Ads** (Non-intrusive) | Ad-heavy / Popups |
| **Usability & UX** | **Intuitive & Fast Workflow** | **Standard Usability** | Clunky / Dark patterns |

---

## 🗂️ Categories Directory

Toolstack spans **37 granular categories** organized into structured domains:

<details>
<summary><b>📁 Click to expand all 37 categories</b></summary>

<br />

| Domain | Categories |
| :--- | :--- |
| **Documents & Office** | PDF Tools • Document Converters • Spreadsheet Tools • Presentation Tools • E-book Converters • OCR & Text Extraction |
| **Media — Image** | Image Converters • Image Compression • Image Editing • Icon & SVG Tools |
| **Media — Audio & Video** | Audio Converters • Audio Editing • Video Converters • Video Editing & Compression • Screen Recording & Screenshots |
| **Files & Archives** | Archive & Compression • File Transfer & Sharing • Universal File Converters |
| **Data & Code** | Data Format Tools • Code Formatters & Beautifiers • Regex Tools • Encoding & Decoding • Hash & Checksum • Developer Utilities • Network & DNS Tools |
| **AI & Machine Learning** | AI Writing & Summarizers • AI Image & Visual Tools • AI Code & Logic Helpers |
| **CSS & Web Design** | CSS & Layout Generators |
| **Generators & Converters** | QR & Barcode Generators • Unit Converters • Currency Converters • Color Tools • Font & Typography Tools |
| **Security & Privacy** | Privacy & Metadata Tools • Password & Security Tools • Temporary Mail & Masking |

</details>

---

## 🛠️ Project Structure & Tech Stack

This project is built to be resilient, lightning fast, and easily deployable anywhere without bundlers, npm dependencies, or server runtimes.

```
build-toolstack/
├── index.html     # Semantic HTML5 layout, modals & accessibility structure
├── styles.css     # CSS custom properties, responsive grid, light/dark themes & animations
├── data.js        # Central database containing CATEGORIES and all 194+ TOOLS objects
├── app.js         # State controller, search engine, filter engine, favorites & modals
└── README.md      # Documentation & contribution guidelines
```

---

## 🚀 Local Development

Since Toolstack requires no build tools or package managers, running it locally is simple:

### Option 1: Live Server / VS Code
Open the project directory in VS Code and click **Go Live** with the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.

### Option 2: Python HTTP Server
```bash
# In the project directory
python -m http.server 3000
```
Then visit `http://localhost:3000` in your browser.

### Option 3: Node / npx
```bash
npx serve .
```

---

## 🤝 How to Add a Tool

We welcome contributions! To suggest or add a new tool to the directory:

1. Fork the repository.
2. Open [`data.js`](data.js).
3. Append a new tool object to the `RAW_TOOLS` array following this schema:

```javascript
{
  name: "ToolName",
  cat: "pdf", // Category ID from CATEGORIES array
  url: "https://example.com",
  desc: "Clear and concise description of what makes this tool exceptional.",
  pricing: "free",     // "free" (+2) | "freemium" (+1)
  noSignup: true,      // true (+2) | false (0)
  privacy: true,       // true (+2) | false (0)
  ads: "none",         // "none" (+2) | "some" (+1) | "heavy" (0)
  ease: 2,             // 1 | 2
  features: ["Feature 1", "Feature 2", "Feature 3"],
  pros: ["Why we recommend it", "Key highlight"]
}
```

4. Create a Pull Request with a short summary of the tool.

---

## ☕ Support

If you find Toolstack helpful for your daily workflow, consider buying a coffee to support continuous curation and maintenance!

<p align="left">
  <a href="https://ko-fi.com/R3X123880A" target="_blank">
    <img src="https://storage.ko-fi.com/cdn/kofi3.png?v=6" height="40" alt="Buy Me a Coffee at ko-fi.com" />
  </a>
</p>

---

## 📄 License

Distributed under the [MIT License](LICENSE). Built and curated with care by [@vantheravibes](https://github.com/vantheravibes).
