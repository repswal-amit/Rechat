import { db } from './firebase-config.js';
import { collection, addDoc, doc, updateDoc, deleteDoc, writeBatch, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Global State and Data Management
window.ChatApp = window.ChatApp || {};

// Local cache populated by app.js (onSnapshot)
window.ChatApp._users = [];
window.ChatApp._messages = [];
window.ChatApp._groups = [];

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
    
    // Groups
    getGroups: () => window.ChatApp._groups || [],
    createGroup: async (name, description, memberIds) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        try {
            // Include creator in members and admins
            const allMembers = Array.from(new Set([...memberIds, currentUser.id]));
            const newGroup = {
                name: name,
                description: description || '',
                avatarUrl: null,
                createdBy: currentUser.id,
                admins: [currentUser.id],
                members: allMembers,
                createdAt: new Date().toISOString(),
                type: 'group'
            };
            const docRef = await addDoc(collection(db, "groups"), newGroup);
            return docRef.id;
        } catch (e) {
            console.error("Error creating group", e);
        }
    },
    leaveGroup: async (groupId) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        try {
            const group = window.ChatApp._groups.find(g => g.id === groupId);
            if (!group) return;
            const newMembers = group.members.filter(id => id !== currentUser.id);
            const newAdmins = group.admins.filter(id => id !== currentUser.id);
            await updateDoc(doc(db, "groups", groupId), {
                members: newMembers,
                admins: newAdmins
            });
        } catch (e) {
            console.error("Error leaving group", e);
        }
    },
    addMembers: async (groupId, newMemberIds) => {
        try {
            const group = window.ChatApp._groups.find(g => g.id === groupId);
            if (!group) return;
            const updatedMembers = Array.from(new Set([...group.members, ...newMemberIds]));
            await updateDoc(doc(db, "groups", groupId), {
                members: updatedMembers
            });
        } catch (e) {
            console.error("Error adding members", e);
        }
    },
    removeMember: async (groupId, memberIdToRemove) => {
        try {
            const group = window.ChatApp._groups.find(g => g.id === groupId);
            if (!group) return;
            const updatedMembers = group.members.filter(id => id !== memberIdToRemove);
            const updatedAdmins = group.admins.filter(id => id !== memberIdToRemove);
            await updateDoc(doc(db, "groups", groupId), {
                members: updatedMembers,
                admins: updatedAdmins
            });
        } catch (e) {
            console.error("Error removing member", e);
        }
    },
    setAdminRole: async (groupId, userId, isAdmin) => {
        try {
            const group = window.ChatApp._groups.find(g => g.id === groupId);
            if (!group) return;
            let updatedAdmins = [...(group.admins || [])];
            if (isAdmin) {
                if (!updatedAdmins.includes(userId)) updatedAdmins.push(userId);
            } else {
                updatedAdmins = updatedAdmins.filter(id => id !== userId);
            }
            await updateDoc(doc(db, "groups", groupId), {
                admins: updatedAdmins
            });
        } catch (e) {
            console.error("Error setting admin role", e);
        }
    },
    
    // Messages
    getAllMessages: () => window.ChatApp._messages,
    saveMessage: async (receiverId, text, imageUrl = null, replyTo = null) => {
        const currentUser = window.ChatApp.getCurrentUser();
        
        const group = window.ChatApp._groups.find(g => g.id === receiverId);
        
        if (group) {
            if (!group.members.includes(currentUser.id)) {
                if (window.showToast) window.showToast("You are not a member of this group.", "error");
                return;
            }
        } else {
            // System-wide block check
            if (currentUser.blockedUsers && currentUser.blockedUsers.includes(receiverId)) {
                if (window.showToast) window.showToast("You blocked this contact. Unblock to send messages.", "error");
                return;
            }
            const receiverUser = window.ChatApp._users.find(u => u.id === receiverId);
            if (receiverUser && receiverUser.blockedUsers && receiverUser.blockedUsers.includes(currentUser.id)) {
                if (window.showToast) window.showToast("Message failed to send.", "error");
                return;
            }
        }

        const newMessage = {
            senderId: currentUser.id,
            receiverId: receiverId,
            text: text,
            timestamp: new Date().toISOString(),
            read: false,
            readBy: [currentUser.id]
        };
        if (group) newMessage.isGroup = true;
        if (imageUrl) newMessage.imageUrl = imageUrl;
        if (replyTo) newMessage.replyTo = replyTo;
        try {
            await addDoc(collection(db, "messages"), newMessage);
        } catch(e) {
            console.error("Error saving message", e);
        }
    },
    
    markMessagesAsRead: async (senderOrGroupId) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        
        try {
            const group = window.ChatApp._groups.find(g => g.id === senderOrGroupId);
            let toUpdate = [];
            
            if (group) {
                toUpdate = window.ChatApp._messages.filter(
                    m => m.receiverId === senderOrGroupId && (!m.readBy || !m.readBy.includes(currentUser.id))
                );
            } else {
                toUpdate = window.ChatApp._messages.filter(
                    m => m.senderId === senderOrGroupId && m.receiverId === currentUser.id && !m.read
                );
            }
            
            if (toUpdate.length > 0) {
                const batch = writeBatch(db);
                toUpdate.forEach(m => {
                    const msgRef = doc(db, "messages", m.id);
                    if (group) {
                        batch.update(msgRef, { readBy: arrayUnion(currentUser.id) });
                    } else {
                        batch.update(msgRef, { read: true });
                    }
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
    
    
    // Chat Settings
    getChatSettings: () => window.ChatApp._chatSettings || {},
    
    updateChatSetting: async (partnerId, updates) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        const chatId = [currentUser.id, partnerId].sort().join('_');
        
        try {
            const chatSettingsRef = doc(db, "chat_settings", chatId);
            
            // We use updateDoc. If it doesn't exist, we use setDoc with merge.
            // Let's import setDoc dynamically or assume updateDoc works?
            // Safer to use setDoc with merge: true which behaves like update/create
            const { setDoc } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
            await setDoc(chatSettingsRef, updates, { merge: true });
        } catch (e) {
            console.error("Error updating chat setting", e);
        }
    },
    
    deleteEntireChat: async (partnerId) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        try {
            const batch = writeBatch(db);
            const messages = window.ChatApp.getAllMessages().filter(m => 
                (m.senderId === currentUser.id && m.receiverId === partnerId) ||
                (m.senderId === partnerId && m.receiverId === currentUser.id)
            );
            
            messages.forEach(msg => {
                const msgRef = doc(db, "messages", msg.id);
                batch.delete(msgRef);
            });
            await batch.commit();
        } catch (e) {
            console.error("Error deleting entire chat", e);
        }
    },

    deleteMultipleChats: async (partnerIds) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        try {
            const batch = writeBatch(db);
            const messages = window.ChatApp.getAllMessages().filter(m => 
                partnerIds.includes(m.senderId) || partnerIds.includes(m.receiverId)
            );
            // filter for messages that involve the current user
            const myMessages = messages.filter(m => m.senderId === currentUser.id || m.receiverId === currentUser.id);
            
            myMessages.forEach(msg => {
                const msgRef = doc(db, "messages", msg.id);
                batch.delete(msgRef);
            });
            await batch.commit();
        } catch (e) {
            console.error("Error deleting multiple chats", e);
        }
    },

    blockUser: async (partnerId) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        try {
            const userRef = doc(db, "users", currentUser.id);
            // We need arrayUnion, it's already imported
            await updateDoc(userRef, {
                blockedUsers: arrayUnion(partnerId)
            });
            // Update current user in local storage so it reflects immediately
            const updatedUser = { ...currentUser };
            if (!updatedUser.blockedUsers) updatedUser.blockedUsers = [];
            if (!updatedUser.blockedUsers.includes(partnerId)) {
                updatedUser.blockedUsers.push(partnerId);
                window.ChatApp.setCurrentUser(updatedUser);
            }
        } catch (e) {
            console.error("Error blocking user", e);
        }
    },

    unblockUser: async (partnerId) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        try {
            const userRef = doc(db, "users", currentUser.id);
            const { arrayRemove } = await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js");
            await updateDoc(userRef, {
                blockedUsers: arrayRemove(partnerId)
            });
            // Update local
            const updatedUser = { ...currentUser };
            if (updatedUser.blockedUsers) {
                updatedUser.blockedUsers = updatedUser.blockedUsers.filter(id => id !== partnerId);
                window.ChatApp.setCurrentUser(updatedUser);
            }
        } catch (e) {
            console.error("Error unblocking user", e);
        }
    },

    // Utilities
    formatTime: (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    getAvatarHtml: (userOrGroup, classes = "") => {
        if (!userOrGroup) return `<div class="avatar ${classes}">?</div>`;
        if (userOrGroup.type === 'group') {
            if (userOrGroup.avatarUrl) {
                return `<div class="avatar ${classes}" style="background-image: url('${userOrGroup.avatarUrl}'); color: transparent;"></div>`;
            }
            return `<div class="avatar ${classes} group-avatar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg></div>`;
        }
        if (userOrGroup.profilePic) {
            return `<div class="avatar ${classes}" style="background-image: url('${userOrGroup.profilePic}'); color: transparent;"></div>`;
        }
        return `<div class="avatar ${classes}">${userOrGroup.name ? userOrGroup.name.charAt(0).toUpperCase() : '?'}</div>`;
    },
    
    updateAvatarElement: (el, userOrGroup) => {
        if (!el || !userOrGroup) return;
        if (userOrGroup.type === 'group' && !userOrGroup.avatarUrl) {
            el.style.backgroundImage = 'none';
            el.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`;
            return;
        }
        
        const pic = userOrGroup.type === 'group' ? userOrGroup.avatarUrl : userOrGroup.profilePic;
        if (pic) {
            el.style.backgroundImage = `url('${pic}')`;
            el.textContent = '';
        } else {
            el.style.backgroundImage = 'none';
            el.textContent = userOrGroup.name ? userOrGroup.name.charAt(0).toUpperCase() : '?';
        }
    }
};

// Check Auth Immediately
if (!window.ChatApp.getCurrentUser()) {
    if (!window.location.href.includes('login.html') && !window.location.href.includes('register.html')) {
        window.location.href = 'login.html';
    }
}
