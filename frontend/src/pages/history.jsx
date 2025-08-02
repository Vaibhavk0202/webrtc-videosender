import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const History = () => {
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { getHistoryOfUser, isAuthenticated } = useAuth();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const result = await getHistoryOfUser();
                
                console.log("History API response:", result);
                
                if (result.success) {
                    const meetingsData = result.data || [];
                    
                    if (Array.isArray(meetingsData)) {
                        setMeetings(meetingsData);
                    } else {
                        console.error("Expected array but got:", meetingsData);
                        setMeetings([]);
                        setError("Invalid data format received");
                    }
                } else {
                    setError(result.message || "Failed to fetch history");
                    setMeetings([]);
                }
            } catch (err) {
                console.error("History fetch error:", err);
                setError("Failed to load meeting history");
                setMeetings([]);
            } finally {
                setLoading(false);
            }
        };

        if (isAuthenticated) {
            fetchHistory();
        } else {
            setLoading(false);
            setError("Please log in to view your meeting history");
        }
    }, [isAuthenticated, getHistoryOfUser]);

    if (loading) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <p>Loading meeting history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
                <p>Error: {error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    if (!Array.isArray(meetings) || meetings.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <h2>Meeting History</h2>
                <p>No meetings found in your history.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '20px' }}>
            <h2>Meeting History</h2>
            <div>
                {meetings.map((meeting, index) => (
                    <div 
                        key={meeting._id || index} 
                        style={{ 
                            border: '1px solid #ccc', 
                            margin: '10px 0', 
                            padding: '15px',
                            borderRadius: '5px',
                            backgroundColor: '#f9f9f9'
                        }}
                    >
                        <h3>Meeting Code: {meeting.meetingCode}</h3>
                        <p>Date: {new Date(meeting.createdAt).toLocaleDateString()}</p>
                        <p>Time: {new Date(meeting.createdAt).toLocaleTimeString()}</p>
                        <p>User: {meeting.user_id}</p>
                    </div>
                ))}
            </div>
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                Total meetings: {meetings.length}
            </p>
        </div>
    );
};

export default History;
