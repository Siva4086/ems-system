import {Router} from 'express';
import Employee from '../models/Employee.js';   
import { getEmployees, createEmployee,updateEmployee,deleteEmployee } from '../controllers/employeeController.js';
import { protect, protectAdmin } from '../middleware/auth.js';

const employeesRouter = Router();

employeesRouter.get('/', protect, protectAdmin, getEmployees);
employeesRouter.post('/', protect, protectAdmin, createEmployee);  
employeesRouter.put("/:id", protect, protectAdmin, updateEmployee);
employeesRouter.delete("/:id", protect, protectAdmin, deleteEmployee);
export default employeesRouter;

