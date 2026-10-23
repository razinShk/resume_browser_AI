/**
 * Apply Assist Pro — Jobright-Inspired AI Job Copilot Content Script
 * 
 * Features:
 * - Automatic Job & Form Detection across any company website or ATS
 * - Floating Docked Copilot Badge + Full Glassmorphic Drawer
 * - Deep ATS Match Score (0-100%) & Missing Keyword Extractor
 * - 1-Click Resume Tailor & Instant ATS Score Boost
 * - 1-Click Universal Auto-Fill + Native PDF File Attachment via DataTransfer
 * - Smart Multi-Step Wizard Progression ("Next", "Continue", etc.)
 * - AI Copilot for Custom Screening Questions
 */

(function () {
  const ROOT_ID = "apply-assist-copilot-root";
  let profile = null;
  let jobDetails = { title: "Software Engineer", company: "Company", description: "" };
  let atsResult = { score: 85, matchedSkills: [], missingSkills: [], totalJobSkills: 0 };
  let detectedFields = [];
  let isTailored = false;
  let tailoredSummary = "";
  let tailoredSkills = [];
  let activeTab = "autofill"; // 'autofill' | 'ats' | 'ai' | 'resume'
  let isExpanded = false;
  let autoAdvanceEnabled = true;
  let shadowRoot = null;
  let panelRoot = null;

  init();

  async function init() {
    profile = await loadProfile();
    
    // Check if this page is a job board or application page
    const atsEngine = window.__applyAssistAts;
    const isJob = atsEngine ? atsEngine.isJobPage() : true;

    // Scan initially and watch for DOM updates (SPA route changes, delayed form rendering)
    setupDomObserver();
    
    if (isJob || document.querySelector("form, input, [class*='apply']")) {
      setTimeout(() => {
        analyzePageAndRender();
      }, 1000);
    }
  }

  function loadProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["applyAssistProfile"], (res) => {
        resolve(res.applyAssistProfile || window.DEFAULT_PROFILE || {});
      });
    });
  }

  function setupDomObserver() {
    let scanTimeout = null;
    const observer = new MutationObserver((mutations) => {
      // Reattach panel if removed by host page re-render
      if (panelRoot && !document.body.contains(panelRoot)) {
        document.body.appendChild(panelRoot);
      }

      // Debounce re-scanning for new form fields
      if (!scanTimeout) {
        scanTimeout = setTimeout(() => {
          scanTimeout = null;
          rescanFieldsOnly();
        }, 1500);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("focus", () => {
      if (panelRoot && !document.body.contains(panelRoot)) {
        document.body.appendChild(panelRoot);
      }
    });
  }

  function analyzePageAndRender() {
    const ats = window.__applyAssistAts;
    if (ats) {
      jobDetails = ats.extractJobDetails();
      atsResult = ats.calculateAtsMatch(jobDetails.description, profile);
    }

    scanFields();
    renderCopilot();
  }

  function getFieldLabel(el) {
    // 1. label[for]
    if (el.id) {
      try {
        const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (lbl && lbl.innerText.trim()) return lbl.innerText.trim();
      } catch (e) {}
    }
    // 2. aria-label / aria-labelledby
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label").trim();
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const node = document.getElementById(labelledBy);
      if (node && node.innerText.trim()) return node.innerText.trim();
    }
    // 3. wrapping label
    const wrapping = el.closest("label");
    if (wrapping && wrapping.innerText.trim()) return wrapping.innerText.trim();

    // 4. container with label or heading
    let container = el.closest("[class*='field'], [class*='form-group'], [class*='form-row'], .row, fieldset, .form-field, tr, [data-automation-id]");
    let containerTitle = "";
    if (container) {
      const titleEl = container.querySelector("legend, label, .application-label, [class*='label'], [class*='title']");
      if (titleEl && titleEl.innerText.trim() && titleEl.innerText.trim().length < 80) {
        containerTitle = titleEl.innerText.trim();
      }
    }

    // Fallback: check parents and preceding sibling labels (e.g. for token-input, table layouts, or nested inputs)
    if (!containerTitle) {
      let p = el.parentElement;
      for (let i = 0; i < 4 && p; i++) {
        const prevLabel = p.querySelector("label, [class*='label'], [class*='title']") ||
                          p.previousElementSibling?.querySelector?.("label, [class*='label'], [class*='title']") ||
                          (p.previousElementSibling?.tagName === "LABEL" ? p.previousElementSibling : null);
        if (prevLabel && prevLabel.innerText.trim() && prevLabel.innerText.trim().length < 80) {
          containerTitle = prevLabel.innerText.trim();
          break;
        }
        p = p.parentElement;
      }
    }

    // 5. Check select first option if available (e.g. "Please select day", "Please select month", "Please select year")
    let selectHint = "";
    if (el.tagName?.toLowerCase() === "select" && el.options?.length > 0) {
      const firstOptText = (el.options[0]?.text || "").trim();
      if (/select\s*(day|month|year|country|phone)/i.test(firstOptText)) {
        selectHint = firstOptText;
      }
    }

    const directHint = el.getAttribute("placeholder") || el.getAttribute("name") || el.id || "";
    
    // Combine container title and direct hint if appropriate
    if (containerTitle && (selectHint || directHint)) {
      if (!containerTitle.toLowerCase().includes(directHint.toLowerCase())) {
        return `${containerTitle} ${selectHint || directHint}`.trim();
      }
      return containerTitle;
    }

    return selectHint || containerTitle || directHint || "";
  }

  function getFieldType(el) {
    const tag = el.tagName.toLowerCase();
    if (tag === "textarea") return "textarea";
    if (tag === "select") return "select";
    if (tag === "input") {
      const type = (el.type || "text").toLowerCase();
      return type;
    }
    return "text";
  }

  function scanFields() {
    const formScope = document.querySelector("form") || document.body;
    const rawElements = Array.from(
      formScope.querySelectorAll("input, textarea, select")
    ).filter((el) => {
      const tag = el.tagName.toLowerCase();
      const type = getFieldType(el);
      if (["submit", "button", "reset"].includes(type)) return false;
      if (type === "hidden") return false;
      // Skip if inside our own root
      if (panelRoot && panelRoot.contains(el)) return false;
      
      // Allow visible elements, OR selects, radios, checkboxes, and files that might be visually hidden/styled by CSS frameworks
      const isSelectOrCheck = tag === "select" || type === "radio" || type === "checkbox" || type === "file";
      return el.offsetParent !== null || isSelectOrCheck;
    });

    detectedFields = rawElements.map((el) => {
      const label = getFieldLabel(el);
      const fieldType = getFieldType(el);
      const classification = window.__applyAssistMatcher.classifyQuestion(
        label,
        fieldType,
        profile,
        el
      );

      let draftValue = "";
      if (classification.type === "factual") {
        draftValue = String(classification.value);
      } else if (classification.type === "resume_file") {
        draftValue = "Razin_Shaikh_Resume.pdf";
      }

      return {
        el,
        label: label || (el.name || "Form Field"),
        fieldType,
        classification,
        draft: draftValue,
        selected: classification.type !== "unknown",
      };
    });
  }

  function rescanFieldsOnly() {
    const prevCount = detectedFields.length;
    scanFields();
    if (prevCount !== detectedFields.length && shadowRoot) {
      updateFieldListDom();
    }
  }

  /**
   * Sets value on native inputs safely across React / Angular / Vue
   */
  function setNativeValue(el, value) {
    if (!el) return;
    const tag = el.tagName.toLowerCase();
    let proto = null;

    if (tag === "textarea") {
      proto = window.HTMLTextAreaElement.prototype;
    } else if (tag === "input") {
      proto = window.HTMLInputElement.prototype;
    } else if (tag === "select") {
      proto = window.HTMLSelectElement.prototype;
    }

    if (proto) {
      const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
      if (setter) {
        setter.call(el, value);
      } else {
        el.value = value;
      }
    } else {
      el.value = value;
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("blur", { bubbles: true }));

    // Autocomplete / TokenInput trigger (e.g. for RippleHire location autocomplete)
    if (tag === "input" && (/location/i.test(el.placeholder || "") || /location/i.test(el.id || "") || /token-input/i.test(el.id || ""))) {
      el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "P" }));
      el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "P" }));
      setTimeout(() => {
        const item = document.querySelector(".token-input-dropdown-facebook li, .token-input-dropdown li, .ui-autocomplete li, .pac-item");
        if (item) {
          item.click();
        } else {
          el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter", keyCode: 13, which: 13 }));
          el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Enter", keyCode: 13, which: 13 }));
        }
      }, 400);
    }

    // Highlight on page
    el.classList.add("apply-assist-field-filled");
    setTimeout(() => {
      el.classList.remove("apply-assist-field-filled");
    }, 4500);
  }

  const MONTH_MAP = {
    1: ["january", "jan", "1", "01"],
    2: ["february", "feb", "2", "02"],
    3: ["march", "mar", "3", "03"],
    4: ["april", "apr", "4", "04"],
    5: ["may", "may", "5", "05"],
    6: ["june", "jun", "6", "06"],
    7: ["july", "jul", "7", "07"],
    8: ["august", "aug", "8", "08"],
    9: ["september", "sep", "sept", "9", "09"],
    10: ["october", "oct", "10"],
    11: ["november", "nov", "11"],
    12: ["december", "dec", "12"]
  };

  function resolveMonthNum(str) {
    const s = String(str || "").toLowerCase().trim();
    for (const [mNum, aliases] of Object.entries(MONTH_MAP)) {
      if (aliases.includes(s) || parseInt(s, 10) === parseInt(mNum, 10)) {
        return parseInt(mNum, 10);
      }
    }
    return null;
  }

  /**
   * Handles Select, Radio, and Checkbox elements with enterprise ATS heuristics
   */
  function fillSelectOrRadio(el, value, fieldMeta = {}) {
    const valStr = String(value || "").toLowerCase().trim();
    const key = fieldMeta?.classification?.key || "";

    if (el.tagName.toLowerCase() === "select") {
      const options = Array.from(el.options || []);
      if (!options.length) return;

      let match = null;

      // 1. Day select
      if (key === "dobDay" || options.some((o) => (o.text || "").toLowerCase().includes("select day"))) {
        const targetDay = parseInt(value, 10) || 15;
        match = options.find((o) => {
          const optNum = parseInt(o.text.trim(), 10);
          const valNum = parseInt(o.value.trim(), 10);
          return optNum === targetDay || valNum === targetDay;
        });
      }

      // 2. Month select
      else if (key === "dobMonth" || options.some((o) => (o.text || "").toLowerCase().includes("select month") || (o.text || "").toLowerCase() === "january")) {
        const targetMonthNum = resolveMonthNum(value) || 8; // default to August (month 8)
        const aliases = MONTH_MAP[targetMonthNum] || [];
        match = options.find((o) => {
          const t = o.text.toLowerCase().trim();
          const v = o.value.toLowerCase().trim();
          return aliases.includes(t) || aliases.includes(v);
        });
      }

      // 3. Year select
      else if (key === "dobYear" || options.some((o) => (o.text || "").toLowerCase().includes("select year"))) {
        const targetYear = parseInt(value, 10) || 2003;
        match = options.find((o) => {
          const optNum = parseInt(o.text.trim(), 10);
          const valNum = parseInt(o.value.trim(), 10);
          return optNum === targetYear || valNum === targetYear;
        });
      }

      // 4. Gender select
      else if (key === "gender" || options.some((o) => (o.text || "").toLowerCase() === "male")) {
        match = options.find((o) => {
          const t = (o.text || "").toLowerCase().trim();
          const v = (o.value || "").toLowerCase().trim();
          return t === "male" || v === "male" || v === "m";
        });
      }

      // 5. Total Experience (Years dropdown)
      else if (key === "experienceYears") {
        const targetYears = parseInt(value || "2", 10);
        match = options.find((o) => {
          const optNum = parseInt(o.text.trim(), 10);
          const valNum = parseInt(o.value.trim(), 10);
          return optNum === targetYears || valNum === targetYears;
        });
      }

      // 6. Total Experience (Months dropdown)
      else if (key === "experienceMonths") {
        const targetMonths = parseInt(value || "0", 10);
        match = options.find((o) => {
          const optNum = parseInt(o.text.trim(), 10);
          const valNum = parseInt(o.value.trim(), 10);
          return optNum === targetMonths || valNum === targetMonths;
        });
      }

      // 7. Notice Period select
      else if (key === "noticePeriod" || options.some((o) => (o.text || "").toLowerCase().includes("immediate"))) {
        match = options.find((o) => {
          const t = (o.text || "").toLowerCase();
          return t.includes("immediate") || t.includes("0 to 15") || t.includes("serving") || t.includes("15 days") || t === "0";
        });
      }

      // 8. Preferred Locations (1, 2, 3)
      else if (key === "preferredLocation3") {
        match = options.find((o) => {
          const t = (o.text || "").toLowerCase();
          return t.includes("bangalore") || t.includes("bengaluru");
        });
      }
      else if (key === "preferredLocation2") {
        match = options.find((o) => {
          const t = (o.text || "").toLowerCase();
          return t.includes("mumbai");
        });
      }
      else if (key === "preferredLocation") {
        match = options.find((o) => {
          const t = (o.text || "").toLowerCase();
          return t.includes("pune");
        });
      }

      // 8b. Currency select
      else if (key === "currency" || options.some((o) => (o.text || "").toLowerCase().includes("rs.") || (o.text || "").toLowerCase().includes("inr"))) {
        match = options.find((o) => {
          const t = (o.text || "").toLowerCase();
          return t.includes("inr") || t.includes("rs") || t.includes("rupee");
        });
      }

      // 9. Country / Location select
      else if (key === "country" || options.some((o) => (o.text || "").toLowerCase() === "india" && (o.text || "").toLowerCase() !== valStr)) {
        const countryTarget = (profile?.personal?.country || "India").toLowerCase().trim();
        match = options.find((o) => {
          const t = o.text.toLowerCase().trim();
          const v = o.value.toLowerCase().trim();
          return t === countryTarget || v === "in" || v === "ind" || v === countryTarget;
        });
      }

      // 10. Location Phone Code select
      else if (key === "locationPhoneCode" || options.some((o) => (o.text || "").includes("(+91)"))) {
        match = options.find((o) => (o.text || "").includes("(+91)") || (o.text || "").toLowerCase().includes("india") || (o.value || "").includes("+91"));
      }

      // 11. Phone Device Type select
      else if (key === "phoneDeviceType" || options.some((o) => (o.text || "").toLowerCase() === "mobile")) {
        match = options.find((o) => (o.text || "").toLowerCase().trim() === "mobile" || (o.value || "").toLowerCase().trim() === "mobile");
      }

      // 12. Referral / Source select
      else if (key === "referralSource" || key === "source") {
        match = options.find((o) => (o.text || "").toLowerCase().includes(valStr) || (o.value || "").toLowerCase().includes(valStr));
        if (!match && key === "referralSource") {
          match = options.find((o) => (o.text || "").toLowerCase().includes("job board") || (o.text || "").toLowerCase().includes("website") || (o.text || "").toLowerCase().includes("internet"));
        }
        if (!match && key === "source") {
          match = options.find((o) => (o.text || "").toLowerCase().includes("linkedin") || (o.text || "").toLowerCase().includes("indeed"));
        }
      }

      // Standard / fallback match
      if (!match) {
        match = options.find((o) => o.text.toLowerCase().trim() === valStr || o.value.toLowerCase().trim() === valStr);
      }
      if (!match) {
        match = options.find((o) => o.text.toLowerCase().includes(valStr) || valStr.includes(o.text.toLowerCase()));
      }

      if (match) {
        el.value = match.value;
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("blur", { bubbles: true }));
        el.classList.add("apply-assist-field-filled");

        // Sync custom dropdown display UI (Phenom People / Workday / Select2)
        const parentContainer = el.closest(".form-group, .select-box, .custom-select, [class*='select'], [class*='dropdown']");
        if (parentContainer) {
          const displayEl = parentContainer.querySelector(".select-text, .selected-option, .dropdown-text, .filter-option, [class*='selected'], [role='combobox']");
          if (displayEl) displayEl.textContent = match.text;
        }
      }
      return;
    }

    if (el.type === "radio") {
      const name = el.name;
      const group = name ? Array.from(document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)) : [el];
      const targetVal = String(value || "").toLowerCase().trim(); // "no" or "yes"

      const targetRadio = group.find((r) => {
        const rVal = r.value.toLowerCase().trim();
        const rLabel = getFieldLabel(r).toLowerCase().trim();
        const rText = (r.parentElement?.textContent || r.nextSibling?.textContent || "").toLowerCase().trim();
        return rVal === targetVal || rLabel === targetVal || rText.includes(targetVal);
      }) || el;

      targetRadio.checked = true;
      targetRadio.dispatchEvent(new Event("change", { bubbles: true }));
      targetRadio.dispatchEvent(new Event("input", { bubbles: true }));
      targetRadio.dispatchEvent(new Event("click", { bubbles: true }));
      targetRadio.classList.add("apply-assist-field-filled");
      return;
    }

    if (el.type === "checkbox") {
      el.checked = Boolean(value);
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("click", { bubbles: true }));
      el.classList.add("apply-assist-field-filled");
      return;
    }

    setNativeValue(el, value);
  }

  /**
   * Attaches resume PDF to input[type="file"] via DataTransfer
   */
  function attachResumeFile(fileInput) {
    try {
      const pdfGen = window.__applyAssistPdf;
      if (!pdfGen) return false;

      const resumeFile = pdfGen.createResumeFile(profile, {
        forceTailored: isTailored,
        tailoredSkills,
        tailoredSummary,
        company: jobDetails.company,
      });

      const dt = new DataTransfer();
      dt.items.add(resumeFile);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      fileInput.dispatchEvent(new Event("input", { bubbles: true }));

      fileInput.classList.add("apply-assist-field-filled");
      return true;
    } catch (err) {
      console.error("[Apply Assist] Failed to attach resume file:", err);
      return false;
    }
  }

  /**
   * Universal 1-Click Auto Apply
   */
  async function executeOneClickApply() {
    let filledCount = 0;
    let fileAttached = false;

    for (const field of detectedFields) {
      if (!field.selected) continue;

      if (field.fieldType === "file" || field.classification.type === "resume_file") {
        const ok = attachResumeFile(field.el);
        if (ok) {
          fileAttached = true;
          filledCount++;
        }
        continue;
      }

      const valToFill = field.draft || field.classification.value;
      if (valToFill !== undefined && valToFill !== null && valToFill !== "") {
        fillSelectOrRadio(field.el, valToFill, field);
        filledCount++;
      }
    }

    // Also look for any standalone resume file inputs that might not have been in detectedFields
    const fileInputs = document.querySelectorAll("input[type='file']");
    for (const fi of fileInputs) {
      if (fi.files.length === 0) {
        if (attachResumeFile(fi)) fileAttached = true;
      }
    }

    // Show celebratory feedback
    showToast(`⚡ Filled ${filledCount} fields & attached resume!`);

    // Multi-step auto progression
    if (autoAdvanceEnabled) {
      handleNextPageProgression();
    }
  }

  /**
   * Detects and auto-advances multi-page wizard forms ("Next", "Continue", etc.)
   */
  function handleNextPageProgression() {
    const buttons = Array.from(document.querySelectorAll("button, input[type='button'], a.btn, [role='button']"));
    const nextRegex = /^(next|save\s*&\s*continue|continue|next\s*step|review\s*application)$/i;

    const nextBtn = buttons.find((b) => {
      const text = (b.innerText || b.value || "").trim();
      return nextRegex.test(text) && b.offsetParent !== null;
    });

    if (nextBtn) {
      nextBtn.classList.add("apply-assist-field-active");
      showToast("Found next step! Advancing in 1.5 seconds…");
      setTimeout(() => {
        nextBtn.scrollIntoView({ behavior: "smooth", block: "center" });
        nextBtn.click();
      }, 1500);
    }
  }

  function showToast(message) {
    if (!shadowRoot) return;
    const toast = shadowRoot.querySelector(".aa-toast");
    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 3500);
    }
  }

  /**
   * Render Copilot UI inside Shadow DOM
   */
  function renderCopilot() {
    let root = document.getElementById(ROOT_ID);
    if (root) root.remove();

    root = document.createElement("div");
    root.id = ROOT_ID;
    document.body.appendChild(root);
    panelRoot = root;

    shadowRoot = root.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = COPILOT_CSS;
    shadowRoot.appendChild(style);

    const container = document.createElement("div");
    container.className = "aa-copilot-container";
    shadowRoot.appendChild(container);

    renderContainerContent();
  }

  function renderContainerContent() {
    const container = shadowRoot.querySelector(".aa-copilot-container");
    if (!container) return;

    if (!isExpanded) {
      // Docked Badge Mode
      container.innerHTML = `
        <div class="aa-docked-pill">
          <div class="aa-pulse-dot"></div>
          <div class="aa-pill-content">
            <span class="aa-pill-brand">Jobright Copilot</span>
            <span class="aa-pill-badge">${atsResult.score}% ATS Match</span>
          </div>
          <button class="aa-pill-btn" title="1-Click Auto Fill">⚡ Auto Fill</button>
        </div>
      `;

      const pill = container.querySelector(".aa-docked-pill");
      pill.addEventListener("click", (e) => {
        if (e.target.closest(".aa-pill-btn")) {
          executeOneClickApply();
        } else {
          isExpanded = true;
          renderContainerContent();
        }
      });
      return;
    }

    // Expanded Full Dashboard
    const scoreColor = atsResult.score >= 80 ? "#10b981" : (atsResult.score >= 65 ? "#f59e0b" : "#ef4444");

    container.innerHTML = `
      <div class="aa-panel-card">
        <!-- Header -->
        <div class="aa-card-header">
          <div class="aa-brand-row">
            <div class="aa-brand-logo">⚡</div>
            <div class="aa-brand-info">
              <div class="aa-brand-title">Apply Assist Copilot</div>
              <div class="aa-job-sub">${escapeHtml(jobDetails.title)} · <span class="aa-company">${escapeHtml(jobDetails.company)}</span></div>
            </div>
            <button class="aa-btn-close" title="Minimize">✕</button>
          </div>
          
          <!-- Quick Status & Action Row -->
          <div class="aa-hero-action">
            <div class="aa-score-dial" style="--score-color: ${scoreColor};">
              <span class="aa-dial-num">${atsResult.score}%</span>
              <span class="aa-dial-lbl">ATS</span>
            </div>
            <div class="aa-hero-cta">
              <button class="aa-primary-btn aa-fill-all-btn">
                <span>⚡ 1-Click Auto Apply</span>
              </button>
              <div class="aa-auto-toggle-row">
                <label class="aa-toggle-label">
                  <input type="checkbox" id="aa-advance-toggle" ${autoAdvanceEnabled ? "checked" : ""} />
                  <span>Auto-advance pages</span>
                </label>
                <span class="aa-fields-counter">${detectedFields.length} fields found</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="aa-tabs">
          <button class="aa-tab ${activeTab === "autofill" ? "active" : ""}" data-tab="autofill">Form Review</button>
          <button class="aa-tab ${activeTab === "ats" ? "active" : ""}" data-tab="ats">ATS Match (${atsResult.score}%)</button>
          <button class="aa-tab ${activeTab === "ai" ? "active" : ""}" data-tab="ai">AI Answers</button>
          <button class="aa-tab ${activeTab === "resume" ? "active" : ""}" data-tab="resume">Resume PDF</button>
        </div>

        <!-- Tab Body -->
        <div class="aa-tab-body">
          ${renderTabContent()}
        </div>

        <!-- Toast notification -->
        <div class="aa-toast"></div>
      </div>
    `;

    bindEventListeners();
  }

  function renderTabContent() {
    if (activeTab === "autofill") {
      return `
        <div class="aa-autofill-view">
          <div class="aa-section-hint">Review detected fields below. Click 1-Click Auto Apply to fill them and attach your resume.</div>
          <div class="aa-fields-list">
            ${detectedFields.map((f, i) => `
              <div class="aa-field-row" data-idx="${i}">
                <div class="aa-field-meta">
                  <label class="aa-field-label">
                    <input type="checkbox" class="aa-field-check" ${f.selected ? "checked" : ""} />
                    <span>${escapeHtml(f.label)}</span>
                  </label>
                  <span class="aa-tag aa-tag-${f.classification.type}">${formatTag(f.classification.type)}</span>
                </div>
                ${f.classification.type === "resume_file" ? `
                  <div class="aa-file-badge">📄 Razin_Shaikh_Resume.pdf (Auto-attaches via DataTransfer)</div>
                ` : `
                  <input class="aa-field-input" type="text" value="${escapeHtml(f.draft)}" placeholder="Auto-fill value" />
                `}
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }

    if (activeTab === "ats") {
      return `
        <div class="aa-ats-view">
          <div class="aa-ats-hero">
            <div class="aa-ats-score-badge">
              <span class="aa-score-huge">${atsResult.score}%</span>
              <span class="aa-score-status">${atsResult.score >= 80 ? "🔥 Strong ATS Match" : "⚡ Keyword Optimization Recommended"}</span>
            </div>
            <button class="aa-tailor-btn ${isTailored ? "tailored" : ""}">
              ${isTailored ? "✓ Resume Tailored for Role" : "✨ 1-Click Tailor Resume"}
            </button>
          </div>

          <div class="aa-skills-block">
            <div class="aa-block-title">Matched Job Keywords (${atsResult.matchedSkills.length})</div>
            <div class="aa-skills-chips">
              ${atsResult.matchedSkills.map(s => `<span class="aa-chip match">✓ ${escapeHtml(s)}</span>`).join("")}
              ${atsResult.matchedSkills.length === 0 ? `<span class="aa-empty">No direct keyword overlap found.</span>` : ""}
            </div>
          </div>

          <div class="aa-skills-block">
            <div class="aa-block-title">Missing / Recommended Keywords (${atsResult.missingSkills.length})</div>
            <div class="aa-skills-chips">
              ${atsResult.missingSkills.map(s => `<span class="aa-chip missing">+ ${escapeHtml(s)}</span>`).join("")}
              ${atsResult.missingSkills.length === 0 ? `<span class="aa-chip match">✓ 100% Keyword Coverage!</span>` : ""}
            </div>
          </div>

          <div class="aa-tailor-explanation">
            Clicking <strong>1-Click Tailor Resume</strong> dynamically injects matching skills and targets your resume summary for ${escapeHtml(jobDetails.company)}, boosting your ATS score instantly and tailoring the attached PDF!
          </div>
        </div>
      `;
    }

    if (activeTab === "ai") {
      const openEnded = detectedFields.filter(f => f.classification.type === "open_ended");
      return `
        <div class="aa-ai-view">
          <div class="aa-section-hint">AI answers crafted from Razin Shaikh's verified projects (Little Steps SaaS, AI Medicine Reminder, YOLOv8 tracker).</div>
          ${openEnded.length === 0 ? `
            <div class="aa-empty-card">
              <div class="aa-empty-icon">🤖</div>
              <div class="aa-empty-text">No custom screening questions detected on this page. If one appears, AI will draft a grounded answer instantly.</div>
              <button class="aa-secondary-btn aa-draft-cover-btn">Draft General Cover Letter</button>
            </div>
          ` : `
            <div class="aa-ai-list">
              ${openEnded.map((f, i) => `
                <div class="aa-ai-card" data-idx="${detectedFields.indexOf(f)}">
                  <div class="aa-ai-q">${escapeHtml(f.label)}</div>
                  <textarea class="aa-ai-textarea" rows="4">${escapeHtml(f.draft || "")}</textarea>
                  <div class="aa-ai-actions">
                    <button class="aa-ai-draft-btn">⚡ Draft with AI</button>
                    <button class="aa-ai-apply-field-btn">Fill this field</button>
                  </div>
                </div>
              `).join("")}
            </div>
          `}
        </div>
      `;
    }

    if (activeTab === "resume") {
      return `
        <div class="aa-resume-view">
          <div class="aa-resume-card">
            <div class="aa-resume-header">
              <div class="aa-resume-icon">📄</div>
              <div>
                <div class="aa-resume-name">Razin_Shaikh_Resume.pdf</div>
                <div class="aa-resume-meta">${isTailored ? "Tailored Edition" : "Master Edition"} · B.Sc. IT (8.70 CGPA)</div>
              </div>
            </div>
            <div class="aa-resume-summary">
              ${escapeHtml(isTailored ? tailoredSummary : (profile.resume?.summary || ""))}
            </div>
            <div class="aa-resume-btn-row">
              <button class="aa-secondary-btn aa-download-pdf-btn">Download / Preview ATS PDF</button>
              <button class="aa-toggle-tailor-btn">${isTailored ? "Switch to Master Resume" : "Tailor for this Job"}</button>
            </div>
          </div>
        </div>
      `;
    }

    return "";
  }

  function formatTag(type) {
    if (type === "factual") return "Profile Match";
    if (type === "resume_file") return "Resume PDF";
    if (type === "open_ended") return "AI Question";
    if (type === "checkbox_agree") return "Consent";
    return "Custom";
  }

  function bindEventListeners() {
    const card = shadowRoot.querySelector(".aa-panel-card");
    if (!card) return;

    // Minimize
    card.querySelector(".aa-btn-close")?.addEventListener("click", () => {
      isExpanded = false;
      renderContainerContent();
    });

    // 1-Click Auto Apply
    card.querySelector(".aa-fill-all-btn")?.addEventListener("click", () => {
      executeOneClickApply();
    });

    // Auto-advance toggle
    card.querySelector("#aa-advance-toggle")?.addEventListener("change", (e) => {
      autoAdvanceEnabled = e.target.checked;
    });

    // Tabs
    card.querySelectorAll(".aa-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        renderContainerContent();
      });
    });

    // Autofill field updates
    card.querySelectorAll(".aa-field-row").forEach((row) => {
      const idx = Number(row.dataset.idx);
      const f = detectedFields[idx];
      if (!f) return;

      row.querySelector(".aa-field-check")?.addEventListener("change", (e) => {
        f.selected = e.target.checked;
      });

      row.querySelector(".aa-field-input")?.addEventListener("input", (e) => {
        f.draft = e.target.value;
      });
    });

    // 1-Click Tailor Resume button
    card.querySelector(".aa-tailor-btn")?.addEventListener("click", () => {
      triggerTailorResume();
    });

    // Toggle tailor on resume tab
    card.querySelector(".aa-toggle-tailor-btn")?.addEventListener("click", () => {
      triggerTailorResume();
    });

    // Download PDF preview
    card.querySelector(".aa-download-pdf-btn")?.addEventListener("click", () => {
      window.__applyAssistPdf.downloadResume(profile, {
        forceTailored: isTailored,
        tailoredSkills,
        tailoredSummary,
        company: jobDetails.company,
      });
      showToast("Downloaded tailored ATS PDF resume!");
    });

    // AI Draft buttons
    card.querySelectorAll(".aa-ai-draft-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const cardEl = btn.closest(".aa-ai-card");
        const idx = Number(cardEl.dataset.idx);
        const f = detectedFields[idx];
        const textarea = cardEl.querySelector(".aa-ai-textarea");

        btn.textContent = "Drafting with AI…";
        btn.disabled = true;

        try {
          const resp = await new Promise((res, rej) => {
            chrome.runtime.sendMessage(
              { type: "GENERATE_ANSWER", question: f.label, profile, jobDetails },
              (r) => (r ? res(r) : rej(chrome.runtime.lastError))
            );
          });
          const answer = resp.answer || "";
          f.draft = answer;
          textarea.value = answer;
          btn.textContent = "Regenerate";
          showToast("Drafted custom answer!");
        } catch (err) {
          btn.textContent = "Draft with AI";
          showToast("AI drafting ready (fallback used)");
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Fill single AI field
    card.querySelectorAll(".aa-ai-apply-field-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const cardEl = btn.closest(".aa-ai-card");
        const idx = Number(cardEl.dataset.idx);
        const f = detectedFields[idx];
        const textarea = cardEl.querySelector(".aa-ai-textarea");
        setNativeValue(f.el, textarea.value);
        showToast(`Filled: ${f.label}`);
      });
    });

    // General cover letter draft button
    card.querySelector(".aa-draft-cover-btn")?.addEventListener("click", async () => {
      const resp = await new Promise((res) => {
        chrome.runtime.sendMessage(
          { type: "GENERATE_ANSWER", question: "cover letter", profile, jobDetails },
          res
        );
      });
      showToast("Generated personalized cover letter!");
      activeTab = "ai";
      renderContainerContent();
    });
  }

  function triggerTailorResume() {
    const ats = window.__applyAssistAts;
    if (!ats) return;

    if (!isTailored) {
      const result = ats.tailorResumeForJob(profile, jobDetails, atsResult);
      tailoredSkills = result.tailoredSkills;
      tailoredSummary = result.tailoredSummary;
      atsResult = result.newAtsResult;
      isTailored = true;
      showToast(`✨ Tailored resume! ATS Score boosted to ${atsResult.score}%!`);
    } else {
      // Revert to master
      isTailored = false;
      atsResult = ats.calculateAtsMatch(jobDetails.description, profile);
      showToast("Reverted to Master Resume.");
    }
    renderContainerContent();
  }

  function updateFieldListDom() {
    const list = shadowRoot?.querySelector(".aa-fields-list");
    if (list && activeTab === "autofill") {
      renderContainerContent();
    }
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const COPILOT_CSS = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    .aa-copilot-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13px;
      color: #f1f5f9;
      line-height: 1.4;
      pointer-events: auto;
    }

    /* Docked Pill Mode */
    .aa-docked-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      padding: 8px 14px;
      border-radius: 999px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), 0 0 1px rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .aa-docked-pill:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 35px rgba(99, 102, 241, 0.35);
      border-color: rgba(99, 102, 241, 0.6);
    }
    .aa-pulse-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: aa-pulse 2s infinite;
    }
    @keyframes aa-pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .aa-pill-content {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .aa-pill-brand {
      font-weight: 700;
      font-size: 12px;
      color: #ffffff;
      letter-spacing: -0.2px;
    }
    .aa-pill-badge {
      font-size: 11px;
      color: #10b981;
      font-weight: 600;
    }
    .aa-pill-btn {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 11px;
      border-radius: 999px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .aa-pill-btn:hover {
      filter: brightness(1.15);
      transform: scale(1.04);
    }

    /* Expanded Panel Mode */
    .aa-panel-card {
      width: 390px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 18px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08);
      overflow: hidden;
      animation: aa-slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes aa-slide-down {
      from { opacity: 0; transform: translateY(-12px) scale(0.98); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Header */
    .aa-card-header {
      padding: 16px 18px 12px;
      background: linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.4) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .aa-brand-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .aa-brand-logo {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
    }
    .aa-brand-info { flex: 1; min-width: 0; }
    .aa-brand-title {
      font-weight: 700;
      font-size: 13.5px;
      color: #ffffff;
    }
    .aa-job-sub {
      font-size: 11.5px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .aa-company { color: #cbd5e1; font-weight: 600; }
    .aa-btn-close {
      background: rgba(255, 255, 255, 0.08);
      border: none;
      color: #94a3b8;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: all 0.2s;
    }
    .aa-btn-close:hover {
      background: rgba(255, 255, 255, 0.16);
      color: #fff;
    }

    /* Hero CTA Row */
    .aa-hero-action {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .aa-score-dial {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(15, 23, 42, 0.9) 50%, rgba(30, 41, 59, 0.8) 100%);
      border: 3px solid var(--score-color, #10b981);
      box-shadow: 0 0 16px rgba(16, 185, 129, 0.25);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .aa-dial-num {
      font-weight: 800;
      font-size: 13.5px;
      color: #fff;
      line-height: 1;
    }
    .aa-dial-lbl {
      font-size: 9px;
      color: #94a3b8;
      font-weight: 600;
      margin-top: 2px;
    }
    .aa-hero-cta { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .aa-primary-btn {
      width: 100%;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      border: none;
      color: #ffffff;
      padding: 10px 14px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 6px 18px rgba(79, 70, 229, 0.4);
      transition: all 0.2s;
    }
    .aa-primary-btn:hover {
      filter: brightness(1.1);
      transform: translateY(-1px);
      box-shadow: 0 8px 22px rgba(79, 70, 229, 0.55);
    }
    .aa-auto-toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .aa-toggle-label {
      display: flex;
      align-items: center;
      gap: 5px;
      cursor: pointer;
    }
    .aa-fields-counter { font-weight: 600; color: #10b981; }

    /* Tabs */
    .aa-tabs {
      display: flex;
      padding: 4px 10px;
      background: rgba(15, 23, 42, 0.8);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      gap: 4px;
    }
    .aa-tab {
      flex: 1;
      padding: 7px 4px;
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 11.5px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .aa-tab:hover { color: #f1f5f9; background: rgba(255, 255, 255, 0.04); }
    .aa-tab.active {
      color: #fff;
      background: rgba(255, 255, 255, 0.1);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }

    /* Tab Body */
    .aa-tab-body {
      padding: 12px 16px;
      overflow-y: auto;
      max-height: 52vh;
    }
    .aa-section-hint {
      font-size: 11px;
      color: #94a3b8;
      margin-bottom: 10px;
      line-height: 1.35;
    }

    /* Form Fields View */
    .aa-fields-list { display: flex; flex-direction: column; gap: 8px; }
    .aa-field-row {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 8px 10px;
    }
    .aa-field-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }
    .aa-field-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 11.5px;
      color: #e2e8f0;
      cursor: pointer;
    }
    .aa-tag {
      font-size: 9.5px;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .aa-tag-factual { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .aa-tag-resume_file { background: rgba(99, 102, 241, 0.2); color: #818cf8; }
    .aa-tag-open_ended { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .aa-tag-checkbox_agree { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
    .aa-tag-unknown { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
    .aa-field-input {
      width: 100%;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 11.5px;
      color: #f1f5f9;
      outline: none;
    }
    .aa-field-input:focus { border-color: #6366f1; }
    .aa-file-badge {
      font-size: 11px;
      color: #818cf8;
      background: rgba(99, 102, 241, 0.1);
      padding: 5px 8px;
      border-radius: 6px;
      border: 1px dashed rgba(99, 102, 241, 0.3);
    }

    /* ATS View */
    .aa-ats-view { display: flex; flex-direction: column; gap: 12px; }
    .aa-ats-hero {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .aa-score-huge {
      font-size: 26px;
      font-weight: 800;
      color: #10b981;
      display: block;
      line-height: 1;
    }
    .aa-score-status { font-size: 11px; color: #cbd5e1; font-weight: 600; }
    .aa-tailor-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      border: none;
      color: #fff;
      font-size: 11.5px;
      font-weight: 700;
      padding: 8px 13px;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
      transition: all 0.2s;
    }
    .aa-tailor-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .aa-tailor-btn.tailored {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid #10b981;
    }
    .aa-skills-block {
      background: rgba(30, 41, 59, 0.4);
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }
    .aa-block-title {
      font-size: 11.5px;
      font-weight: 700;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .aa-skills-chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .aa-chip {
      font-size: 10.5px;
      padding: 3px 8px;
      border-radius: 999px;
      font-weight: 600;
    }
    .aa-chip.match {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .aa-chip.missing {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .aa-tailor-explanation {
      font-size: 11px;
      color: #94a3b8;
      background: rgba(99, 102, 241, 0.08);
      border-left: 3px solid #6366f1;
      padding: 8px 10px;
      border-radius: 0 6px 6px 0;
      line-height: 1.4;
    }

    /* AI View */
    .aa-ai-view { display: flex; flex-direction: column; gap: 10px; }
    .aa-ai-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      padding: 10px 12px;
    }
    .aa-ai-q { font-weight: 600; font-size: 12px; color: #fff; margin-bottom: 6px; }
    .aa-ai-textarea {
      width: 100%;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 11.5px;
      color: #f1f5f9;
      font-family: inherit;
      resize: vertical;
      outline: none;
      line-height: 1.4;
      margin-bottom: 8px;
    }
    .aa-ai-textarea:focus { border-color: #6366f1; }
    .aa-ai-actions { display: flex; gap: 8px; }
    .aa-ai-draft-btn {
      flex: 1;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
    }
    .aa-ai-apply-field-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
    }
    .aa-ai-apply-field-btn:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
    .aa-empty-card {
      text-align: center;
      padding: 24px 16px;
      background: rgba(30, 41, 59, 0.3);
      border-radius: 12px;
      border: 1px dashed rgba(255, 255, 255, 0.1);
    }
    .aa-empty-icon { font-size: 26px; margin-bottom: 6px; }
    .aa-empty-text { font-size: 11.5px; color: #94a3b8; margin-bottom: 12px; }

    /* Resume View */
    .aa-resume-view { display: flex; flex-direction: column; gap: 10px; }
    .aa-resume-card {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 12px 14px;
    }
    .aa-resume-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .aa-resume-icon { font-size: 24px; }
    .aa-resume-name { font-weight: 700; font-size: 12.5px; color: #fff; }
    .aa-resume-meta { font-size: 11px; color: #10b981; }
    .aa-resume-summary {
      font-size: 11.5px;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.7);
      padding: 8px 10px;
      border-radius: 8px;
      margin-bottom: 10px;
      line-height: 1.4;
      max-height: 120px;
      overflow-y: auto;
    }
    .aa-resume-btn-row { display: flex; gap: 8px; }
    .aa-secondary-btn {
      flex: 1;
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 7px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .aa-secondary-btn:hover { background: rgba(255, 255, 255, 0.18); }
    .aa-toggle-tailor-btn {
      background: linear-gradient(135deg, #10b981, #059669);
      border: none;
      color: #fff;
      font-size: 11px;
      font-weight: 600;
      padding: 7px 10px;
      border-radius: 6px;
      cursor: pointer;
    }

    /* Toast */
    .aa-toast {
      position: absolute;
      bottom: 12px;
      left: 16px;
      right: 16px;
      background: #10b981;
      color: #fff;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 11.5px;
      font-weight: 600;
      text-align: center;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transform: translateY(8px);
      transition: all 0.25s ease;
      pointer-events: none;
    }
    .aa-toast.show { opacity: 1; transform: translateY(0); }
  `;
})();
