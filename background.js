/**
 * Apply Assist Pro — Background Service Worker
 * 
 * Handles multi-provider AI drafting (Replicate, Gemini, Anthropic, Smart Offline),
 * profile persistence, and state management.
 */

importScripts("defaultProfile.js");

// Initialize default profile on first installation
chrome.runtime.onInstalled.addListener(async () => {
  const { applyAssistProfile } = await chrome.storage.local.get(["applyAssistProfile"]);
  if (!applyAssistProfile) {
    await chrome.storage.local.set({ applyAssistProfile: DEFAULT_PROFILE });
  }
});

// Message listener
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GENERATE_ANSWER") {
    (async () => {
      try {
        const answer = await handleGenerateAnswer(msg.question, msg.profile, msg.jobDetails);
        sendResponse({ success: true, answer });
      } catch (err) {
        // Fallback to intelligent offline generation
        const fallback = generateSmartOfflineAnswer(msg.question, msg.profile, msg.jobDetails);
        sendResponse({ success: true, answer: fallback, fallbackUsed: true, error: String(err) });
      }
    })();
    return true; // Keep channel open for async response
  }

  if (msg.type === "GET_PROFILE") {
    (async () => {
      const { applyAssistProfile } = await chrome.storage.local.get(["applyAssistProfile"]);
      sendResponse({ profile: applyAssistProfile || DEFAULT_PROFILE });
    })();
    return true;
  }

  if (msg.type === "SAVE_PROFILE") {
    (async () => {
      await chrome.storage.local.set({ applyAssistProfile: msg.profile });
      sendResponse({ success: true });
    })();
    return true;
  }
});

/**
 * Routes question to selected AI provider (Replicate, Gemini, Anthropic, or Offline).
 */
async function handleGenerateAnswer(question, profile, jobDetails) {
  const p = profile || DEFAULT_PROFILE;
  const aiSettings = p.aiSettings || {};
  const provider = aiSettings.provider || "replicate";

  if (provider === "replicate" && aiSettings.replicateToken) {
    return await callReplicate(question, p, jobDetails, aiSettings.replicateToken, aiSettings.replicateModel);
  } else if (provider === "gemini" && aiSettings.geminiApiKey) {
    return await callGemini(question, p, jobDetails, aiSettings.geminiApiKey);
  } else if (provider === "anthropic" && aiSettings.anthropicApiKey) {
    return await callAnthropic(question, p, jobDetails, aiSettings.anthropicApiKey);
  }

  // If no API key configured, use built-in Smart Offline Engine
  return generateSmartOfflineAnswer(question, p, jobDetails);
}

/**
 * Replicate API Integration
 */
