import { Router } from "express";
import { protect } from "../middleware/auth.js";
import { getAttendance,clockInOut } from "../controllers/attendanceController.js";

const attendanceRouter = Router(); 

attendanceRouter.get("/", protect, getAttendance);
attendanceRouter.post("/", protect, clockInOut);

export default attendanceRouter; 