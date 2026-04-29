import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Employee from '../models/Employee.js';    

//Login for Employee and Admin
// POST /api/auth/login
export const login = async (req, res) => { 
    try {   
        const { email, password, role_type } = req.body;

        if(!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const user = await User.findOne({ email });
        if(!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if(role_type === "admin" && user.role !== "ADMIN") {
            return res.status(401).json({ error: 'Not authorized as admin' });
        }

        if(role_type === "employee" && user.role !== "EMPLOYEE") {
            return res.status(401).json({ error: 'Not authorized as employee' });
        }

        const isValid = await bcrypt.compare(password, user.password);  
        if(!isValid) {  
            return res.status(401).json({ error: 'Invalid credentials' });  
        }   

        const payload = { userId: user._id.toString(), role: user.role,email: user.email};
        const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ token, user: payload });    
    } catch (error) {   
        return res.status(500).json({ error: 'Login failed' }); 
    }   
};  


//Get session for employee and admin
// GET /api/auth/session
// export const session = async (req, res) => {
//       const session = req.session;        
//         return res.json({ user: session });
// };

export const session = async (req, res) => {
 try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.json({ user: decoded });
    } catch (err) {
        return res.status(401).json({ error: "Unauthorized" });
    }
};
 
//Change password for employee and admin
// POST /api/auth/change-password
export const changePassword = async (req, res) => {
    try {   
        const session = req.session;
        const { currentPassword, newPassword } = req.body;           
        if(!currentPassword || !newPassword) {        
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        const user = await User.findById(session.userId); 
        if(!user) {         
            return res.status(404).json({ error: 'User not found' });   
        }           
        const isValid = await bcrypt.compare(currentPassword, user.password);   
        if(!isValid) {                     
            return res.status(400).json({ error: 'Current password is incorrect' });
        }    
        const hashed = await bcrypt.hash(newPassword, 10);  
        await User.findByIdAndUpdate(session.userId, { password: hashed });   
        return res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to change password' });
    }
};  