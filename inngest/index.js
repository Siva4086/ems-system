import { Inngest } from "inngest";
import Attendance from "../models/Attendance.js";
import Employee from "../models/Employee.js";
import LeaveApplication from "../models/LeaveApplication.js";
import { DEPARTMENTS } from "../constants/departments.js";
import { sendEmail } from "../config/nodemailer.js";
import employeesRouter from "../routes/employeeRoutes.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "ems-db" });

//Auto Check-out for employees
export const autoCheckOut = inngest.createFunction(
  { id: "auto-check-out" , triggers: { event:"employee/check-out" },},

  async ({ event, step }) => {
        const {employeeId,attendanceId} = event.data;

        //Wait for 9 hours
        await step.sleepUntil("wait-for-the-9-hours",new Date(new Date().getTime() + 9 * 60 * 60 * 1000));

        //get the attendance data
        let attendance = await Attendance.findById(attendanceId);
        if(!attendance?.checkOut) {
            //Get Employee Data
            const employee = await Employee.findById(employeeId);

            //Send Reminder Email
            await sendEmail({
                to: employee.email,
                subject: "Attendance Check-out Reminder",
                body: `<p>Hi ${employee.firstName},</p><p>This is a reminder to check out for today. Please remember to check out before leaving to ensure accurate attendance records.</p><p>Thank you!</p>`,
            });

            //After 10 hours, mark attendance as checked out with status "LATE"
            await step.sleepUntil("wait-for-the-1-hour",new Date(new Date().getTime() + 1 * 60 * 60 * 1000));
 
            attendance = await Attendance.findById(attendanceId); 
            if(!attendance?.checkOut) {
                attendance.checkOut = new Date(attendance.checkIn.getTime() + 4 * 60 * 60 * 1000);
                attendance.status = "LATE";
                attendance.workingHours = 4;
                attendance.dayType = "Half Day";
                await attendance.save();
            }
        }
  },
);

//Send Email to admin,  if admin doesn't take action on leave application within 24 hours
export const leaveApplicationReminder = inngest.createFunction(
  { id: "leave-application-reminder", triggers: { event:"leave/pending" } }, 
  async ({ event, step }) => {
        const {leaveApplicationId} = event.data;

        //Wait for 24 hours
        await step.sleepUntil("wait-for-the-24-hours",new Date(new Date().getTime() + 24 * 60 * 60 * 1000));

        //get the leave application data
        const leaveApplication = await LeaveApplication.findById(leaveApplicationId);
        if(leaveApplication?.status === "PENDING") {
            //Get Employee Data
            const employee = await Employee.findById(leaveApplication.employeeId);

            //Send Reminder Email to admin to take action on leave application
                 await sendEmail({
                to: process.env.ADMIN_EMAIL, 
                subject: "Leave Application Reminder",
                body: `<p>Hi Admin,</p><p>This is a reminder to take action on the leave application submitted by ${employee.firstName} ${employee.lastName}. Please review and respond to the application within 24 hours.</p><p>Thank you!</p>`,
            });

            //After 10 hours, mark attendance as checked out with status "LATE"
            await step.sleepUntil("wait-for-the-1-hour",new Date(new Date().getTime() + 1 * 60 * 60 * 1000));
 
            attendance = await Attendance.findById(attendanceId); 
            if(!attendance?.checkOut) {
                attendance.checkOut = new Date(attendance.checkIn.getTime() + 4 * 60 * 60 * 1000);
                attendance.status = "LATE";
                attendance.workingHours = 4;
                attendance.dayType = "Half Day";
                await attendance.save();
            }
        }
  },
);

// Cron: Check attendance at 11:30 AM IST (06:00 UTC) every day and email absent employees
export const attendanceReminderCron = inngest.createFunction(
  { id: "attendance-reminder-cron", triggers: { cron:"TZ=Asia/Kolkata 30 11 * * *" } }, 
  async ({ step }) => {  
    //Step 1: Get today's date range (IST)
//     const today = await step.run("get-today-date", () => {
//     const startUTC = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + " T00:00:00 + 05:30");
//     const endUTC = new Date(startUTC.getTime() + 24 * 60 * 60 * 1000);
//     return { startUTC:startUTC.toISOString(), endUTC:endUTC.toISOString() };    
//   });

const today = await step.run("get-today-date", () => {
  const now = new Date();

  // Convert to IST
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  // Start of day (IST)
  const start = new Date(ist);
  start.setHours(0, 0, 0, 0);

  // End of day (IST)
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startUTC: start.toISOString(),
    endUTC: end.toISOString(),
  };
});

    //Step 2: Get all active, non-deleted-employees
     const activeEmployees = await step.run("get-active-employees", async () => {
        const employees = await Employee.find({
            isDeleted: false,
            employmerntStatus: "ACTIVE",
        }).lean();
        return employees.map((e) => ({...e, _id: e._id.toString(), firstName: e.firstName, lastName: e.lastName,email:e.email,department:e.department}));  
    });

    //Step 3: Get employee IDs on approved leave today
    const  onLeaveIds = await step.run("get-on-leave-ids", async () => {
        const leaves = await LeaveApplication.find({
            status: "APPROVED",
             startDate: { $lte: new Date(today.endUTC) },
             endDate: { $gte: new Date(today.startUTC) }, 
            }).lean();
        return leaves.map((l) => l.employeeId.toString());
    });      
    
   //Step 4: Get employee IDs who already checked in today
    const checkedInIds = await step.run("get-checked-in-ids", async () => {  
        const attendances = await Attendance.find({
            date: {
                $gte: new Date(today.startUTC), 
                $lt: new Date(today.endUTC),
            },
        }).lean();
        return attendances.map((a) => a.employeeId.toString());
    });  

    //Step 5: Filter absent Employees (not on leave and not checked in)
    const absentEmployees = activeEmployees.filter((e) => !onLeaveIds.includes(e._id) && !checkedInIds.includes(e._id));

    //Step 6: Send reminder emails
    if(absentEmployees.length > 0) {
        await step.run("send-reminder-emails", async () => {
            const emailPromises = absentEmployees.map((e) => {
            //Send email to employee e.email about their absence
            sendEmail({
            to:e.mail,
            subject: "Daily Attendance Report - Absent Employees",
            body: `<p>Hi Admin,</p><p>Here is the list of employees who are absent today:</p><ul>${absentEmployees.map((e) => `<li>${e.firstName} ${e.lastName} - ${e.department}</li>`).join("")}</ul><p>Thank you!</p>`,
              })
            });
            await Promise.all(emailPromises);
            return {emailsSent: absentEmployees.length};
        });

     }
          
     return { totalActive: activeEmployees.length, checkedIn: checkedInIds.length, onLeave: onLeaveIds.length, absent: absentEmployees.length };
},
)                                                                            

// Create an empty array where we'll export future Inngest functions
export const functions = [autoCheckOut,leaveApplicationReminder, attendanceReminderCron];