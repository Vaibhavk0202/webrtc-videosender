import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Meeting } from "../models/meeting.model.js";

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                success: false,
                message: "Username and password are required" 
            });
        }

        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername || !trimmedPassword) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                success: false,
                message: "Username and password cannot be empty" 
            });
        }

        const user = await User.findOne({ username: trimmedUsername });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ 
                success: false,
                message: "User not found" 
            });
        }

        if (!user.password) {
            console.error(`User ${username} has no password in database`);
            return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
                success: false,
                message: "User account is corrupted. Please contact support." 
            });
        }

        const isPasswordCorrect = await bcrypt.compare(trimmedPassword, user.password);

        if (!isPasswordCorrect) {
            return res.status(httpStatus.UNAUTHORIZED).json({ 
                success: false,
                message: "Invalid username or password" 
            });
        }

        const token = jwt.sign(
            { 
                userId: user._id, 
                username: user.username 
            },
            process.env.JWT_SECRET || "your-secret-key",
            { expiresIn: "7d" }
        );

        return res.status(httpStatus.OK).json({ 
            success: true,
            message: "Login successful",
            token: token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            success: false,
            message: "Internal server error during login" 
        });
    }
};

const register = async (req, res) => {
    try {
        const { name, username, password } = req.body;

        if (!name || !username || !password) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                success: false,
                message: "Name, username, and password are required" 
            });
        }

        const trimmedName = name.trim();
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedName || !trimmedUsername || !trimmedPassword) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                success: false,
                message: "Name, username, and password cannot be empty" 
            });
        }

        if (trimmedUsername.length < 3) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                success: false,
                message: "Username must be at least 3 characters long" 
            });
        }

        if (trimmedPassword.length < 6) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                success: false,
                message: "Password must be at least 6 characters long" 
            });
        }

        const existingUser = await User.findOne({ username: trimmedUsername });
        if (existingUser) {
            return res.status(httpStatus.CONFLICT).json({ 
                success: false,
                message: "User already exists with this username" 
            });
        }

        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(trimmedPassword, saltRounds);

        const newUser = new User({
            name: trimmedName,
            username: trimmedUsername,
            password: hashedPassword
        });

        await newUser.save();

        res.status(httpStatus.CREATED).json({ 
            success: true,
            message: "User registered successfully",
            user: {
                id: newUser._id,
                name: newUser.name,
                username: newUser.username
            }
        });

    } catch (error) {
        console.error("Registration error:", error);
        
        if (error.code === 11000) {
            return res.status(httpStatus.CONFLICT).json({ 
                success: false,
                message: "Username already exists" 
            });
        }

        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            success: false,
            message: "Internal server error during registration" 
        });
    }
};

const getUserHistory = async (req, res) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(httpStatus.UNAUTHORIZED).json({ 
                success: false,
                message: "User not authenticated" 
            });
        }

        const userId = req.user.userId;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ 
                success: false,
                message: "User not found" 
            });
        }

        const meetings = await Meeting.find({ user_id: user.username })
            .sort({ createdAt: -1 })
            .limit(100);

        res.status(httpStatus.OK).json({ 
            success: true,
            message: "Meeting history retrieved successfully",
            data: meetings,
            count: meetings.length
        });

    } catch (error) {
        console.error("Get user history error:", error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            success: false,
            message: "Internal server error while fetching history" 
        });
    }
};

const addToHistory = async (req, res) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(httpStatus.UNAUTHORIZED).json({ 
                success: false,
                message: "User not authenticated" 
            });
        }

        const { meeting_code } = req.body;

        if (!meeting_code) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                success: false,
                message: "Meeting code is required" 
            });
        }

        const trimmedMeetingCode = meeting_code.trim();
        if (!trimmedMeetingCode) {
            return res.status(httpStatus.BAD_REQUEST).json({ 
                success: false,
                message: "Meeting code cannot be empty" 
            });
        }

        const userId = req.user.userId;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ 
                success: false,
                message: "User not found" 
            });
        }

        const existingMeeting = await Meeting.findOne({ 
            user_id: user.username, 
            meetingCode: trimmedMeetingCode 
        });

        if (existingMeeting) {
            return res.status(httpStatus.CONFLICT).json({ 
                success: false,
                message: "Meeting code already exists in your history" 
            });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: trimmedMeetingCode
        });

        await newMeeting.save();

        res.status(httpStatus.CREATED).json({ 
            success: true,
            message: "Meeting code added to history successfully",
            data: {
                meetingCode: newMeeting.meetingCode,
                addedAt: newMeeting.createdAt
            }
        });

    } catch (error) {
        console.error("Add to history error:", error);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ 
            success: false,
            message: "Internal server error while adding to history" 
        });
    }
};

export { login, register, getUserHistory, addToHistory };
