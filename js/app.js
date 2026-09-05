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
            });
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

    // 1.2 Groups Listener
    const qGroups = query(collection(db, "groups"));
    onSnapshot(qGroups, (snapshot) => {
        const groups = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            // Only add group if current user is a member
            if (data.members && data.members.includes(currentUser.id)) {
                groups.push({ ...data, id: doc.id, type: 'group' });
            }
        });
        window.ChatApp._groups = groups;
        if (window.ChatApp.renderContacts) window.ChatApp.renderContacts();
    });

        // 1.5 Chat Settings Listener
    const qSettings = query(collection(db, "chat_settings"));
    onSnapshot(qSettings, (snapshot) => {
        const settings = {};
        snapshot.forEach((doc) => {
            settings[doc.id] = doc.data();
        });
        window.ChatApp._chatSettings = settings;
    });

    // 2. Messages Listener
    let initialLoad = true;
    const qMessages = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    
    onSnapshot(qMessages, (snapshot) => {
        const messages = [];
        snapshot.forEach((doc) => {
            messages.push({ ...doc.data(), id: doc.id });
        });
        
        
        // Clean up disappearing messages
        const validMessages = [];
        const toDeleteIds = [];
        const now = Date.now();
        
        messages.forEach(msg => {
            const chatId = [msg.senderId, msg.receiverId].sort().join('_');
            const settings = (window.ChatApp._chatSettings && window.ChatApp._chatSettings[chatId]) || {};
            
            if (settings.disappearing && settings.disappearing !== 'off') {
                const msgTime = new Date(msg.timestamp).getTime();
                let expiryMs = 0;
                if (settings.disappearing === '24h') expiryMs = 24 * 60 * 60 * 1000;
                else if (settings.disappearing === '7d') expiryMs = 7 * 24 * 60 * 60 * 1000;
                else if (settings.disappearing === '90d') expiryMs = 90 * 24 * 60 * 60 * 1000;
                
                if (now - msgTime > expiryMs) {
                    toDeleteIds.push(msg.id);
                    return; // Skip adding to validMessages
                }
            }
            validMessages.push(msg);
        });
        
        // Background deletion of expired messages (using writeBatch could be better but deleteDoc is simple)
        if (toDeleteIds.length > 0 && !initialLoad) {
            toDeleteIds.forEach(async (id) => {
                try {
                    await deleteDoc(doc(db, "messages", id));
                } catch (e) {}
            });
        }
        
        const oldLength = window.ChatApp._messages.length;
        window.ChatApp._messages = validMessages;
        
        // Notification logic based on new messages
        if (!initialLoad) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const latestMsg = change.doc.data();
                    const activePartnerId = window.ChatApp.activeChatPartner ? window.ChatApp.activeChatPartner.id : null;
                    
                    if (latestMsg.receiverId === currentUser.id && !latestMsg.read) {
                        const chatId = [currentUser.id, latestMsg.senderId].sort().join('_');
                        const isMuted = window.ChatApp._chatSettings && window.ChatApp._chatSettings[chatId] && window.ChatApp._chatSettings[chatId].muted;
                        
                        if (!isMuted && (activePartnerId !== latestMsg.senderId || document.hidden)) {
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
