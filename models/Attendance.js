import mongoose, { Mongoose } from 'mongoose';

const attendanceSchema = new mongoose.Schema({    
    employeeId: {    
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true, 
    },  
    date: { 
        type: Date,           
        required: true, 
    },
    checkIn: {
        type: Date,
        default:null,    
    },
    checkOut: {
        type: Date,
        default:null,
    },  
    status: {
        type: String,
        enum: ["PRESENT","ABSENT","LEAVE","LATE"],
        default: 'PRESENT', 
    },
    workingHours: {     
        type: Number,
        default: null,
    },  
    dayType:{
        type: String,
        enum: ["Full Day","Half Day","Three Quarter Day","Short Day",null],
        default: null,
    }

}, { timestamps: true });

attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

export default Attendance;