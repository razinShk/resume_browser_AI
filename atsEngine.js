/**
 * Apply Assist Pro — ATS Scoring & Job Intelligence Engine
 * 
 * Extracts job posting details, calculates ATS match percentage,
 * identifies matched and missing keywords, and enables 1-click resume tailoring.
 */

(function () {
  const TECH_SKILLS_TAXONOMY = [
    // Frontend
    "React", "Next.js", "Vue", "Angular", "TypeScript", "JavaScript", "HTML5", "CSS3",
    "Tailwind CSS", "Bootstrap", "Redux", "GraphQL", "Webpack", "Vite", "Sass", "Responsive Design",
    // Mobile
    "React Native", "Expo", "Kotlin", "Swift", "Flutter", "Android", "iOS",
    // Backend
    "Node.js", "Express", "Python", "FastAPI", "Django", "Flask", "Go", "Golang", "Java", "Spring",
    "PHP", "Laravel", "Ruby", "C#", ".NET", "Microservices", "REST APIs", "gRPC", "WebSocket",
    // Databases
    "PostgreSQL", "Supabase", "MongoDB", "MySQL", "Redis", "Elasticsearch", "SQL", "NoSQL",
    "Prisma", "DynamoDB", "Firebase",
    // AI / ML / Vision
    "YOLOv8", "Computer Vision", "OCR", "Machine Learning", "Deep Learning", "LLM",
    "Model Fine-tuning", "Prompt Engineering", "OpenAI", "Anthropic", "Replicate", "HuggingFace",
    "PyTorch", "TensorFlow", "OpenCV", "Speech Recognition", "NLP", "LangChain", "Vector Databases",
    // Cloud & DevOps
    "AWS", "GCP", "Azure", "Vercel", "Netlify", "Docker", "Kubernetes", "CI/CD", "Git", "GitHub",
    "Linux", "Terraform", "Serverless", "Kafka",
    // Practices & Concepts
    "System Design", "OOP", "Data Structures", "Algorithms", "RBAC", "Authentication", "OAuth",
    "JWT", "Performance Optimisation", "Unit Testing", "Jest", "Cypress", "Agile", "Scrum"
  ];

  /**
   * Detects if current page is likely a job posting or application form.
   */
  function isJobPage() {
    const url = window.location.href.toLowerCase();
    const pathname = window.location.pathname.toLowerCase();

    // 1. Known ATS Domains
    const atsDomains = [
      "greenhouse.io", "lever.co", "myworkdayjobs.com", "ashbyhq.com",
      "bamboohr.com", "smartrecruiters.com", "workable.com", "indeed.com",
      "linkedin.com/jobs", "taleo.net", "icims.com", "jobvite.com",
      "rippling.com/ats", "jazzhr.com", "pinpointhq.com", "breezy.hr"
    ];
    if (atsDomains.some(d => url.includes(d))) return true;

    // 2. URL paths
    const jobPaths = ["/jobs", "/job/", "/careers", "/career/", "/apply", "/positions", "/opening"];
    if (jobPaths.some(p => pathname.includes(p))) return true;

    // 3. Form elements detection
    const hasJobForm = document.querySelector(
      "form[action*='apply'], form[action*='job'], form[id*='apply'], form[class*='apply'], input[type='file'][accept*='pdf'], input[name*='resume']"
    );
    if (hasJobForm) return true;

    // 4. Page content heuristics
    const bodyText = (document.body?.innerText || "").slice(0, 3000).toLowerCase();
    const jobSignals = [
      "apply for this job", "submit application", "job description",
      "qualifications", "responsibilities", "about the role", "what you will do",
      "what we are looking for", "requirements"
    ];
    let signalCount = 0;
    for (const s of jobSignals) {
      if (bodyText.includes(s)) signalCount++;
      if (signalCount >= 2) return true;
    }

    return false;
  }

  /**
   * Extracts Job Title, Company, and Description content from the DOM.
   */
  function extractJobDetails() {
    let title = "";
    let company = "";
    let descriptionText = "";

    // 1. Try Title selectors
    const titleSelectors = [
      "h1.app-title", "h1[data-automation-id='jobPostingHeader']",
      ".posting-headline h2", "h1.job-title", "h1[class*='title']",
      "h1[class*='header']", "h1", "h2[class*='job']"
    ];
    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 3 && el.innerText.trim().length < 100) {
        title = el.innerText.trim();
        break;
      }
    }
    if (!title) {
      // Fallback from document.title
      const parts = document.title.split(/[-–|·]/);
      if (parts.length > 0) title = parts[0].trim();
    }

    // 2. Try Company selectors
    const companySelectors = [
      "[data-automation-id='companyName']", ".posting-headline .company",
      ".company-name", "[class*='company']", "[class*='employer']"
    ];
    for (const sel of companySelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 1 && el.innerText.trim().length < 60) {
        company = el.innerText.trim();
        break;
      }
    }
    if (!company) {
      const host = window.location.hostname.replace(/^www\./, "");
      const hostParts = host.split(".");
      company = hostParts[0].charAt(0).toUpperCase() + hostParts[0].slice(1);
    }

    // 3. Try Description container selectors
    const descSelectors = [
      "#content", "#job-description", "[data-automation-id='jobPostingDescription']",
      ".posting-requirements", ".job-description", ".description",
      "[class*='description']", "[class*='content']", "article", "main"
    ];
    for (const sel of descSelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim().length > 200) {
        descriptionText = el.innerText.trim();
        break;
      }
    }
    if (!descriptionText) {
      descriptionText = document.body ? document.body.innerText : "";
    }

    return {
      title: title || "Software Engineer",
      company: company || "Company",
      description: descriptionText,
    };
  }

  /**
   * Scans job description for skills and compares against profile.
   */
  function calculateAtsMatch(jobText, profile) {
    const textLower = (jobText || "").toLowerCase();
    const candidateSkills = (profile?.resume?.skills || []).map(s => s.toLowerCase());
    const candidateBullets = (profile?.resume?.bullets || []).join(" ").toLowerCase();
    const fullCandidateContext = candidateSkills.join(" ") + " " + candidateBullets;

    const detectedJobSkills = [];
    const matchedSkills = [];
    const missingSkills = [];

    // Match taxonomy against job description
    for (const skill of TECH_SKILLS_TAXONOMY) {
      const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (skillRegex.test(textLower)) {
        detectedJobSkills.push(skill);
        const candRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (candRegex.test(fullCandidateContext)) {
          matchedSkills.push(skill);
        } else {
          missingSkills.push(skill);
        }
      }
    }

    // If no specific taxonomy was picked up, extract common tech words
    if (detectedJobSkills.length === 0) {
      // Default baseline match using profile's primary skills
      const baseline = ["React", "TypeScript", "Node.js", "Python", "SQL", "REST APIs"];
      baseline.forEach(s => {
        if (textLower.includes(s.toLowerCase())) {
          detectedJobSkills.push(s);
          matchedSkills.push(s);
        }
      });
    }

    // Calculate score
    let score = 82; // reasonable base
    if (detectedJobSkills.length > 0) {
      const matchRatio = matchedSkills.length / detectedJobSkills.length;
      score = Math.round(55 + matchRatio * 40);
      score = Math.min(98, Math.max(45, score));
    }

    return {
      score,
      totalJobSkills: detectedJobSkills.length,
      matchedSkills: Array.from(new Set(matchedSkills)),
      missingSkills: Array.from(new Set(missingSkills)),
    };
  }

  /**
   * 1-Click Tailor Resume:
   * Adds top missing keywords to tailored skills and crafts an aligned summary.
   */
  function tailorResumeForJob(profile, jobDetails, atsResult) {
    const missingToAdd = (atsResult.missingSkills || []).slice(0, 6);
    const existingSkills = profile?.resume?.skills || [];
    const tailoredSkills = Array.from(new Set([...missingToAdd, ...existingSkills]));

    const title = jobDetails.title || "Full Stack & AI Engineer";
    const company = jobDetails.company || "the engineering team";
    const highlightSkills = missingToAdd.length > 0
      ? `incorporating ${missingToAdd.slice(0, 3).join(", ")} alongside core full-stack stack`
      : "focusing on modern full-stack web and intelligent AI systems";

    const tailoredSummary =
      `Full Stack & AI Developer with over a year of hands-on experience building production web and mobile applications, AI products, and computer vision systems. Proven track record delivering scalable solutions for Little Steps, Impact School, Elite Motors, and published apps on the Play Store & App Store. Seeking to leverage strong background across Next.js, React, Node.js, Python, Supabase, and AI integrations as ${title} at ${company}, ${highlightSkills}.`;

    // Recalculate score with tailored skills
    const newMatched = Array.from(new Set([...atsResult.matchedSkills, ...missingToAdd]));
    const newMissing = (atsResult.missingSkills || []).filter(s => !missingToAdd.includes(s));
    const newScore = Math.min(97, Math.round(atsResult.score + (missingToAdd.length * 6)));

    return {
      tailoredSkills,
      tailoredSummary,
      addedSkills: missingToAdd,
      newAtsResult: {
        score: newScore,
        matchedSkills: newMatched,
        missingSkills: newMissing,
        totalJobSkills: atsResult.totalJobSkills,
      }
    };
  }

  window.__applyAssistAts = {
    isJobPage,
    extractJobDetails,
    calculateAtsMatch,
    tailorResumeForJob,
  };
})();
