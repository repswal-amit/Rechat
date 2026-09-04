import { db } from './firebase-config.js';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Application Bootstrapper and Firebase Sync
document.addEventListener('DOMContentLoaded', () => {
    
    // Apply saved theme early
    const themeToggle = document.getElementById('theme-toggle');
    if (localStorage.getItem('theme') === 'light') {
        document.body.classList.add('light-mode');
        if (themeToggle) themeToggle.checked = false;
    }

    // Ask for Notification permission
    if (window.Notification && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }

    const playNotificationSound = () => {
        try {
            // Try to play a pleasant notification sound
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(() => {
                // Fallback to beep if audio play fails (e.g., due to browser policy)
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gainNode = ctx.createGain();
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                
                gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch (e) {
            console.warn("AudioContext error", e);
        }
    };

    const currentUser = window.ChatApp.getCurrentUser();
    if (!currentUser) return; // Only sync if logged in

    // --- FIREBASE REAL-TIME SYNC ---

    // 0. Presence / Heartbeat (Update lastActive every 1 minute)
    const updatePresence = async () => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, "users", currentUser.id), {
                lastActive: new Date().toISOString()
            });
        } catch (e) {
            console.error("Error updating presence", e);
        }
    };
    // Update immediately and then every 1 minute
    updatePresence();
    setInterval(updatePresence, 60000);
    // Also update when user comes back to the tab
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) updatePresence();
    });

    // 1. Users Listener
    const qUsers = query(collection(db, "users"));
    onSnapshot(qUsers, (snapshot) => {
        const users = [];
        snapshot.forEach((doc) => {
            users.push({ ...doc.data(), id: doc.id });
        });
        window.ChatApp._users = users;
        
        // Update current user if it changed
        const latestMe = users.find(u => u.id === currentUser.id);
        if (latestMe) {
            window.ChatApp.setCurrentUser(latestMe);
        }
        
        // Update contact info sidebar if open
        const contactInfoSidebar = document.getElementById('contact-info-sidebar');
        if (window.ChatApp.activeChatPartner && contactInfoSidebar && contactInfoSidebar.classList.contains('active')) {
             const latestPartner = users.find(u => u.id === window.ChatApp.activeChatPartner.id);
             if (latestPartner) {
                 const contactInfoAvatar = document.getElementById('contact-info-avatar');
                 const contactInfoName = document.getElementById('contact-info-name');
                 const contactInfoUsername = document.getElementById('contact-info-username');
                 const contactInfoBio = document.getElementById('contact-info-bio');
                 
                 window.ChatApp.updateAvatarElement(contactInfoAvatar, latestPartner);
                 if (contactInfoName) contactInfoName.textContent = latestPartner.name;
                 if (contactInfoUsername) contactInfoUsername.textContent = latestPartner.username || '@username';
                 if (contactInfoBio) contactInfoBio.textContent = latestPartner.bio || 'No bio available.';
             }
         }
        
        if (window.ChatApp.renderContacts) window.ChatApp.renderContacts();
    });

    // 2. Messages Listener
    let initialLoad = true;
    const qMessages = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    
    onSnapshot(qMessages, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
            messages.push({ ...doc.data(), id: doc.id });
        });
        
        const oldLength = window.ChatApp._messages.length;
        window.ChatApp._messages = messages;
        
        // Notification logic based on new messages
        if (!initialLoad) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const latestMsg = change.doc.data();
                    const activePartnerId = window.ChatApp.activeChatPartner ? window.ChatApp.activeChatPartner.id : null;
                    
                    if (latestMsg.receiverId === currentUser.id && !latestMsg.read) {
                        if (activePartnerId !== latestMsg.senderId || document.hidden) {
                            playNotificationSound();
                            
                            if (window.Notification && Notification.permission === "granted") {
                                const sender = window.ChatApp._users.find(u => u.id === latestMsg.senderId);
                                const senderName = sender ? sender.name : 'Someone';
                                
                                const n = new Notification(`New message from ${senderName}`, {
                                    body: latestMsg.text,
                                    icon: sender ? sender.profilePic : null
                                });
                                n.onclick = () => {
                                    window.focus();
                                    n.close();
                                };
                            }
                        }
                    }
                }
            });
        }
        
        initialLoad = false;
        
        if (window.ChatApp.renderContacts) window.ChatApp.renderContacts();
        if (window.ChatApp.activeChatPartner && window.ChatApp.renderMessages) {
            window.ChatApp.renderMessages();
        }
    });

});
