import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField } from '@mui/material';
import { Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import server from '../environment';

const server_url = server;

var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {
    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState(false);
    let [showModal, setModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState(false);
    let [messages, setMessages] = useState([])
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");

    const videoRef = useRef([])
    let [videos, setVideos] = useState([])

    // Cleanup when component unmounts
    useEffect(() => {
        console.log("Component mounted, getting permissions...");
        getPermissions();
        
        return () => {
            console.log("Component unmounting, cleaning up...");
            cleanupAllMedia();
        };
    }, []);

    // Handle browser tab close/refresh
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            console.log("Page unloading, cleaning up media...");
            cleanupAllMedia();
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                console.log("Tab hidden");
            } else {
                console.log("Tab visible");
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Comprehensive cleanup function
    const cleanupAllMedia = () => {
        try {
            // Stop all local stream tracks
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => {
                    console.log(`Stopping ${track.kind} track`);
                    track.stop();
                });
                window.localStream = null;
            }

            // Clear video element
            if (localVideoref.current && localVideoref.current.srcObject) {
                const tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                localVideoref.current.srcObject = null;
            }

            // Close all peer connections
            for (let id in connections) {
                if (connections[id]) {
                    connections[id].close();
                    delete connections[id];
                }
            }
            connections = {};

            // Disconnect socket
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }

        } catch (error) {
            console.error("Error during cleanup:", error);
        }
    };

    const getPermissions = async () => {
        try {
            // Test video permission
            try {
                const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
                setVideoAvailable(true);
                console.log('Video permission granted');
                videoPermission.getTracks().forEach(track => track.stop());
            } catch (e) {
                setVideoAvailable(false);
                console.log('Video permission denied');
            }

            // Test audio permission
            try {
                const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
                setAudioAvailable(true);
                console.log('Audio permission granted');
                audioPermission.getTracks().forEach(track => track.stop());
            } catch (e) {
                setAudioAvailable(false);
                console.log('Audio permission denied');
            }

            // Test screen share availability
            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            } else {
                setScreenAvailable(false);
            }

            // Get initial media stream for preview
            if (videoAvailable || audioAvailable) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: videoAvailable, 
                    audio: audioAvailable 
                });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (error) {
            console.error('Error getting permissions:', error);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined && !askForUsername) {
            getUserMedia();
            console.log("Media state changed - Video:", video, "Audio:", audio);
        }
    }, [video, audio, askForUsername]);

    const getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    // FIXED: Proper camera toggle function
    const handleVideo = async () => {
        try {
            if (video) {
                // TURNING VIDEO OFF
                console.log("Turning video OFF");
                
                if (window.localStream) {
                    const videoTrack = window.localStream.getVideoTracks()[0];
                    if (videoTrack) {
                        videoTrack.enabled = false;
                        setVideo(false);
                        
                        if (socketRef.current) {
                            socketRef.current.emit('video-off', socketIdRef.current);
                        }
                        
                        console.log("Video disabled");
                        return;
                    }
                }
                setVideo(false);
            } else {
                // TURNING VIDEO ON
                console.log("Turning video ON");
                
                if (window.localStream) {
                    const videoTrack = window.localStream.getVideoTracks()[0];
                    if (videoTrack && !videoTrack.ended) {
                        videoTrack.enabled = true;
                        setVideo(true);
                        
                        if (socketRef.current) {
                            socketRef.current.emit('video-on', socketIdRef.current);
                        }
                        
                        console.log("Video re-enabled");
                        return;
                    }
                }
                
                // Need new video stream
                console.log("Getting new video stream...");
                await getNewVideoStream();
            }
        } catch (error) {
            console.error("Error in handleVideo:", error);
            alert("Could not access camera. Please check permissions.");
        }
    };

    // FIXED: Proper audio toggle function
    const handleAudio = async () => {
        try {
            if (audio) {
                // TURNING AUDIO OFF
                console.log("Turning audio OFF");
                
                if (window.localStream) {
                    const audioTrack = window.localStream.getAudioTracks()[0];
                    if (audioTrack) {
                        audioTrack.enabled = false;
                        setAudio(false);
                        
                        if (socketRef.current) {
                            socketRef.current.emit('audio-off', socketIdRef.current);
                        }
                        
                        console.log("Audio disabled");
                        return;
                    }
                }
                setAudio(false);
            } else {
                // TURNING AUDIO ON
                console.log("Turning audio ON");
                
                if (window.localStream) {
                    const audioTrack = window.localStream.getAudioTracks()[0];
                    if (audioTrack && !audioTrack.ended) {
                        audioTrack.enabled = true;
                        setAudio(true);
                        
                        if (socketRef.current) {
                            socketRef.current.emit('audio-on', socketIdRef.current);
                        }
                        
                        console.log("Audio re-enabled");
                        return;
                    }
                }
                
                // Need new audio stream
                console.log("Getting new audio stream...");
                await getNewAudioStream();
            }
        } catch (error) {
            console.error("Error in handleAudio:", error);
            alert("Could not access microphone. Please check permissions.");
        }
    };

    // NEW: Function to get new video stream
    const getNewVideoStream = async () => {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ 
                video: videoAvailable, 
                audio: audio && audioAvailable 
            });
            
            if (window.localStream) {
                // Replace video tracks
                const oldVideoTracks = window.localStream.getVideoTracks();
                oldVideoTracks.forEach(track => {
                    track.stop();
                    window.localStream.removeTrack(track);
                });
                
                const newVideoTracks = newStream.getVideoTracks();
                newVideoTracks.forEach(track => {
                    window.localStream.addTrack(track);
                });
                
                // Handle audio if needed
                if (!window.localStream.getAudioTracks().length && audio && audioAvailable) {
                    const newAudioTracks = newStream.getAudioTracks();
                    newAudioTracks.forEach(track => {
                        window.localStream.addTrack(track);
                    });
                }
            } else {
                window.localStream = newStream;
            }
            
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }
            
            updatePeerConnections();
            setVideo(true);
            
            if (socketRef.current) {
                socketRef.current.emit('video-on', socketIdRef.current);
            }
            
            console.log("New video stream obtained");
            
        } catch (error) {
            console.error("Error getting new video stream:", error);
            setVideo(false);
            throw error;
        }
    };

    // NEW: Function to get new audio stream
    const getNewAudioStream = async () => {
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ 
                video: video && videoAvailable, 
                audio: audioAvailable 
            });
            
            if (window.localStream) {
                // Replace audio tracks
                const oldAudioTracks = window.localStream.getAudioTracks();
                oldAudioTracks.forEach(track => {
                    track.stop();
                    window.localStream.removeTrack(track);
                });
                
                const newAudioTracks = newStream.getAudioTracks();
                newAudioTracks.forEach(track => {
                    window.localStream.addTrack(track);
                });
                
                // Handle video if needed
                if (!window.localStream.getVideoTracks().length && video && videoAvailable) {
                    const newVideoTracks = newStream.getVideoTracks();
                    newVideoTracks.forEach(track => {
                        window.localStream.addTrack(track);
                    });
                }
            } else {
                window.localStream = newStream;
            }
            
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }
            
            updatePeerConnections();
            setAudio(true);
            
            if (socketRef.current) {
                socketRef.current.emit('audio-on', socketIdRef.current);
            }
            
            console.log("New audio stream obtained");
            
        } catch (error) {
            console.error("Error getting new audio stream:", error);
            setAudio(false);
            throw error;
        }
    };

    // NEW: Function to update peer connections
    const updatePeerConnections = () => {
        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            
            try {
                const senders = connections[id].getSenders();
                
                window.localStream.getTracks().forEach(newTrack => {
                    const sender = senders.find(s => 
                        s.track && s.track.kind === newTrack.kind
                    );
                    
                    if (sender) {
                        sender.replaceTrack(newTrack).catch(e => {
                            console.error("Error replacing track:", e);
                        });
                    } else {
                        connections[id].addTrack(newTrack, window.localStream);
                    }
                });
                
            } catch (error) {
                console.error("Error updating peer connection:", error);
            }
        }
    };

    const getUserMediaSuccess = (stream) => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { console.log(e) }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            const senders = connections[id].getSenders();
            senders.forEach(sender => {
                if (sender.track) {
                    connections[id].removeTrack(sender);
                }
            });

            stream.getTracks().forEach(track => {
                connections[id].addTrack(track, stream);
            });

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                    })
                    .catch(e => console.log(e));
            });
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                if (localVideoref.current && localVideoref.current.srcObject) {
                    let tracks = localVideoref.current.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                }
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }

            for (let id in connections) {
                const senders = connections[id].getSenders();
                senders.forEach(sender => {
                    if (sender.track) {
                        connections[id].removeTrack(sender);
                    }
                });

                window.localStream.getTracks().forEach(track => {
                    connections[id].addTrack(track, window.localStream);
                });

                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                        })
                        .catch(e => console.log(e));
                });
            }
        });
    };

    const getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ 
                video: video && videoAvailable, 
                audio: audio && audioAvailable 
            })
            .then(getUserMediaSuccess)
            .catch((e) => {
                console.error("getUserMedia error:", e);
                if (e.name === 'NotAllowedError') {
                    alert('Camera/microphone access denied. Please allow permissions.');
                } else if (e.name === 'NotFoundError') {
                    alert('No camera/microphone found.');
                } else {
                    alert('Error accessing media devices: ' + e.message);
                }
                setVideo(false);
                setAudio(false);
            });
        } else {
            try {
                if (localVideoref.current && localVideoref.current.srcObject) {
                    let tracks = localVideoref.current.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                }
                
                let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                window.localStream = blackSilence();
                
                if (localVideoref.current) {
                    localVideoref.current.srcObject = window.localStream;
                }
            } catch (e) {
                console.error("Error creating black/silent stream:", e);
            }
        }
    };

    const getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .catch((e) => console.log(e));
            }
        }
    };

    const getDislayMediaSuccess = (stream) => {
        console.log("Screen share started");
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { console.log(e) }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        for (let id in connections) {
            if (id === socketIdRef.current) continue;

            const senders = connections[id].getSenders();
            senders.forEach(sender => {
                if (sender.track) {
                    connections[id].removeTrack(sender);
                }
            });

            stream.getTracks().forEach(track => {
                connections[id].addTrack(track, stream);
            });

            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                    })
                    .catch(e => console.log(e));
            });
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false);

            try {
                if (localVideoref.current && localVideoref.current.srcObject) {
                    let tracks = localVideoref.current.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                }
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }

            getUserMedia();
        });
    };

    const gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }));
                            }).catch(e => console.log(e));
                        }).catch(e => console.log(e));
                    }
                }).catch(e => console.log(e));
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
            }
        }
    };

    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id));
            });

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
                    
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
                        }
                    };

                    connections[socketListId].ontrack = (event) => {
                        console.log("Received remote track from:", socketListId);

                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);

                        if (videoExists) {
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: event.streams[0] } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            let newVideo = {
                                socketId: socketListId,
                                stream: event.streams[0],
                                autoplay: true,
                                playsinline: true
                            };

                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };

                    if (window.localStream !== undefined && window.localStream !== null) {
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                        window.localStream = blackSilence();
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;

                        try {
                            window.localStream.getTracks().forEach(track => {
                                connections[id2].addTrack(track, window.localStream);
                            });
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }));
                                })
                                .catch(e => console.log(e));
                        });
                    }
                }
            });
        });
    };

    const silence = () => {
        let ctx = new AudioContext();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    };
    
    const black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    useEffect(() => {
        if (screen !== undefined) {
            getDislayMedia();
        }
    }, [screen]);

    const handleScreen = () => {
        setScreen(!screen);
    };

    // UPDATED: Better end call function
    const handleEndCall = () => {
        console.log("Ending call...");
        
        try {
            cleanupAllMedia();
        } catch (error) {
            console.error("Error ending call:", error);
        }
        
        setTimeout(() => {
            window.location.href = "/";
        }, 300);
    };

    const openChat = () => {
        setModal(true);
        setNewMessages(0);
    };
    
    const closeChat = () => {
        setModal(false);
    };
    
    const handleMessage = (e) => {
        setMessage(e.target.value);
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    const sendMessage = () => {
        if (message.trim() && socketRef.current) {
            socketRef.current.emit('chat-message', message, username);
            setMessage("");
        }
    };
    
    const connect = () => {
        if (username.trim()) {
            setAskForUsername(false);
            getMedia();
        } else {
            alert('Please enter a username');
        }
    };

    // NEW: Manual media release function
    const releaseCamera = () => {
        console.log("Manually releasing camera and microphone...");
        
        try {
            cleanupAllMedia();
            setVideo(false);
            setAudio(false);
            
            console.log("Media released successfully");
            
        } catch (error) {
            console.error("Error releasing media:", error);
        }
    };

    return (
        <div>
            {askForUsername === true ?
                <div>
                    <h2>Enter into Lobby</h2>
                    <TextField 
                        id="outlined-basic" 
                        label="Username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        variant="outlined" 
                    />
                    <Button variant="contained" onClick={connect}>Connect</Button>

                    <div>
                        <video ref={localVideoref} autoPlay muted></video>
                    </div>
                </div> :

                <div className={styles.meetVideoContainer}>
                    {showModal ? 
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <h1>Chat</h1>

                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? messages.map((item, index) => {
                                        return (
                                            <div style={{ marginBottom: "20px" }} key={index}>
                                                <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                                                <p>{item.data}</p>
                                            </div>
                                        )
                                    }) : <p>No Messages Yet</p>}
                                </div>

                                <div className={styles.chattingArea}>
                                    <TextField 
                                        value={message} 
                                        onChange={handleMessage} 
                                        id="outlined-basic" 
                                        label="Enter Your chat" 
                                        variant="outlined" 
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                sendMessage();
                                            }
                                        }}
                                    />
                                    <Button variant='contained' onClick={sendMessage}>Send</Button>
                                </div>
                            </div>
                        </div> 
                    : <></>}

                    <div className={styles.buttonContainers}>
                        <IconButton onClick={handleVideo} style={{ color: video ? "white" : "red" }}>
                            {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        
                        <IconButton onClick={handleEndCall} style={{ color: "red" }}>
                            <CallEndIcon />
                        </IconButton>
                        
                        <IconButton onClick={handleAudio} style={{ color: audio ? "white" : "red" }}>
                            {audio === true ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable === true ?
                            <IconButton onClick={handleScreen} style={{ color: "white" }}>
                                {screen === true ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton> 
                        : <></>}

                        <Badge badgeContent={newMessages} max={999} color='secondary'>
                            <IconButton onClick={() => setModal(!showModal)} style={{ color: "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>

                        {/* Emergency stop button */}
                        <IconButton 
                            onClick={releaseCamera} 
                            style={{ color: "orange" }}
                            title="Force stop camera"
                        >
                            <span style={{ fontSize: '16px' }}>📷❌</span>
                        </IconButton>
                    </div>

                    <video className={styles.meetUserVideo} ref={localVideoref} autoPlay muted></video>

                    <div className={styles.conferenceView}>
                        {videos.map((video) => (
                            <div key={video.socketId}>
                                <video
                                    data-socket={video.socketId}
                                    ref={ref => {
                                        if (ref && video.stream) {
                                            ref.srcObject = video.stream;
                                        }
                                    }}
                                    autoPlay
                                    playsInline
                                >
                                </video>
                            </div>
                        ))}
                    </div>
                </div>
            }
        </div>
    )
}
