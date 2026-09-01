// Application Bootstrapper and Multi-Tab Sync
document.addEventListener('DOMContentLoaded', () => {
    
    // Apply saved theme early (in addition to store.js initial check if any)
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

    // --- REAL-TIME MULTI-TAB SYNC ---
    window.addEventListener('storage', (e) => {
        if (e.key === 'chat_messages' || e.key === 'chat_users') {
            
            if (e.key === 'chat_messages') {
                try {
                    const oldMsgs = JSON.parse(e.oldValue || '[]');
                    const newMsgs = JSON.parse(e.newValue || '[]');
                    const currentUser = window.ChatApp.getCurrentUser();
                    
                    if (currentUser && newMsgs.length > oldMsgs.length) {
                        const latestMsg = newMsgs[newMsgs.length - 1];
                        const activePartnerId = window.ChatApp.activeChatPartner ? window.ChatApp.activeChatPartner.id : null;
                        
                        if (latestMsg.receiverId === currentUser.id && !latestMsg.read) {
                            if (activePartnerId !== latestMsg.senderId || document.hidden) {
                                playNotificationSound();
                                
                                if (window.Notification && Notification.permission === "granted") {
                                    const sender = window.ChatApp.getAllUsers().find(u => u.id === latestMsg.senderId);
                                    const senderName = sender ? sender.name : 'Someone';
                                    
                                    const n = new Notification(`New message from ${senderName}`, {
                                        body: latestMsg.text
                                    });
                                    n.onclick = () => {
                                        window.focus();
                                        n.close();
                                    };
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error("Notification error", err);
                }
            }

            if (e.key === 'chat_users') {
                 const users = window.ChatApp.getAllUsers();
                 const currentUser = window.ChatApp.getCurrentUser();
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
                         contactInfoName.textContent = latestPartner.name;
                         contactInfoUsername.textContent = latestPartner.username || '@username';
                         contactInfoBio.textContent = latestPartner.bio || 'No bio available.';
                     }
                 }
            }
            if (window.ChatApp.renderContacts) window.ChatApp.renderContacts();
            if (window.ChatApp.activeChatPartner && window.ChatApp.renderMessages) {
                window.ChatApp.renderMessages();
            }
        }
    });

    // Initial render
    if (window.ChatApp.renderContacts) {
        window.ChatApp.renderContacts();
    }
});
