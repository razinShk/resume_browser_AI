/**
 * Apply Assist Pro — Popup Controller
 * 
 * Manages profile editing, resume upload & PDF generation,
 * AI API keys (Replicate/Gemini/Anthropic), and live ATS scoring.
 */

let currentProfile = null;

document.addEventListener("DOMContentLoaded", async () => {
  currentProfile = await loadSavedProfile();
  initNavigation();
  populateUi(currentProfile);
  bindEvents();
});

function loadSavedProfile() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["applyAssistProfile"], (res) => {
      resolve(res.applyAssistProfile || window.DEFAULT_PROFILE || {});
    });
  });
}

function saveProfile(profile) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ applyAssistProfile: profile }, () => {
      showToast("Profile changes saved successfully ✓");
      resolve();
    });
  });
}

function showToast(message) {
  const toast = document.getElementById("popup-toast");
  if (toast) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  }
}

function initNavigation() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      const target = document.getElementById(targetId);
      if (target) target.classList.add("active");
    });
  });
}

function getByPath(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function setByPath(obj, path, value) {
  const keys = path.split(".");
  let cur = obj;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) {
      cur[k] = value;
    } else {
      cur[k] = cur[k] || {};
      cur = cur[k];
    }
  });
}

function populateUi(p) {
  // 1. Overview Tab
  document.getElementById("overview-name").textContent = p.personal?.fullName || "Razin Shaikh";
  document.getElementById("overview-role").textContent = p.employment?.targetRole || "Full Stack & AI Developer";
  document.getElementById("skills-count").textContent = (p.resume?.skills || []).length;

  // 2. Profile Form Inputs
  const form = document.getElementById("profile-form");
  Array.from(form.elements).forEach((el) => {
    if (!el.name) return;
    const val = getByPath(p, el.name);
    if (val !== undefined && val !== null) {
      el.value = val;
    }
  });

  // 3. Resume Tab Inputs
  document.getElementById("edit-resume-summary").value = p.resume?.summary || "";
  document.getElementById("edit-resume-skills").value = (p.resume?.skills || []).join(", ");
  document.getElementById("edit-resume-bullets").value = (p.resume?.bullets || []).join("\n");

  const pdfLabel = document.getElementById("current-pdf-label");
  if (p.meta?.customResumePdfBase64) {
    pdfLabel.textContent = `Using custom uploaded PDF: ${p.meta.resumeFilename || "Resume.pdf"}`;
  } else {
    pdfLabel.textContent = `Using ATS Engine: ${p.personal?.firstName || "Razin"}_Resume.pdf`;
  }

  // 4. AI & APIs Tab
  const aiSettings = p.aiSettings || {};
  const aiSelect = document.getElementById("ai-provider-select");
  aiSelect.value = aiSettings.provider || "replicate";
  updateAiTokenFields(aiSelect.value);

  document.getElementById("replicate-token-input").value = aiSettings.replicateToken || "";
  document.getElementById("gemini-key-input").value = aiSettings.geminiApiKey || "";
  document.getElementById("anthropic-key-input").value = aiSettings.anthropicApiKey || "";
  document.getElementById("ai-tone-select").value = aiSettings.tone || "professional_impactful";

  // Automation preferences
  const autoSettings = p.autoSettings || {};
  document.getElementById("pref-auto-detect").checked = autoSettings.autoDetectOnPageLoad !== false;
  document.getElementById("pref-auto-attach").checked = autoSettings.autoAttachResumeFile !== false;
  document.getElementById("pref-auto-advance").checked = autoSettings.autoAdvancePages !== false;
}

function updateAiTokenFields(provider) {
  document.getElementById("group-replicate").style.display = provider === "replicate" ? "block" : "none";
  document.getElementById("group-gemini").style.display = provider === "gemini" ? "block" : "none";
  document.getElementById("group-anthropic").style.display = provider === "anthropic" ? "block" : "none";
}

