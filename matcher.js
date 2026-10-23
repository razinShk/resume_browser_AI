/**
 * Apply Assist Pro — Universal ATS Form Matcher Engine
 * 
 * Accurately matches input fields across Greenhouse, Lever, Workday, Phenom People,
 * Ashby, BambooHR, SmartRecruiters, Indeed, LinkedIn, Taleo, and custom careers sites.
 */

(function () {
  const PATTERNS = [
    // 1. Date of Birth (Day, Month, Year, Full)
    {
      key: "dobDay",
      profilePath: "dob.day",
      tests: [/^day\*?$/i, /birth\s*day/i, /dob.*day/i, /select\s*day/i, /date\s*of\s*birth.*day/i, /day\s*of\s*birth/i, /^dd$/i, /bday/i],
    },
    {
      key: "dobMonth",
      profilePath: "dob.monthName",
      tests: [/^month\*?$/i, /birth\s*month/i, /dob.*month/i, /select\s*month/i, /date\s*of\s*birth.*month/i, /month\s*of\s*birth/i, /^mm$/i, /bmonth/i],
    },
    {
      key: "dobYear",
      profilePath: "dob.year",
      tests: [/^year\*?$/i, /birth\s*year/i, /dob.*year/i, /select\s*year/i, /date\s*of\s*birth.*year/i, /year\s*of\s*birth/i, /^yyyy$/i, /byear/i],
    },
    {
      key: "dobFull",
      profilePath: "dob.full",
      tests: [/date\s*of\s*birth/i, /birth\s*date/i, /\bdob\b/i],
    },

    // 2. Name fields
    {
      key: "firstName",
      profilePath: "personal.firstName",
      tests: [/first\s*name/i, /given\s*name/i, /local\s*given\s*name/i, /fname/i, /first$/i],
    },
    {
      key: "middleName",
      profilePath: "personal.middleName",
      tests: [/middle\s*name/i, /mname/i, /second\s*name/i],
    },
    {
      key: "lastName",
      profilePath: "personal.lastName",
      tests: [/last\s*name/i, /family\s*name/i, /local\s*family\s*name/i, /surname/i, /lname/i, /last$/i],
    },
    {
      key: "fullName",
      profilePath: "personal.fullName",
      tests: [/full\s*name/i, /^name\*?$/i, /your\s*name/i, /candidate\s*name/i],
    },

    // 3. Contact fields
    {
      key: "email",
      profilePath: "personal.email",
      tests: [/e-?mail/i, /email\s*address/i],
    },
    {
      key: "phoneDeviceType",
      profilePath: "personal.phoneDeviceType",
      tests: [/phone\s*device\s*type/i, /device\s*type/i, /phone\s*type/i],
    },
    {
      key: "locationPhoneCode",
      profilePath: "personal.locationPhoneCode",
      tests: [/location\s*phone\s*code/i, /phone\s*code/i, /country\s*phone\s*code/i, /dial\s*code/i, /country\s*code/i],
    },
    {
      key: "phone",
      profilePath: "personal.cleanPhone",
      tests: [/phone\s*number/i, /^phone\*?$/i, /mobile/i, /contact\s*number/i, /telephone/i, /cell/i],
    },
    {
      key: "phoneExtension",
      profilePath: null,
      tests: [/phone\s*extension/i, /extension$/i],
    },

    // 4. Address & Location
    {
      key: "country",
      profilePath: "personal.country",
      tests: [/^location\*?$/i, /country$/i, /country\s*of\s*residence/i, /nationality/i, /location\s*\(country\)/i],
    },
    {
      key: "currentLocation",
      profilePath: "employment.currentLocation",
      tests: [/current\s*location/i, /type\s*location/i, /present\s*location/i],
    },
    {
      key: "location",
      profilePath: "personal.location",
      tests: [/where\s*are\s*you\s*based/i, /location\s*summary/i],
    },
    {
      key: "preferredLocation3",
      profilePath: "employment.preferredLocation3",
      tests: [/preferred\s*location\s*3/i, /third\s*preference.*location/i, /location\s*preference\s*3/i],
    },
    {
      key: "preferredLocation2",
      profilePath: "employment.preferredLocation2",
      tests: [/preferred\s*location\s*2/i, /second\s*preference.*location/i, /location\s*preference\s*2/i],
    },
    {
      key: "preferredLocation",
      profilePath: "employment.preferredLocation",
      tests: [/preferred\s*location/i, /preference.*location/i, /desired\s*location/i],
    },
    {
      key: "city",
      profilePath: "personal.city",
      tests: [/^city\*?$/i, /town/i],
    },
    {
      key: "state",
      profilePath: "personal.state",
      tests: [/^state\*?$/i, /province/i, /region/i],
    },
    {
      key: "postalCode",
      profilePath: "personal.postalCode",
      tests: [/postal\s*code/i, /zip\s*code/i, /pincode/i, /^zip\*?$/i],
    },
    {
      key: "address",
      profilePath: "personal.addressLine1",
      tests: [/address\s*line\s*1/i, /street\s*address/i, /^address\*?$/i, /residential\s*address/i],
    },
    {
      key: "addressLine2",
      profilePath: "personal.addressLine2",
      tests: [/address\s*line\s*2/i, /apartment|suite|unit/i],
    },

    // 5. Social & Portfolio Links
    {
      key: "linkedin",
      profilePath: "links.linkedin",
      tests: [/linkedin/i, /linked\s*in/i],
    },
    {
      key: "github",
      profilePath: "links.github",
      tests: [/github/i, /git\s*hub/i],
    },
    {
      key: "portfolio",
      profilePath: "links.portfolio",
      tests: [/portfolio/i, /personal\s*website/i, /personal\s*url/i, /blog/i, /website/i],
    },
    {
      key: "playstore",
      profilePath: "links.playstore",
      tests: [/play\s*store/i, /app\s*store/i, /mobile\s*app\s*link/i],
    },
    {
      key: "kaggle",
      profilePath: "links.kaggle",
      tests: [/kaggle/i],
    },
    {
      key: "twitter",
      profilePath: "links.twitter",
      tests: [/twitter/i, /\bx\b/i, /social\s*media/i],
    },

    // 6. Education
    {
      key: "school",
      profilePath: "education.school",
      tests: [/school/i, /university/i, /college/i, /institution/i],
    },
    {
      key: "degree",
      profilePath: "education.degreeFull",
      tests: [/degree/i, /highest\s*qualification/i, /level\s*of\s*education/i],
    },
    {
      key: "major",
      profilePath: "education.major",
      tests: [/major/i, /field\s*of\s*study/i, /discipline/i, /specialization/i],
    },
    {
      key: "gpa",
      profilePath: "education.gpa",
      tests: [/gpa/i, /cgpa/i, /grade/i, /percentage/i],
    },
    {
      key: "gradYear",
      profilePath: "education.gradYear",
      tests: [/graduation\s*year/i, /grad\s*year/i, /year\s*of\s*completion/i, /end\s*year/i],
    },

    // 7. Experience & Employment
    {
      key: "currentTitle",
      profilePath: "employment.currentTitle",
      tests: [/current\s*title/i, /current\s*role/i, /job\s*title/i, /headline/i],
    },
    {
      key: "currentCompany",
      profilePath: "employment.currentCompany",
      tests: [/current\s*company/i, /most\s*recent\s*company/i, /current\s*employer/i],
    },
    {
      key: "experienceYears",
      profilePath: "employment.experienceYears",
      tests: [/years\s*of\s*experience/i, /total\s*experience/i, /relevant\s*experience/i, /experience.*year/i],
    },
    {
      key: "experienceMonths",
      profilePath: "employment.experienceMonths",
      tests: [/experience.*month/i, /total\s*experience.*month/i],
    },
    {
      key: "noticePeriod",
      profilePath: "employment.noticePeriod",
      tests: [/notice\s*period/i, /when\s*can\s*you\s*start/i, /earliest\s*start/i, /availability/i],
    },
    {
      key: "lastDrawnSalary",
      profilePath: "employment.lastDrawnSalary",
      tests: [/last\s*drawn\s*salary/i, /current.*salary/i, /current\s*ctc/i, /present\s*salary/i, /fixed\s*ctc/i],
    },
    {
      key: "expectedSalary",
      profilePath: "employment.expectedSalary",
      tests: [/expected.*salary/i, /desired\s*salary/i, /expected\s*annual\s*salary/i, /compensation\s*expectation/i, /expected\s*ctc/i],
    },
    {
      key: "salaryExpectation",
      profilePath: "employment.salaryExpectation",
      tests: [/salary\s*expectation/i],
    },
    {
      key: "willingToRelocate",
      profilePath: "employment.willingToRelocate",
      tests: [/willing\s*to\s*relocate/i, /open\s*to\s*relocation/i, /remote\s*or\s*hybrid/i],
    },

    // 8. Work Authorization & Company Experience
    {
      key: "previousWorker",
      profilePath: "employment.previousWorker",
      tests: [/indicate\s*past\s*employment/i, /have\s*you\s*ever\s*worked/i, /previously\s*employed/i, /contingent\s*worker/i, /former\s*employee/i, /worked\s*for\s*(mastercard|ust|company)/i, /experience\s*with\s*(ust|mastercard)/i],
    },
    {
      key: "workAuth",
      profilePath: "workAuthorization.authorized",
      tests: [/legally\s*authorized\s*to\s*work/i, /authorized\s*to\s*work\s*in/i, /right\s*to\s*work/i],
    },
    {
      key: "sponsorship",
      profilePath: "workAuthorization.needsSponsorship",
      tests: [/require\s*sponsorship/i, /need\s*sponsorship/i, /visa\s*sponsorship/i, /future\s*sponsorship/i],
    },
    {
      key: "is18OrOlder",
      profilePath: "workAuthorization.is18OrOlder",
      tests: [/18\s*years/i, /at\s*least\s*18/i, /legal\s*age/i],
    },

    // 9. Referral & Sourcing
    {
      key: "referralSource",
      profilePath: "meta.referralSource",
      tests: [/how\s*did\s*you\s*hear/i, /referral\s*source/i, /how\s*found\s*us/i],
    },
    {
      key: "source",
      profilePath: "meta.source",
      tests: [/^source\*?$/i, /job\s*board\s*source/i, /specific\s*source/i],
    },
    {
      key: "talentCommunity",
      profilePath: "meta.talentCommunityConsent",
      tests: [/talent\s*community/i, /personalized\s*communications/i],
    },

    // 10. EEO / Demographics
    {
      key: "gender",
      profilePath: "personal.gender",
      tests: [/gender/i, /sex$/i],
    },
    {
      key: "race",
      profilePath: "eeo.race",
      tests: [/race/i, /ethnicity/i, /hispanic/i],
    },
    {
      key: "veteranStatus",
      profilePath: "eeo.veteranStatus",
      tests: [/veteran\s*status/i, /protected\s*veteran/i],
    },
    {
      key: "disabilityStatus",
      profilePath: "eeo.disabilityStatus",
      tests: [/disability\s*status/i, /have\s*a\s*disability/i],
    },
  ];

  const OPEN_ENDED_SIGNALS = [
    /why (are|do) you/i,
    /describe your/i,
    /tell us about/i,
    /walk us through/i,
    /what interests you/i,
    /what makes you/i,
    /share your experience/i,
    /provide (an )?example/i,
    /cover letter/i,
    /additional info/i,
    /anything else/i,
    /project you are proud/i,
  ];

  function getByPath(obj, path) {
    if (!path) return undefined;
    return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }

  /**
   * Introspects <select> options to classify field when label is ambiguous
   */
  function inspectSelectOptions(el) {
    if (el?.tagName?.toLowerCase() !== "select") return null;
    const texts = Array.from(el.options || []).map(o => (o.text || "").toLowerCase().trim());
    const sample = texts.slice(0, 15).join(" ");
    const nameOrId = `${el?.name || ""} ${el?.id || ""} ${el?.parentElement?.textContent || ""}`.toLowerCase();

    // Experience check (avoid misclassifying as DOB)
    if (nameOrId.includes("experience") || nameOrId.includes("exp")) {
      if (texts.includes("0") && (texts.includes("11") || texts.includes("6") || texts.includes("10"))) {
        return "experienceMonths";
      }
      return "experienceYears";
    }

    // Day check - only if it explicitly mentions "day" or select day
    if (sample.includes("select day") || (sample.includes("day") && texts.includes("1") && texts.includes("28"))) {
      return "dobDay";
    }
    // Month check
    if (sample.includes("select month") || texts.includes("january") || texts.includes("jan") || texts.includes("august")) {
      return "dobMonth";
    }
    // Year check
    if (sample.includes("select year") || (texts.includes("2000") && texts.includes("2005"))) {
      return "dobYear";
    }
    // Gender check
    if (texts.includes("male") && texts.includes("female")) {
      return "gender";
    }
    // Notice period check
    if (sample.includes("immediate") || sample.includes("15 days") || sample.includes("30 days")) {
      return "noticePeriod";
    }
    // Location check (Preferred location dropdowns with Indian cities)
    if (texts.includes("pune") || texts.includes("mumbai") || texts.includes("bangalore") || texts.includes("bengaluru")) {
      if (nameOrId.includes("3") || nameOrId.includes("third")) return "preferredLocation3";
      if (nameOrId.includes("2") || nameOrId.includes("second")) return "preferredLocation2";
      return "preferredLocation";
    }
    // Phone Device Type check
    if (texts.includes("mobile") && (texts.includes("fax") || texts.includes("telephone"))) {
      return "phoneDeviceType";
    }
    // Location Phone Code check
    if (sample.includes("(+91)") || sample.includes("(+1)") || sample.includes("(+44)")) {
      return "locationPhoneCode";
    }
    // Country check
    if (texts.includes("india") && texts.includes("afghanistan") && texts.includes("united states of america")) {
      return "country";
    }
    // Referral check
    if (sample.includes("job board") || sample.includes("mastercard website") || sample.includes("careerarc")) {
      return "referralSource";
    }
    // Specific Source check
    if (texts.includes("linkedin") && texts.includes("indeed")) {
      return "source";
    }

    return null;
  }

  function classifyQuestion(questionText, fieldType, profile, el) {
    const text = (questionText || "").trim();
    const tag = (el?.tagName || "").toLowerCase();
    const type = (el?.type || "").toLowerCase();
    const nameOrId = `${el?.name || ""} ${el?.id || ""} ${el?.placeholder || ""}`.toLowerCase();

    // Check if it's a file input (Resume / CV)
    if (type === "file" || /resume|cv|curriculum vitae/i.test(text) || /resume|cv/i.test(nameOrId)) {
      return {
        type: "resume_file",
        key: "resumeFile",
        label: "Resume Attachment (PDF)",
        value: profile?.meta?.resumeFilename || "Razin_Shaikh_Resume.pdf",
      };
    }

    // Check if it's a cover letter
    if (/cover\s*letter/i.test(text) || /cover\s*letter/i.test(nameOrId)) {
      return {
        type: "open_ended",
        key: "coverLetter",
        label: "Cover Letter",
        prompt: "Draft a personalized cover letter snippet highlighting full-stack and AI project achievements.",
      };
    }

    // Special handling for dual experience selects (Years vs Months)
    if (tag === "select" && (/experience/i.test(text) || /experience/i.test(nameOrId))) {
      const numOpts = Array.from(el.options || []).map(o => parseInt(o.text.trim(), 10)).filter(n => !isNaN(n));
      const maxOpt = numOpts.length ? Math.max(...numOpts) : 0;
      const isMonthSelect = /month|mo/i.test(nameOrId) || (maxOpt <= 12 && numOpts.includes(0) && !numOpts.includes(20));
      if (isMonthSelect) {
        return {
          type: "factual",
          key: "experienceMonths",
          value: profile?.employment?.experienceMonths || "0",
          profilePath: "employment.experienceMonths",
        };
      } else {
        return {
          type: "factual",
          key: "experienceYears",
          value: profile?.employment?.experienceYears || "2",
          profilePath: "employment.experienceYears",
        };
      }
    }

    // Special handling for Currency select in Salary row
    if (tag === "select" && (/salary|ctc|drawn/i.test(text) || /currency/i.test(nameOrId))) {
      const optTexts = Array.from(el.options || []).map(o => (o.text || "").toLowerCase());
      if (optTexts.some(t => t.includes("inr") || t.includes("rs") || t.includes("usd"))) {
        return {
          type: "factual",
          key: "currency",
          value: profile?.employment?.currency || "Rs. - INR",
          profilePath: "employment.currency",
        };
      }
    }

    // Combine label + element attributes
    const fullSearchText = `${text} ${nameOrId}`;

    // 1. Check Factual Patterns FIRST
    for (const p of PATTERNS) {
      if (p.tests.some((re) => re.test(text) || re.test(fullSearchText))) {
        let val = getByPath(profile, p.profilePath);
        if (val !== undefined && val !== null && val !== "") {
          return {
            type: "factual",
            key: p.key,
            value: val,
            profilePath: p.profilePath,
          };
        }
      }
    }

    // 2. Fallback: Inspect select options directly if label was generic (e.g. "Select" or "Please Select")
    if (tag === "select") {
      const optionDetectedKey = inspectSelectOptions(el);
      if (optionDetectedKey) {
        const pattern = PATTERNS.find(p => p.key === optionDetectedKey);
        if (pattern) {
          const val = getByPath(profile, pattern.profilePath);
          return {
            type: "factual",
            key: pattern.key,
            value: val !== undefined ? val : "",
            profilePath: pattern.profilePath,
          };
        }
      }
    }

    // Check Checkbox agreement (Terms & conditions or talent community)
    if (type === "checkbox") {
      if (/talent\s*community|personalized\s*communications/i.test(text)) {
        return {
          type: "checkbox_agree",
          key: "talentCommunity",
          value: profile?.meta?.talentCommunityConsent !== false,
        };
      }
      if (/terms|agree|consent|certify|acknowledge/i.test(text)) {
        return {
          type: "checkbox_agree",
          key: "agreeCheckbox",
          value: true,
        };
      }
    }

    // Check Open-ended
    const looksOpenEnded =
      fieldType === "textarea" ||
      OPEN_ENDED_SIGNALS.some((re) => re.test(text)) ||
      (text.length > 35 && (fieldType === "text" || fieldType === "textarea"));

    if (looksOpenEnded) {
      return {
        type: "open_ended",
        key: "customQuestion",
        prompt: text,
      };
    }

    return { type: "unknown" };
  }

  window.__applyAssistMatcher = {
    PATTERNS,
    classifyQuestion,
    inspectSelectOptions,
    getByPath,
  };
})();
