const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema({
  student_email: String,
  roll_no: String,
  department: String,
  reason: String,
  from_date: String,
  to_date: String,
  teacher_emails: [String],
  approved_by: [String],
  thread_id: String,
  status: { type: String, default: "pending" },
});

const LeaveRequest = mongoose.model("LeaveRequest", leaveRequestSchema);

async function connectDB() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("✅ MongoDB connected");
}

module.exports = { LeaveRequest, connectDB };
