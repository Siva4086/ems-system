import Employee from '../models/Employee.js';
import bcrypt from 'bcrypt';
import User from '../models/User.js';

//Get Employees
// GET /api/employees
export const getEmployees = async (req, res) => {
    try {   
       const {department} = req.query;
       const where = {};

       if(department){
        where.department = department;
       }
         const employees = (await Employee.find(where).populate("userId","email role").sort({createdAt:-1}).lean());
         const result = employees.map((emp) =>({
            ...emp,
            id: emp._id.toString(),
             user: emp.userId ? {
                email: emp.userId.email,
                role: emp.userId.role,
             } : null,
         }));
         return  res.json(result);
    } catch (error) {
       return res.status(500).json({ error: 'Failed to fetch employees' });
    }       
};

//Create Employee
// POST /api/employees
export const createEmployee = async (req, res) => {
    try {   
        const { firstName, lastName, email, phone, position, basicSalary, allowances, deductions, joinDate, bio, department,password,role } = req.body;

        if(!firstName || !lastName || !email || !password) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const hashed = await bcrypt.hash(password, 10); 

        const user = await User.create({ email, password: hashed, role:role || 'EMPLOYEE' });
        const employee = await  Employee.create({
            userId: user._id,
            firstName,  
            lastName,
            email,
            phone,
            position,
            basicSalary: Number(basicSalary) || 0,
            allowances: Number(allowances) || 0,
            deductions: Number(deductions) || 0,
            joinDate : new Date(joinDate),
            bio:bio || '', 
            department:department || 'Engineering', 
        });
        return res.status(201).json({success:true ,employee});
    } catch (error) {
        if(error.code === 11000){
            return res.status(400).json({ error: 'Email already exists' });
        }   
        return res.status(500).json({ error: 'Failed to create employee' });
    }
};

//Get Employee by ID
// GET /api/employees/:id
const getEmployeeById = async (req, res) => {
    try {   
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }       
};

//Update Employee
// PUT /api/employees/:id
export const updateEmployee = async (req, res) => {            
    try {   
        const { id } = req.params;
        const { firstName, lastName, email, phone, position, basicSalary, allowances, deductions, bio, department,role,password, employmentStatus } = req.body;
    
        const employee = await Employee.findById(id);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        

         await Employee.findByIdAndUpdate(id, {
            firstName,  
            lastName,
            email,
            phone,
            position,
            basicSalary: Number(basicSalary) || 0,
            allowances: Number(allowances) || 0,
            deductions: Number(deductions) || 0,
            employmentStatus : employmentStatus || 'ACTIVE',
            bio:bio || '', 
            department:department || 'Engineering', 
        });

        // Update user details if email or role is changed
            const userUpdate = {email};
            if(role) userUpdate.role = role;
            if(password) userUpdate.password = await bcrypt.hash(password, 10);    
            await User.findByIdAndUpdate(employee.userId, userUpdate);
            return res.status(200).json({success:true });
    } catch (error) {
        if(error.code === 11000){
            return res.status(400).json({ error: 'Email already exists' });
        }   
        return res.status(500).json({ error: 'Failed to update employee' });
    }
};  


//Delete Employee
// DELETE /api/employees/:id
export const deleteEmployee = async (req, res) => {    
    try {
     const { id } = req.params;
     const employee = await Employee.findById(id);
     if (!employee) return res.status(404).json({ error: 'Employee not found' });
     employee.isDeleted = true;
     employee.employmentStatus = 'INACTIVE';    
     await employee.save();
     return res.status(200).json({ success: true, message: 'Employee deleted successfully' });
    }
    catch (error) {
       return res.status(500).json({ message: 'Failed to delete employee' });
    }       
};  
