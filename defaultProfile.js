/**
 * Apply Assist Pro — Default Master Profile
 * 
 * Pre-filled from Razin Shaikh's verified resume.
 * Powers universal auto-fill, ATS scoring, resume tailoring, and AI answer drafting.
 */

const DEFAULT_PROFILE = {
  personal: {
    fullName: "Razin Shaikh",
    firstName: "Razin",
    middleName: "Razin",
    lastName: "Shaikh",
    givenName: "Razin",
    familyName: "Shaikh",
    localGivenName: "Razin",
    localFamilyName: "Shaikh",
    gender: "Male",
    email: "razinshaikh3133@gmail.com",
    phone: "+91 96654 48256",
    cleanPhone: "9665448256",
    countryCode: "+91",
    locationPhoneCode: "India (+91)",
    phoneDeviceType: "Mobile",
    location: "Pune, Maharashtra, India",
    currentLocation: "Pune",
    city: "Pune",
    state: "Maharashtra",
    country: "India",
    postalCode: "411001",
    address: "Pune, Maharashtra",
    addressLine1: "Pune, Maharashtra",
    addressLine2: "",
  },
  dob: {
    day: "15",
    month: "08",
    monthName: "August",
    year: "2003",
    full: "2003-08-15",
  },
  links: {
    linkedin: "https://www.linkedin.com/in/razinshk/",
    github: "https://github.com/razinShk/",
    portfolio: "https://razinshaikh.xyz/",
    playstore: "https://play.google.com/store/apps/developer?id=Razing&hl=en_IN",
    kaggle: "https://www.kaggle.com/razinshk",
    twitter: "",
  },
  education: {
    school: "Dr. D. Y. Patil Arts, Commerce & Science College, Pune",
    degree: "Bachelor of Science",
    major: "Information Technology",
    degreeFull: "B.Sc. Information Technology",
    gpa: "8.70/10",
    startYear: "2023",
    gradYear: "2026",
    highSchool: "Geeta Mata Jr. College, Maharashtra State Board",
    highSchoolYear: "2022",
  },
  employment: {
    targetRole: "Full Stack & AI Developer",
    currentTitle: "Freelance Full Stack Developer",
    currentCompany: "Client Projects (Self-employed)",
    experienceYears: "2",
    experienceMonths: "0",
    lastDrawnSalary: "600000",
    currentSalary: "600000",
    expectedSalary: "850000",
    salaryExpectation: "850000",
    noticePeriod: "Immediate",
    currentLocation: "Pune",
    preferredLocation: "Pune",
    preferredLocation1: "Pune",
    preferredLocation2: "Mumbai",
    preferredLocation3: "Bangalore",
    currency: "Rs. - INR",
    willingToRelocate: "Yes (Remote preferred)",
    previousWorker: "No", // Have you ever worked for the company as an employee or contingent worker
  },
  workAuthorization: {
    authorized: "Yes",
    needsSponsorship: "No",
    is18OrOlder: "Yes",
    targetCountryAuth: "Yes",
  },
  eeo: {
    gender: "Male",
    race: "Asian",
    veteranStatus: "No",
    disabilityStatus: "No",
  },
  resume: {
    summary:
      "Full Stack & AI Developer with hands-on experience building and shipping production web and mobile applications, AI products, and computer vision systems. Delivered software for Little Steps, Impact School, Elite Motors & Detailing, Fast Cabs, and Shahi Motors. Published original products including Quran Meter on the App Store and AI Medicine Reminder on the Play Store. Built an autonomous AI football tracking camera using Raspberry Pi and YOLOv8. Strong across Next.js, React, React Native, TypeScript, Node.js, Python, PostgreSQL, Supabase, MongoDB, computer vision, OCR, and LLM APIs.",
    tailoredSummary: "",
    skills: [
      // Languages
      "JavaScript",
      "TypeScript",
      "Python",
      "SQL",
      "PHP",
      "Kotlin",
      // Web & Frontend
      "React",
      "Next.js",
      "React Native",
      "Expo",
      "HTML5",
      "CSS3",
      "Tailwind CSS",
      "Bootstrap",
      // Backend & DB
      "Node.js",
      "Express",
      "REST APIs",
      "PostgreSQL",
      "Supabase",
      "MongoDB",
      "MySQL",
      // AI / ML
      "YOLOv8",
      "Computer Vision",
      "OCR",
      "LLM API Integration",
      "Model Fine-tuning",
      "Speech Pipelines",
      "Prompt Engineering",
      // Cloud & Tools
      "Vercel",
      "Netlify",
      "Git",
      "GitHub",
      "CI/CD",
      "AWS",
      "Docker",
      // Engineering
      "Authentication",
      "RBAC",
      "Data Structures",
      "OOP",
      "Design Patterns",
      "Debugging",
      "Performance Optimisation",
    ],
    tailoredSkills: [],
    bullets: [
      "Built Little Steps: AI Clinic Management SaaS covering patients, appointments, prescriptions, billing, and medical history with patient web portal and mobile app (React, Expo React Native, Supabase).",
      "Added symptoms-to-disease AI analysis for triage, digital prescriptions with automatic medicine reminders, and AI-based lab-report analysis that stores extracted text to minimize storage.",
      "Shipped Impact School public website and student management system replacing paper workflows with searchable records and role-separated admin screens (React, Next.js, Node.js).",
      "Engineered Elite Motors & Detailing car rental, spare-parts management, and automated invoicing system for Fast Cabs and Shahi Motors.",
      "Built and published AI Medicine Reminder on Google Play Store (React Native, Kotlin, OCR, Vision Models, Node.js) with prescription image recognition.",
      "Built and published Quran Meter on the App Store (React, Node.js, Speech Recognition, LLM APIs) providing instant recitation analysis and summaries.",
      "Developed Third Umpire autonomous football tracking camera using YOLOv8 on Raspberry Pi 5 with servo-controlled pan/tilt camera mechanics.",
      "Selected as the only participant from Pune for Build India, organized by Anthropic, Replit, and Lightspeed. Winner of Intercollegiate Technical Competition and College Hackathon.",
    ],
    projects: [
      {
        name: "AI Medicine Reminder",
        tech: "React Native, Kotlin, OCR, Vision Model, Node.js",
        status: "Published on Play Store",
        desc: "Replaces repetitive manual medicine entry using computer vision & OCR to scan prescription images and schedule dosage reminders.",
      },
      {
        name: "Quran Meter",
        tech: "React, Node.js, Speech Recognition, LLM APIs",
        status: "Published on App Store",
        desc: "Speech-to-text and AI pipeline that analyzes live Quran recitation, returning verse meaning, summaries, and historical context.",
      },
      {
        name: "Third Umpire - AI Football Tracking Camera",
        tech: "Python, YOLOv8, Raspberry Pi 5, Servo Control",
        status: "Hardware & Edge AI",
        desc: "Autonomous computer vision camera system that tracks football gameplay and directs servo-driven cameras for automated match recording.",
      },
      {
        name: "Little Steps - AI Clinic SaaS",
        tech: "React, React Native, Supabase, Node.js",
        status: "Live in pediatric clinic",
        desc: "Complete clinic management SaaS with symptoms triage, digital prescriptions, and OCR lab report parsing.",
      },
      {
        name: "AI Fashion Designer",
        tech: "React, Node.js, Computer Vision, Virtual Try-on",
        status: "Production Prototype",
        desc: "Visual AI shopping assistant analyzing body shape, posture, and skin tone for dynamic virtual try-on.",
      },
      {
        name: "Bulk Result Generator",
        tech: "React, Node.js, Excel Parsing",
        status: "Tools",
        desc: "Parses Excel spreadsheets to generate bulk academic report cards in seconds, saving hundreds of administrative hours.",
      },
    ],
    certifications: [
      "MERN Stack Development - Code With Harry (Nov 2024 - Feb 2025)",
      "React Native Development - Code With Beto (Nov 2024 - Feb 2025)",
    ],
  },
  aiSettings: {
    provider: "replicate", // 'replicate' | 'gemini' | 'anthropic' | 'smart_offline'
    replicateToken: "",
    replicateModel: "meta/meta-llama-3-70b-instruct",
    geminiApiKey: "",
    anthropicApiKey: "",
    tone: "professional_impactful", // 'professional_impactful' | 'concise' | 'technical'
  },
  autoSettings: {
    autoDetectOnPageLoad: true,
    autoAttachResumeFile: true,
    autoAdvancePages: false, // user can toggle or click
    showFloatingBadge: true,
    highlightFilledFields: true,
  },
  meta: {
    referralSource: "Job Board",
    source: "LinkedIn",
    talentCommunityConsent: true,
    resumeFilename: "Razin_Shaikh_Resume.pdf",
    customResumePdfBase64: "", // optional custom uploaded PDF
  },
};

globalThis.DEFAULT_PROFILE = DEFAULT_PROFILE;
if (typeof module !== "undefined" && module.exports) {
  module.exports = DEFAULT_PROFILE;
}
