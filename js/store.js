// Global State and Data Management
window.ChatApp = {
    activeChatPartner: null,
    renderContacts: null, // to be populated by chat.js
    renderMessages: null, // to be populated by chat.js
    
    // Auth
    getCurrentUser: () => JSON.parse(sessionStorage.getItem('current_user')),
    setCurrentUser: (user) => sessionStorage.setItem('current_user', JSON.stringify(user)),
    clearCurrentUser: () => sessionStorage.removeItem('current_user'),
    
    // Users
    getAllUsers: () => JSON.parse(localStorage.getItem('chat_users') || '[]'),
    setAllUsers: (users) => localStorage.setItem('chat_users', JSON.stringify(users)),
    getOtherUsers: () => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return [];
        return window.ChatApp.getAllUsers().filter(u => u.id !== currentUser.id);
    },
    
    // Messages
    getAllMessages: () => JSON.parse(localStorage.getItem('chat_messages') || '[]'),
    saveMessage: (receiverId, text) => {
        const messages = window.ChatApp.getAllMessages();
        const currentUser = window.ChatApp.getCurrentUser();
        const newMessage = {
            id: 'msg_' + Date.now(),
            senderId: currentUser.id,
            receiverId: receiverId,
            text: text,
            timestamp: new Date().toISOString(),
            read: false
        };
        messages.push(newMessage);
        localStorage.setItem('chat_messages', JSON.stringify(messages));
        return newMessage;
    },
    
    markMessagesAsRead: (senderId) => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        const messages = window.ChatApp.getAllMessages();
        let changed = false;
        messages.forEach(m => {
            if (m.senderId === senderId && m.receiverId === currentUser.id && !m.read) {
                m.read = true;
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem('chat_messages', JSON.stringify(messages));
        }
    },
    
    editMessage: (msgId, newText) => {
        const messages = window.ChatApp.getAllMessages();
        const index = messages.findIndex(m => m.id === msgId);
        if (index !== -1) {
            messages[index].text = newText;
            messages[index].edited = true;
            localStorage.setItem('chat_messages', JSON.stringify(messages));
        }
    },
    
    deleteMessage: (msgId) => {
        let messages = window.ChatApp.getAllMessages();
        messages = messages.filter(m => m.id !== msgId);
        localStorage.setItem('chat_messages', JSON.stringify(messages));
    },
    
    // Utilities
    formatTime: (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    getAvatarHtml: (user, classes = "") => {
        if (user.profilePic) {
            return `<div class="avatar ${classes}" style="background-image: url('${user.profilePic}'); color: transparent;"></div>`;
        }
        return `<div class="avatar ${classes}">${user.name.charAt(0).toUpperCase()}</div>`;
    },
    
    updateAvatarElement: (el, user) => {
        if (!el) return;
        if (user.profilePic) {
            el.style.backgroundImage = `url('${user.profilePic}')`;
            el.textContent = '';
        } else {
            el.style.backgroundImage = 'none';
            el.textContent = user.name.charAt(0).toUpperCase();
        }
    }
};

// Check Auth Immediately
if (!window.ChatApp.getCurrentUser()) {
    window.location.href = 'login.html';
}
