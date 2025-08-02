// CreateMeeting.js
import { useNavigate } from 'react-router-dom';


function generateRoomId() {
  return Math.random().toString(36).substr(2, 8); 
  
}

export default function CreateMeeting() {
  const navigate = useNavigate();

  const createMeeting = () => {
    const roomId = generateRoomId();
    navigate(`/meet/${roomId}`);
  };

   const styles = {
    container: {
      height: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#f4f6f8",
      padding: "20px",
    },
    box: {
      backgroundColor: "#ffffff",
      padding: "30px 25px",
      borderRadius: "12px",
      boxShadow: "0 8px 16px rgba(0, 0, 0, 0.1)",
      textAlign: "center",
      maxWidth: "400px",
      width: "100%",
    },
    icon: {
      fontSize: "48px",
      marginBottom: "15px",
    },
    title: {
      fontSize: "24px",
      marginBottom: "10px",
      color: "#333",
    },
    description: {
      fontSize: "16px",
      color: "#666",
      marginBottom: "25px",
    },
    button: {
      backgroundColor: "#1976d2",
      color: "#ffffff",
      border: "none",
      padding: "12px 20px",
      fontSize: "16px",
      borderRadius: "6px",
      cursor: "pointer",
      transition: "background-color 0.3s ease",
    },
    note: {
      marginTop: "20px",
      fontSize: "13px",
      color: "#888",
    },
  };



   return (
     <div style={styles.container}>
      <div style={styles.box}>
        <div style={styles.icon}>📹</div>
        <h2 style={styles.title}>Start a New Meeting</h2>
        <p style={styles.description}>
          Instantly create a secure and shareable meeting link.
        </p>
        <button
          style={styles.button}
          onClick={createMeeting}
          onMouseOver={(e) => (e.target.style.backgroundColor = "#125ca1")}
          onMouseOut={(e) => (e.target.style.backgroundColor = "#1976d2")}
        >
          Create Meeting
        </button>
        <p style={styles.note}>Your meeting link will be shareable!</p>
      </div>
    </div>
  );
};


