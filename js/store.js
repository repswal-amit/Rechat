import { db } from './firebase-config.js';
import { collection, addDoc, doc, updateDoc, deleteDoc, writeBatch, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Global State and Data Management
window.ChatApp = window.ChatApp || {};

// Local cache populated by app.js (onSnapshot)
window.ChatApp._users = [];
window.ChatApp._messages = [];

window.ChatApp = {
    ...window.ChatApp,
    activeChatPartner: null,
    renderContacts: null, // to be populated by chat.js
    renderMessages: null, // to be populated by chat.js
    
    // Auth
    getCurrentUser: () => JSON.parse(localStorage.getItem('current_user')),
    setCurrentUser: (user) => localStorage.setItem('current_user', JSON.stringify(user)),
    clearCurrentUser: () => localStorage.removeItem('current_user'),
    
    // Users
    getAllUsers: () => window.ChatApp._users,
    setAllUsers: (users) => {
        // Not used manually with Firestore, handled by onSnapshot
        window.ChatApp._users = users;
    },
    getOtherUsers: () => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return [];
        return window.ChatApp._users.filter(u => u.id !== currentUser.id);
    },
    
    // Messages
    getAllMessages: () => window.ChatApp._messages,
    saveMessage: async (receiverId, text, imageUrl = null) => {
        const currentUser = window.ChatApp.getCurrentUser();
        const newMessage = {
            senderId: currentUser.id,
            receiverId: receiverId,
            text: text,
            timestamp: new Date().toISOString(),
            read: false
        };
        if (imageUrl) newMessage.imageUrl = imageUrl;
        try {
            await addDoc(collection(db, "messages"), newMessage);
        } catch(e) {
            console.error("Error saving message", e);
        }
    },
    
    markMessagesAsRead: async (senderId) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        
        try {
            const toUpdate = window.ChatApp._messages.filter(
                m => m.senderId === senderId && m.receiverId === currentUser.id && !m.read
            );
            
            if (toUpdate.length > 0) {
                const batch = writeBatch(db);
                toUpdate.forEach(m => {
                    const msgRef = doc(db, "messages", m.id);
                    batch.update(msgRef, { read: true });
                });
                await batch.commit();
            }
        } catch (e) {
            console.error("Error marking messages as read", e);
        }
    },
    
    editMessage: async (msgId, newText) => {
        try {
            const msgRef = doc(db, "messages", msgId);
            await updateDoc(msgRef, {
                text: newText,
                edited: true
            });
        } catch (e) {
            console.error("Error editing message", e);
        }
    },
    
    deleteMessagesForMe: async (msgIds) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        try {
            const batch = writeBatch(db);
            msgIds.forEach(msgId => {
                const msgRef = doc(db, "messages", msgId);
                batch.update(msgRef, {
                    deletedFor: arrayUnion(currentUser.id)
                });
            });
            await batch.commit();
        } catch (e) {
            console.error("Error deleting messages for me", e);
        }
    },
    
    deleteMessagesForEveryone: async (msgIds) => {
        try {
            const batch = writeBatch(db);
            msgIds.forEach(msgId => {
                const msgRef = doc(db, "messages", msgId);
                batch.update(msgRef, {
                    deletedForEveryone: true
                });
            });
            await batch.commit();
        } catch (e) {
            console.error("Error deleting messages for everyone", e);
        }
    },

    forwardMessages: async (msgIds, targetUserId) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        try {
            const messages = window.ChatApp.getAllMessages();
            const msgsToForward = msgIds.map(id => messages.find(m => m.id === id)).filter(Boolean);
            
            // Sort by time before forwarding to preserve order
            msgsToForward.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            for (const msg of msgsToForward) {
                // Forward original text/image
                await window.ChatApp.saveMessage(targetUserId, msg.text || '', msg.imageUrl || null);
            }
        } catch (e) {
            console.error("Error forwarding messages", e);
        }
    },

    addReaction: async (msgId, emoji) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        try {
            const msgRef = doc(db, "messages", msgId);
            const updateField = {};
            updateField[`reactions.${currentUser.id}`] = emoji;
            await updateDoc(msgRef, updateField);
        } catch (e) {
            console.error("Error adding reaction", e);
        }
    },
    
    // Utilities
    formatTime: (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    getAvatarHtml: (user, classes = "") => {
        if (!user) return `<div class="avatar ${classes}">?</div>`;
        if (user.profilePic) {
            return `<div class="avatar ${classes}" style="background-image: url('${user.profilePic}'); color: transparent;"></div>`;
        }
        return `<div class="avatar ${classes}">${user.name ? user.name.charAt(0).toUpperCase() : '?'}</div>`;
    },
    
    updateAvatarElement: (el, user) => {
        if (!el || !user) return;
        if (user.profilePic) {
            el.style.backgroundImage = `url('${user.profilePic}')`;
            el.textContent = '';
        } else {
            el.style.backgroundImage = 'none';
            el.textContent = user.name ? user.name.charAt(0).toUpperCase() : '?';
        }
    }
};

// Check Auth Immediately
if (!window.ChatApp.getCurrentUser()) {
    if (!window.location.href.includes('login.html') && !window.location.href.includes('register.html')) {
        window.location.href = 'login.html';
    }
}
