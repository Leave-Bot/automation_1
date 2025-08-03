const Imap = require("imap");
const { simpleParser } = require("mailparser");
const { LeaveRequest } = require("./db");
const { extractDetails, extractEntities } = require("./nlpParser");
require("dotenv").config();

const imap = new Imap({
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
});

function openInbox(cb) {
  imap.openBox("INBOX", false, cb);
}

imap.once("ready", () => {
  openInbox((err, box) => {
    if (err) throw err;

    imap.on("mail", () => {
      const fetch = imap.seq.fetch(`${box.messages.total}:*`, {
        bodies: "",
        struct: true,
        markSeen: true,
      });

      fetch.on("message", (msg) => {
        msg.on("body", (stream) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) return console.error("Parse error:", err);

            const from = parsed.from.value[0].address;
            const toList = parsed.to.value.map((e) => e.address);
            const ccList = parsed.cc
              ? parsed.cc.value.map((e) => e.address)
              : [];

            const botAddress = process.env.EMAIL_USER;

            const isBotCCed = ccList.includes(botAddress);
            const isReply = parsed.inReplyTo || parsed.references;

            if (isBotCCed && !isReply) {
              // New leave request
              const extractedObj = await extractEntities(parsed.text);

              let extracted = {
                student_email: "",
                roll_no: "",
                department: "",
                reason: "",
                from_date: "",
                to_date: "",
                teacher_emails: [],
                approved_by: [],
                thread_id: "",
              };

              if (Object.keys(extractedObj).length === 0) {
                console.warn(
                  "⚠️ No data extracted, skipping email from:",
                  from
                );
                return; // or handle error appropriately
              }

              extracted.student_email = from;
              extracted.teacher_emails = toList;
              extracted.thread_id = parsed.messageId;
              extracted.approved_by = [];
              extracted.roll_no = extractedObj.ROLL_NO || "";
              extracted.department = extractedObj.DEPARTMENT || "";
              extracted.reason = extractedObj.REASON || "";
              extracted.from_date = extractedObj.FROM_DATE || "";
              extracted.to_date = extractedObj.TO_DATE || "";

              await LeaveRequest.create(extracted);

              console.log("✅ Leave request saved for", from);
            }

            // If it's a reply (teacher)
            if (isReply) {
              const allRefs = [];
              if (parsed.inReplyTo) allRefs.push(parsed.inReplyTo);
              if (parsed.references) allRefs.push(...parsed.references);

              const replyText = parsed.text.toLowerCase();
              const replyingTeacher = from;

              if (replyText.includes("approve")) {
                const req = await LeaveRequest.findOne({
                  thread_id: { $in: allRefs },
                  teacher_emails: replyingTeacher,
                });

                if (req) {
                  if (!req.approved_by.includes(replyingTeacher)) {
                    req.approved_by.push(replyingTeacher);
                  }

                  if (req.approved_by.length === req.teacher_emails.length) {
                    req.status = "approved";
                  }

                  await req.save();
                  console.log(
                    `✅ Teacher ${replyingTeacher} approved leave for ${req.student_email}`
                  );
                } else {
                  console.log(
                    `⚠️ No matching thread for reply by ${replyingTeacher}`
                  );
                }
              }
            }
          });
        });
      });
    });
  });
});

imap.once("error", (err) => console.error("❌ IMAP Error:", err));
imap.connect();