function bindEvents() {
  // Provider Select Change
  document.getElementById("ai-provider-select").addEventListener("change", (e) => {
    updateAiTokenFields(e.target.value);
  });

  // Profile Form Submit
  document.getElementById("profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    Array.from(form.elements).forEach((el) => {
      if (!el.name) return;
      setByPath(currentProfile, el.name, el.value.trim());
    });
    await saveProfile(currentProfile);
    populateUi(currentProfile);
  });

  // Reset to Defaults
  document.getElementById("btn-reset-profile").addEventListener("click", async () => {
    currentProfile = JSON.parse(JSON.stringify(window.DEFAULT_PROFILE));
    await saveProfile(currentProfile);
    populateUi(currentProfile);
    showToast("Reset to master resume profile!");
  });

  // Save Resume Content
  document.getElementById("btn-save-resume-content").addEventListener("click", async () => {
    currentProfile.resume = currentProfile.resume || {};
    currentProfile.resume.summary = document.getElementById("edit-resume-summary").value.trim();

    const skillsRaw = document.getElementById("edit-resume-skills").value;
    currentProfile.resume.skills = skillsRaw.split(",").map((s) => s.trim()).filter(Boolean);

    const bulletsRaw = document.getElementById("edit-resume-bullets").value;
    currentProfile.resume.bullets = bulletsRaw.split("\n").map((s) => s.trim()).filter(Boolean);

    await saveProfile(currentProfile);
    showToast("Resume content saved!");
  });

  // Save AI & Automation Settings
  document.getElementById("btn-save-ai-settings").addEventListener("click", async () => {
    currentProfile.aiSettings = currentProfile.aiSettings || {};
    currentProfile.aiSettings.provider = document.getElementById("ai-provider-select").value;
    currentProfile.aiSettings.replicateToken = document.getElementById("replicate-token-input").value.trim();
    currentProfile.aiSettings.geminiApiKey = document.getElementById("gemini-key-input").value.trim();
    currentProfile.aiSettings.anthropicApiKey = document.getElementById("anthropic-key-input").value.trim();
    currentProfile.aiSettings.tone = document.getElementById("ai-tone-select").value;

    currentProfile.autoSettings = currentProfile.autoSettings || {};
    currentProfile.autoSettings.autoDetectOnPageLoad = document.getElementById("pref-auto-detect").checked;
    currentProfile.autoSettings.autoAttachResumeFile = document.getElementById("pref-auto-attach").checked;
    currentProfile.autoSettings.autoAdvancePages = document.getElementById("pref-auto-advance").checked;

    await saveProfile(currentProfile);
    showToast("AI & Automation settings updated!");
  });

  // Download ATS PDF (Overview & Resume tab)
  document.getElementById("btn-preview-pdf").addEventListener("click", () => {
    window.__applyAssistPdf.downloadResume(currentProfile);
  });
  document.getElementById("btn-download-active-pdf").addEventListener("click", () => {
    window.__applyAssistPdf.downloadResume(currentProfile);
  });

  // Quick Tailor Button
  document.getElementById("btn-quick-tailor").addEventListener("click", () => {
    window.__applyAssistPdf.downloadResume(currentProfile, {
      tailoredSkills: ["Docker", "Kubernetes", "GraphQL", "AWS"],
      tailoredSummary: `Full Stack & AI Developer specializing in scalable Next.js, Node.js, and cloud AI architectures.`,
    });
    showToast("Downloaded tailored ATS PDF resume!");
  });

  // PDF Dropzone & Upload
  const dropZone = document.getElementById("pdf-drop-zone");
  const fileInput = document.getElementById("pdf-file-input");

  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#6366f1";
  });
  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "rgba(99, 102, 241, 0.4)";
  });
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "rgba(99, 102, 241, 0.4)";
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedPdf(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadedPdf(e.target.files[0]);
    }
  });

  // Live ATS Tester
  document.getElementById("btn-run-ats-test").addEventListener("click", () => {
    const text = document.getElementById("ats-test-input").value.trim();
    if (!text) {
      showToast("Please paste a job description first.");
      return;
    }

    const ats = window.__applyAssistAts;
    const result = ats ? ats.calculateAtsMatch(text, currentProfile) : { score: 88, matchedSkills: ["React", "Node.js", "Python"], missingSkills: ["Docker"] };

    const resultsBox = document.getElementById("ats-test-results");
    resultsBox.style.display = "block";

    document.getElementById("test-score-val").textContent = `${result.score}%`;
    document.getElementById("test-grade-val").textContent = result.score >= 80 ? "🔥 Strong ATS Match" : "⚡ Keyword Alignment Recommended";

    const matchedContainer = document.getElementById("test-matched-chips");
    matchedContainer.innerHTML = result.matchedSkills
      .map((s) => `<span class="chip match">✓ ${s}</span>`)
      .join("");
    if (!result.matchedSkills.length) matchedContainer.innerHTML = "<span style='color:#94a3b8; font-size:11px;'>No direct keywords found</span>";

    const missingContainer = document.getElementById("test-missing-chips");
    missingContainer.innerHTML = result.missingSkills
      .map((s) => `<span class="chip missing">+ ${s}</span>`)
      .join("");
    if (!result.missingSkills.length) missingContainer.innerHTML = "<span class='chip match'>✓ All required skills matched!</span>";
  });
}

function handleUploadedPdf(file) {
  if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
    showToast("Please upload a valid PDF file.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    currentProfile.meta = currentProfile.meta || {};
    currentProfile.meta.customResumePdfBase64 = base64;
    currentProfile.meta.resumeFilename = file.name;

    await saveProfile(currentProfile);
    document.getElementById("current-pdf-label").textContent = `Using custom uploaded PDF: ${file.name}`;
    showToast(`Saved ${file.name}! Extension will attach this to applications.`);
  };
  reader.readAsDataURL(file);
}
