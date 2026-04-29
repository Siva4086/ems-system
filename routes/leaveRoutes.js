import { Router } from "express";
import { protect,protectAdmin} from "../middleware/auth.js";
import { getLeaves,createLeave,updateLeaveStatus } from "../controllers/leaveController.js";

const leaveRouter = Router(); 

leaveRouter.get("/", protect, getLeaves);
leaveRouter.post("/", protect, createLeave);
leaveRouter.patch("/:id/status",protect, updateLeaveStatus); 

export default leaveRouter; 