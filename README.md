# Apply Assist Pro — AI Job Application Copilot (Jobright Edition)

An ultra-premium, universal 1-click browser extension copilot for job applications, inspired by Jobright. Automatically detects job postings and application forms across any company website or ATS (Greenhouse, Lever, Workday, Ashby, BambooHR, LinkedIn, Indeed, Taleo, etc.), calculates ATS match score %, identifies missing keywords, tailors your resume in 1 click, attaches your resume PDF via DataTransfer, drafts AI answers, and advances multi-step pages.

---

## ✨ Key Features

1. **Universal Job & Form Detection**
   - Automatically detects when you open a company careers page, job posting, or ATS application form.
   - Works across **all domains** (`<all_urls>`), not just a single ATS.

2. **Jobright-Inspired Floating Copilot**
   - **Docked Mode**: Floating glowing pill on the edge of your screen displaying live ATS Match % (`🎯 92% ATS Match`) with a `⚡ Auto Fill` micro-action.
   - **Expanded Dashboard**: Full glassmorphic companion drawer with ATS radial gauge, 1-Click Auto Apply button, field review list, and AI assistant.

3. **Deep ATS Match & Skill Intelligence**
   - Scans job requirements and extracts technical skills, tools, and qualifications.
   - Real-time **ATS Match Score (0–100%)**.
   - Displays **Matched Skills** (green checkmark chips) and **Missing Keywords** (amber plus chips).

4. **1-Click Resume Tailoring & Instant ATS Boost**
   - Click **"✨ 1-Click Tailor Resume"** to automatically inject the missing keywords into your tailored profile summary and skills list.
   - Instantly boosts your ATS score to **95%+**.
   - Dynamically re-generates your tailored ATS PDF resume on the fly!

5. **1-Click Auto-Fill & Resume File Attachment**
   - Automatically fills text inputs, selects, radio buttons, and agreement checkboxes.
   - **Native PDF Attachment**: Automatically creates and attaches your resume (`Razin_Shaikh_Resume.pdf`) to `<input type="file">` using browser `DataTransfer` APIs.
   - Visual pulse glow on filled fields so you see the magic in real time.

6. **Smart Multi-Step Page Progression**
   - Detects multi-step wizards ("Next", "Save & Continue", "Continue", "Review Application").
   - Automatically advances to the next step when toggled ON.

7. **AI Screening Answer Drafting (Replicate, Gemini, Anthropic & Smart Offline)**
   - Drafts high-impact, first-person answers to open-ended questions (*"Why do you want to work here?"*, *"Tell us about a challenging project"*, cover letters, etc.).
   - Supports **Replicate** (Llama 3 / Mixtral), **Google Gemini**, **Anthropic Claude**, and a **Built-in Smart Offline Engine** grounded 100% in Razin Shaikh's verified projects (Little Steps AI Clinic SaaS, Play Store AI Medicine Reminder, YOLOv8 edge tracking camera).

---

## 🚀 How to Install (Load Unpacked in Chrome)

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** in the top-right corner.
4. Click **"Load unpacked"** in the top-left corner.
5. Select this folder: `/Users/razinshk/Downloads/extension 2`.
6. Pin **Apply Assist Pro** to your Chrome toolbar.

---

## 🎯 How to Use

1. **Configure Your Profile (Toolbar Icon)**:
   - Click the extension icon in your Chrome toolbar.
   - Review your pre-loaded profile (pre-filled with Razin Shaikh's full credentials, links, education, and 40+ technical skills).
   - Upload your custom resume PDF in the **Resume** tab, or use the built-in ATS PDF generator.
   - In **AI & APIs**, select your preferred provider (Replicate, Gemini, Anthropic, or Smart Offline).
   - Test your ATS score on any job description using the built-in **ATS Tester**.

2. **Apply to Any Job**:
   - Open any job application (e.g. on Greenhouse, Lever, Workday, Ashby, or a company's `/careers` page).
   - The **Jobright Copilot** automatically appears on the right edge.
   - View your **ATS Match Score** and missing keywords.
   - (Optional) Click **"✨ 1-Click Tailor Resume"** to boost your match score to 96%+.
   - Click **"⚡ 1-Click Auto Apply"**: All fields are filled, your resume PDF is attached, and the extension guides you through next steps!

---

## 📁 Architecture Overview

| File | Purpose |
|---|---|
| `manifest.json` | Manifest V3 extension configuration with universal host permissions and PNG icons |
| `defaultProfile.js` | Master candidate profile seeded with Razin Shaikh's full resume, projects, and skills |
| `pdfGenerator.js` | Pure JS ATS-compliant PDF 1.4 generator & file attachment bridge |
| `atsEngine.js` | Job description scanner, skill extraction, ATS scoring, and 1-click tailoring engine |
| `matcher.js` | Universal form field classifier (Personal, links, education, work auth, EEO, file inputs) |
| `content.js` | Jobright-inspired floating copilot, glassmorphic drawer, and auto-progression script |
| `content.css` | Real-time emerald field glow and active focus highlights |
| `background.js` | Service worker supporting Replicate, Gemini, Anthropic, and Smart Offline AI drafting |
| `popup.html/css/js` | Ultra-premium extension popup dashboard with profile editor, PDF uploader, and ATS tester |
| `icons/` | Real 16px, 48px, and 128px high-resolution PNG icons |
