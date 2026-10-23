/**
 * Apply Assist Pro — ATS Resume PDF Generator
 * 
 * Generates clean, standard ATS-compliant PDF 1.4 documents natively in pure JS.
 * Used for dynamic 1-click resume tailoring and automatic file attachment to ATS forms.
 */

(function () {
  function escapePdfText(text) {
    if (!text) return "";
    return String(text)
      .replace(/[\u2014\u2013]/g, " - ")
      .replace(/[\u2022]/g, " - ")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, " "); // Replace non-Latin1 characters
  }

  function wrapText(text, maxChars) {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = "";

    for (const w of words) {
      if ((currentLine + " " + w).trim().length <= maxChars) {
        currentLine = (currentLine + " " + w).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  function generatePdfString(profile, tailoredSkills = [], tailoredSummary = "") {
    const p = profile.personal || {};
    const edu = profile.education || {};
    const emp = profile.employment || {};
    const res = profile.resume || {};
    const links = profile.links || {};

    const summaryText = tailoredSummary || res.summary || "";
    const activeSkills = (tailoredSkills && tailoredSkills.length > 0)
      ? Array.from(new Set([...tailoredSkills, ...(res.skills || [])]))
      : (res.skills || []);

    const commands = [];
    let y = 800; // starting Y coordinate from bottom of A4 page (595 x 842)
    const marginX = 45;
    const pageWidth = 595;
    const contentWidth = pageWidth - marginX * 2; // ~505 pt

    function addText(text, size, isBold, r = 0, g = 0, b = 0) {
      const font = isBold ? "/F2" : "/F1";
      commands.push(`${font} ${size} Tf`);
      commands.push(`${r} ${g} ${b} rg`);
      commands.push(`1 0 0 1 ${marginX} ${y} Tm`);
      commands.push(`(${escapePdfText(text)}) Tj`);
    }

    function addRightText(text, size, isBold, r = 0.35, g = 0.35, b = 0.35) {
      const font = isBold ? "/F2" : "/F1";
      const clean = escapePdfText(text);
      const textWidth = clean.length * size * 0.52;
      const x = Math.max(marginX, marginX + contentWidth - textWidth);
      commands.push(`${font} ${size} Tf`);
      commands.push(`${r} ${g} ${b} rg`);
      commands.push(`1 0 0 1 ${Math.round(x)} ${y} Tm`);
      commands.push(`(${clean}) Tj`);
    }

    function addCenteredText(text, size, isBold, r = 0, g = 0, b = 0) {
      const font = isBold ? "/F2" : "/F1";
      // Approximate char width for Helvetica: ~0.55 of font size
      const textWidth = text.length * size * 0.52;
      const x = Math.max(marginX, (pageWidth - textWidth) / 2);
      commands.push(`${font} ${size} Tf`);
      commands.push(`${r} ${g} ${b} rg`);
      commands.push(`1 0 0 1 ${Math.round(x)} ${y} Tm`);
      commands.push(`(${escapePdfText(text)}) Tj`);
    }

    function addLineDivider() {
      commands.push("0.75 0.75 0.75 RG");
      commands.push("0.75 w");
      commands.push(`${marginX} ${y + 3} m ${marginX + contentWidth} ${y + 3} l S`);
    }

    // 1. Header (Name & Title)
    addCenteredText(p.fullName || "Candidate", 17, true, 0.1, 0.1, 0.15);
    y -= 15;
    addCenteredText(emp.targetRole || "Full Stack & AI Developer", 11, false, 0.3, 0.3, 0.4);
    y -= 14;

    // Contact line
    const contactLine = `${p.location || ""}  |  ${p.phone || ""}  |  ${p.email || ""}`;
    addCenteredText(contactLine, 9, false, 0.35, 0.35, 0.35);
    y -= 13;

    // Links line
    const linksLine = `Portfolio: ${links.portfolio || "razinshaikh.xyz"}  |  GitHub: ${links.github || "github.com/razinShk"}  |  Play Store  |  Kaggle`;
    addCenteredText(linksLine, 8.5, false, 0.15, 0.35, 0.7);
    y -= 18;

    // 2. Profile Summary
    addText("PROFILE SUMMARY", 10.5, true, 0.05, 0.2, 0.5);
    y -= 4;
    addLineDivider();
    y -= 11;

    const summaryLines = wrapText(summaryText, 98);
    for (const line of summaryLines.slice(0, 4)) {
      addText(line, 8.5, false, 0.15, 0.15, 0.15);
      y -= 11;
    }
    y -= 6;

    // 3. Technical Skills
    addText("TECHNICAL SKILLS", 10.5, true, 0.05, 0.2, 0.5);
    y -= 4;
    addLineDivider();
    y -= 11;

    // Split skills into readable lines
    const skillsChunks = [
      "Languages & Web: " + activeSkills.slice(0, 14).join(", "),
      "Backend & DB: " + activeSkills.slice(14, 25).join(", "),
      "AI/ML & Cloud: " + activeSkills.slice(25, 42).join(", "),
    ];
    for (const chunk of skillsChunks) {
      if (chunk.length > 20) {
        const wrapped = wrapText(chunk, 96);
        for (const w of wrapped) {
          addText(w, 8.5, false, 0.15, 0.15, 0.15);
          y -= 10.5;
        }
      }
    }
    y -= 6;

    // 4. Professional Experience
    addText("PROFESSIONAL EXPERIENCE", 10.5, true, 0.05, 0.2, 0.5);
    y -= 4;
    addLineDivider();
    y -= 12;

    addText("Freelance Full Stack & AI Developer", 9.5, true, 0.1, 0.1, 0.1);
    addRightText("Apr 2025 - Present", 8.5, false, 0.35, 0.35, 0.35);
    y -= 11;
    addText("Client Projects (Self-employed)  |  Pune, India", 8.5, false, 0.3, 0.3, 0.3);
    y -= 11;

    const bullets = (res.bullets || []).slice(0, 5);
    for (const b of bullets) {
      const wrapped = wrapText("- " + b, 94);
      for (let i = 0; i < wrapped.length; i++) {
        const indent = i > 0 ? "    " : "";
        addText(indent + wrapped[i], 8.5, false, 0.2, 0.2, 0.2);
        y -= 10.5;
      }
      y -= 2;
    }
    y -= 4;

    // 5. Selected Projects
    addText("KEY PRODUCTION PROJECTS", 10.5, true, 0.05, 0.2, 0.5);
    y -= 4;
    addLineDivider();
    y -= 12;

    const projects = (res.projects || []).slice(0, 3);
    for (const proj of projects) {
      addText(`${proj.name} (${proj.tech})`, 9, true, 0.1, 0.1, 0.15);
      addRightText(proj.status, 8, false, 0.35, 0.35, 0.35);
      y -= 10.5;
      const descWrapped = wrapText(proj.desc, 96);
      for (const dw of descWrapped) {
        addText("  " + dw, 8, false, 0.25, 0.25, 0.25);
        y -= 10;
      }
      y -= 2;
    }
    y -= 4;

    // 6. Education & Achievements
    addText("EDUCATION & ACHIEVEMENTS", 10.5, true, 0.05, 0.2, 0.5);
    y -= 4;
    addLineDivider();
    y -= 11;

    addText(`${edu.degreeFull || "B.Sc. Information Technology"} (CGPA ${edu.gpa || "8.70/10"}) - ${edu.school || "Dr. D. Y. Patil ACS College"} (${edu.startYear}-${edu.gradYear})`, 8.5, false, 0.15, 0.15, 0.15);
    y -= 11;
    addText("Selected for Build India (Anthropic, Replit & Lightspeed)  |  Intercollegiate Tech Competition Winner", 8.5, false, 0.15, 0.15, 0.15);

    // Build PDF content stream
    const streamContent = "BT\n" + commands.join("\n") + "\nET\n";

    // Assembly
    const objects = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>"); // 1
    objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"); // 2
    objects.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>"); // 3
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); // 4
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"); // 5
    objects.push(`<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`); // 6

    let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
    const offsets = [];
    for (let i = 0; i < objects.length; i++) {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (const off of offsets) {
      pdf += String(off).padStart(10, "0") + " 00000 n \n";
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xrefOffset}\n%%EOF`;

    return pdf;
  }

  function base64ToUint8Array(base64) {
    const raw = atob(base64.replace(/^data:application\/pdf;base64,/, ""));
    const uint8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }
    return uint8Array;
  }

  function createResumeBlob(profile, options = {}) {
    // If a custom base64 PDF is saved and no tailoring requested, use it
    if (profile?.meta?.customResumePdfBase64 && !options.forceTailored) {
      try {
        const u8 = base64ToUint8Array(profile.meta.customResumePdfBase64);
        return new Blob([u8], { type: "application/pdf" });
      } catch (err) {
        console.warn("[Apply Assist] Failed to load custom base64 PDF, falling back to generator:", err);
      }
    }

    const pdfString = generatePdfString(
      profile,
      options.tailoredSkills || profile?.resume?.tailoredSkills,
      options.tailoredSummary || profile?.resume?.tailoredSummary
    );

    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(pdfString.length);
    for (let i = 0; i < pdfString.length; i++) {
      bytes[i] = pdfString.charCodeAt(i) & 0xff;
    }
    return new Blob([bytes], { type: "application/pdf" });
  }

  function createResumeFile(profile, options = {}) {
    const blob = createResumeBlob(profile, options);
    const firstName = profile?.personal?.firstName || "Razin";
    const lastName = profile?.personal?.lastName || "Shaikh";
    const role = options.company ? `_${options.company}` : "";
    const filename = `${firstName}_${lastName}_Resume${role}.pdf`;
    return new File([blob], filename, {
      type: "application/pdf",
      lastModified: Date.now(),
    });
  }

  function downloadResume(profile, options = {}) {
    const blob = createResumeBlob(profile, options);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile?.personal?.firstName || "Razin"}_${profile?.personal?.lastName || "Shaikh"}_Resume.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  window.__applyAssistPdf = {
    createResumeBlob,
    createResumeFile,
    downloadResume,
    generatePdfString,
  };
})();
