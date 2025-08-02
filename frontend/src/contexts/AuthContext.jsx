import axios from "axios";
import httpStatus from "http-status";
import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Use environment variable directly
const server = process.env.REACT_APP_API_URL || "http://localhost:8000";

console.log("AuthContext using API URL:", server);

export const AuthContext = createContext({});

const client = axios.create({
    baseURL: `${server}/api/v1/users`,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add request interceptor to include token in headers
client.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle token expiration
client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "/login";
        }
        return Promise.reject(error);
    }
);

export const AuthProvider = ({ children }) => {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useNavigate();

    // Check authentication status on mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            setIsAuthenticated(true);
        }
        setLoading(false);
    }, []);

    const handleRegister = async (name, username, password) => {
        try {
            if (!name || !username || !password) {
                return {
                    success: false,
                    message: "All fields are required"
                };
            }

            const request = await client.post("/register", {
                name: name.trim(),
                username: username.trim(),
                password: password.trim()
            });

            if (request.status === httpStatus.CREATED) {
                return {
                    success: true,
                    message: request.data.message
                };
            }
        } catch (err) {
            console.error("Registration error:", err);
            return {
                success: false,
                message: err.response?.data?.message || "Registration failed"
            };
        }
    };

    const handleLogin = async (username, password) => {
        try {
            if (!username || !password) {
                return {
                    success: false,
                    message: "Username and password are required"
                };
            }

            const request = await client.post("/login", {
                username: username.trim(),
                password: password.trim()
            });

            console.log("Login response:", request.data);

            if (request.status === httpStatus.OK) {
                const { token, user } = request.data;
                
                localStorage.setItem("token", token);
                setUserData(user);
                setIsAuthenticated(true);
                
                router("/home");
                
                return {
                    success: true,
                    message: "Login successful"
                };
            }
        } catch (err) {
            console.error("Login error:", err);
            return {
                success: false,
                message: err.response?.data?.message || "Login failed"
            };
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUserData(null);
        setIsAuthenticated(false);
        router("/login");
    };

    const getHistoryOfUser = async () => {
        try {
            const request = await client.get("/get_all_activity");
            return {
                success: true,
                data: request.data.data || [] // Extract the meetings array
            };
        } catch (err) {
            console.error("Get history error:", err);
            return {
                success: false,
                message: err.response?.data?.message || "Failed to fetch history",
                data: [] // Return empty array on error
            };
        }
    };

    const addToUserHistory = async (meetingCode) => {
        try {
            if (!meetingCode) {
                return {
                    success: false,
                    message: "Meeting code is required"
                };
            }

            const request = await client.post("/add_to_activity", {
                meeting_code: meetingCode.trim()
            });
            
            return {
                success: true,
                data: request.data
            };
        } catch (err) {
            console.error("Add to history error:", err);
            return {
                success: false,
                message: err.response?.data?.message || "Failed to add to history"
            };
        }
    };

    const data = {
        userData,
        setUserData,
        loading,
        isAuthenticated,
        addToUserHistory,
        getHistoryOfUser,
        handleRegister,
        handleLogin,
        logout
    };

    return (
        <AuthContext.Provider value={data}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook for using auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