async function callReplicate(question, profile, jobDetails, token, model = "meta/meta-llama-3-70b-instruct") {
  const promptContext = buildPromptContext(question, profile, jobDetails);

  const res = await fetch("https://api.replicate.com/v1/models/meta/meta-llama-3-70b-instruct/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "wait"
    },
    body: JSON.stringify({
      input: {
        prompt: promptContext,
        max_tokens: 350,
        temperature: 0.7,
      }
    })
  });

  if (!res.ok) {
    throw new Error(`Replicate API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  if (Array.isArray(data.output)) {
    return data.output.join("").trim();
  } else if (typeof data.output === "string") {
    return data.output.trim();
  }
  return generateSmartOfflineAnswer(question, profile, jobDetails);
}

/**
 * Google Gemini API Integration
 */
async function callGemini(question, profile, jobDetails, apiKey) {
  const promptContext = buildPromptContext(question, profile, jobDetails);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptContext }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 }
    })
  });

  if (!res.ok) {
    throw new Error(`Gemini API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return candidate ? candidate.trim() : generateSmartOfflineAnswer(question, profile, jobDetails);
}

/**
 * Anthropic Claude API Integration
 */
async function callAnthropic(question, profile, jobDetails, apiKey) {
  const promptContext = buildPromptContext(question, profile, jobDetails);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 400,
      system: "You are a job application assistant drafting natural, confident, first-person answers. Only use real facts from candidate experience.",
      messages: [{ role: "user", content: promptContext }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const textBlock = (data.content || []).find((b) => b.type === "text");
  return textBlock ? textBlock.text.trim() : generateSmartOfflineAnswer(question, profile, jobDetails);
}

/**
 * Builds standard system context for LLMs
 */
function buildPromptContext(question, profile, jobDetails) {
  const p = profile || DEFAULT_PROFILE;
  const jobTitle = jobDetails?.title || p.employment?.targetRole || "Software Engineer";
  const company = jobDetails?.company || "the company";

  return `
You are drafting an application answer for candidate ${p.personal?.fullName || "Razin Shaikh"}.
Target Role: ${jobTitle} at ${company}.
Candidate Background:
- Role: Full Stack & AI Developer with 2+ years experience building production web/mobile apps and AI pipelines.
- Production apps: Little Steps (AI Clinic SaaS), Impact School, Elite Motors, Fast Cabs.
- Published apps: AI Medicine Reminder (Play Store - React Native, OCR, Vision), Quran Meter (App Store - React, Speech AI).
- Edge AI: Autonomous football tracking camera with YOLOv8 on Raspberry Pi 5.
- Core Skills: Next.js, React, Node.js, Python, TypeScript, PostgreSQL, Supabase, Computer Vision, OCR, LLM APIs.
- Achievements: Selected from Pune for Build India (Anthropic, Replit & Lightspeed), hackathon winner.

Question to answer: "${question}"

Instructions:
- Write in the first person ("I").
- Keep it concise, high-impact, and professional (2-4 sentences or a concise paragraph).
- Connect directly to the candidate's real projects and skills.
- Do NOT fabricate non-existent companies or degrees.
`.trim();
}

/**
 * Smart Offline Answer Generator
 * Generates immediate, articulate answers grounded in Razin Shaikh's verified resume.
 */
function generateSmartOfflineAnswer(question, profile, jobDetails) {
  const q = (question || "").toLowerCase();
  const company = jobDetails?.company || "your team";
  const role = jobDetails?.title || "Full Stack & AI Developer";

  // Cover letter / Intro
  if (q.includes("cover letter") || q.includes("introduce yourself")) {
    return `I am excited to apply for the ${role} position at ${company}. As a Full Stack & AI Developer, I have built and shipped production software for real businesses—including Little Steps (an AI Clinic Management SaaS with automated triage and prescriptions) and custom full-stack portals for automotive and education clients. I have also published original applications like AI Medicine Reminder on the Play Store (leveraging OCR and vision models) and Quran Meter on the App Store. With strong hands-on experience in React, Next.js, TypeScript, Python, and AI integrations, I look forward to contributing scalable engineering and practical AI solutions to ${company}.`;
  }

  // Why work here / What excites you
  if (q.includes("why") && (q.includes("work") || q.includes("join") || q.includes("interested") || q.includes("company") || q.includes("role"))) {
    return `I am drawn to ${company} because of your commitment to building high-impact products. In my work delivering production web and AI applications—such as Little Steps clinic management and edge AI tracking systems—I have focused on shipping reliable software that directly solves user problems. The opportunity to leverage my full-stack background in Next.js, Node.js, Python, and AI pipelines to tackle challenging problems at ${company} aligns perfectly with where I excel and want to grow.`;
  }

  // Challenging project / Problem solved
  if (q.includes("challenge") || q.includes("proud") || q.includes("project") || q.includes("accomplishment")) {
    return `One project I am especially proud of is Third Umpire, an autonomous football tracking camera I built using YOLOv8 on a Raspberry Pi 5 with servo-controlled pan/tilt mechanisms. Eliminating the need for a manual camera operator required training custom computer vision models to track the ball accurately despite high speeds and occlusion, then optimizing inference on resource-constrained edge hardware. Another highlight was building Little Steps AI Clinic SaaS, where I engineered automated OCR lab-report text extraction to minimize cloud storage costs by 80% while delivering instant diagnostic summaries.`;
  }

  // Experience with React / Next.js / Frontend
  if (q.includes("react") || q.includes("next") || q.includes("frontend") || q.includes("ui")) {
    return `I have deep hands-on experience with React, Next.js, TypeScript, and modern styling libraries (Tailwind CSS). I have built full customer-facing portals, student management systems, and cross-platform mobile apps using React Native and Expo, always prioritizing responsive layouts, snappy state management, and optimized rendering performance.`;
  }

  // Experience with Python / AI / Machine Learning
  if (q.includes("python") || q.includes("ai") || q.includes("machine learning") || q.includes("ml") || q.includes("vision")) {
    return `I regularly build with Python for computer vision and LLM pipelines, including custom YOLOv8 model training, OpenCV pipelines, and LLM API integrations for structured data extraction and speech analysis. My work spans edge deployments on Raspberry Pi as well as cloud-hosted AI APIs on Vercel and Netlify.`;
  }

  // Notice period / Start date
  if (q.includes("notice") || q.includes("start") || q.includes("availability") || q.includes("when can")) {
    return `I am available to join immediately or within 15 days of receiving an offer.`;
  }

  // Salary expectation
  if (q.includes("salary") || q.includes("compensation") || q.includes("ctc")) {
    return `My salary expectations are competitive and negotiable based on the overall role responsibilities and compensation package.`;
  }

  // Generic fallback grounded in candidate's profile
  return `Throughout my experience delivering production web, mobile, and AI solutions, I prioritize writing clean, maintainable code and solving core business bottlenecks. I bring strong experience with modern TypeScript/Next.js stacks, Python/AI integrations, and database architectures, and I am eager to apply these skills to deliver immediate value for this role at ${company}.`;
}
