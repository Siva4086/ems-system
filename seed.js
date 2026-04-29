import "dotenv/config";
import connectDB from "./config/db.js";
import User from "./models/User.js";
import Employee from "./models/Employee.js";
import Attendance from "./models/Attendance.js";
import LeaveApplication from "./models/LeaveApplication.js";
import Payslip from "./models/Payslip.js";
import bcrypt from "bcrypt";

const temporaryPassword = "admin@123";

async function registerAdmin(){
    try{
      const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";

      if(!ADMIN_EMAIL) {
        console.error("Missing ADMIN_EMAIL environment variable");
        process.exit(1);
      }

      await connectDB();
      const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });  
      
      if(existingAdmin) {
        console.log("User already exists as role ", existingAdmin.role);
        process.exit(0);
      }
       const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        const admin = await User.create({
            email: ADMIN_EMAIL, 
            password: hashedPassword,
            role: "ADMIN",
        });
        console.log("Admin user created");
        console.log("Admin email: ", admin.email);
        console.log("Admin temporary password: ", temporaryPassword);
        console.log("Please change the password after first login");
        process.exit(0);    
    }catch(error) {
        console.error("seed failed:", error);
    }
}

registerAdmin();


