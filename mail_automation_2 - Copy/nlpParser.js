// const nlp = require("compromise");

// function extractDetails(text) {
//   const result = {
//     student_email: "",
//     roll_no: "",
//     department: "",
//     reason: "",
//     from_date: "",
//     to_date: "",
//     teacher_emails: [],
//   };

//   const rollMatch = text.match(/roll\s*no[:\-]?\s*(\w+)/i);
//   const deptMatch = text.match(/department[:\-]?\s*([a-zA-Z ]+)/i);
//   const fromDateMatch = text.match(/from\s+([0-9\-\/]+)/i);
//   const toDateMatch = text.match(/to\s+([0-9\-\/]+)/i);
//   const reasonMatch = text.match(/reason[:\-]?\s*(.+?)(\.|\n|$)/i);

//   if (rollMatch) result.roll_no = rollMatch[1];
//   if (deptMatch) result.department = deptMatch[1].trim();
//   if (fromDateMatch) result.from_date = fromDateMatch[1];
//   if (toDateMatch) result.to_date = toDateMatch[1];
//   if (reasonMatch) result.reason = reasonMatch[1].trim();

//   return result;
// }

// module.exports = { extractDetails };

const nlp = require("compromise");
const axios = require("axios");

function parseDate(text) {
  const dateMatch = text.match(/(\d{1,2}[-\/]\d{1,2}([-/]\d{2,4})?)/);
  return dateMatch ? dateMatch[1] : "";
}

function extractDetails(text) {
  const result = {
    student_email: "",
    roll_no: "",
    department: "",
    reason: "",
    from_date: "",
    to_date: "",
    teacher_emails: [],
  };

  const lowerText = text.toLowerCase();

  // Match roll number with various patterns
  const rollMatch = text.match(/(roll\s*(no|number)?[:\-]?\s*)(\w+)/i);
  if (rollMatch) result.roll_no = rollMatch[3];

  // Department
  const deptMatch = text.match(/department[:\-]?\s*([a-zA-Z ]+)/i);
  if (deptMatch) result.department = deptMatch[1].trim();

  // From and To Dates
  const dateRangeMatch = text.match(/from\s+([0-9\-\/]+).*?to\s+([0-9\-\/]+)/i);
  if (dateRangeMatch) {
    result.from_date = parseDate(dateRangeMatch[1]);
    result.to_date = parseDate(dateRangeMatch[2]);
  } else {
    // Try to parse any two dates if "from...to..." not found
    const allDates = [...text.matchAll(/(\d{1,2}[-\/]\d{1,2}([-/]\d{2,4})?)/g)];
    if (allDates.length >= 2) {
      result.from_date = allDates[0][0];
      result.to_date = allDates[1][0];
    }
  }

  // Reason heuristics
  const reasonKeywords = [
    "reason",
    "medical",
    "sick",
    "illness",
    "health",
    "unwell",
  ];
  const reasonMatch = reasonKeywords
    .map((kw) =>
      text.match(new RegExp(`${kw}[:\\-]?\\s*(.+?)(\\n|\\.|$)`, "i"))
    )
    .find((m) => m);
  if (reasonMatch) {
    result.reason = reasonMatch[1].trim();
  }

  // Fallback using nlp to find any mention of illness
  const doc = nlp(text);
  const foundHealth = doc.match("#Health+").out("text");
  if (!result.reason && foundHealth) {
    result.reason = foundHealth;
  }

  return result;
}

async function extractEntities(emailText) {
  try {
    const response = await axios.post(
      "https://nlp-mqgn.onrender.com/extract",
      {
        text: emailText,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Extracted Entities:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error calling FastAPI service:", error.message);
    if (error.response) {
      console.error("Response:", error.response.data);
    }
    return null;
  }
}

module.exports = { extractDetails, extractEntities };
