import { auth } from './firebase-config.js';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    if (!window.ChatApp.getCurrentUser()) return;

    // DOM Elements - Settings
    const settingsSidebar = document.getElementById('settings-sidebar');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    
    // DOM Elements - Settings Menu Items
    const menuProfile = document.getElementById('menu-profile');
    const menuPassword = document.getElementById('menu-password');
    const menuManageStorage = document.getElementById('menu-manage-storage');
    const themeToggle = document.getElementById('theme-toggle');
    const menuLogout = document.getElementById('menu-logout');
    const myProfileBtn = document.getElementById('my-profile-btn'); // From main header
    
    // DOM Elements - Password Update
    const passwordSidebar = document.getElementById('password-sidebar');
    const closePasswordBtn = document.getElementById('close-password-btn');
    const passwordForm = document.getElementById('password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');

    // DOM Elements - Manage Storage
    const manageStorageSidebar = document.getElementById('manage-storage-sidebar');
    const closeManageStorageBtn = document.getElementById('close-manage-storage-btn');
    const storageTotalUsed = document.getElementById('storage-total-used');
    const storageChatsList = document.getElementById('storage-chats-list');
    const btnClearAllStorage = document.getElementById('btn-clear-all-storage');

    // Sidebar Toggles
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsSidebar.classList.add('active');
            history.pushState({ settingsOpen: true }, '');
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            if (history.state && history.state.settingsOpen) {
                history.back();
            } else {
                settingsSidebar.classList.remove('active');
            }
        });
    }

    // Handle back button for sidebars
    window.addEventListener('popstate', () => {
        if (settingsSidebar && settingsSidebar.classList.contains('active')) {
            settingsSidebar.classList.remove('active');
        }
        if (passwordSidebar && passwordSidebar.classList.contains('active')) {
            passwordSidebar.classList.remove('active');
        }
        if (manageStorageSidebar && manageStorageSidebar.classList.contains('active')) {
            manageStorageSidebar.classList.remove('active');
        }
    });

    // Profile Menu
    const openProfile = () => {
        settingsSidebar.classList.remove('active');
        if (window.ChatApp.openProfileEditor) {
            window.ChatApp.openProfileEditor();
        }
    };
    
    if (menuProfile) menuProfile.addEventListener('click', openProfile);
    if (myProfileBtn) myProfileBtn.addEventListener('click', openProfile);

    // Password Update Menu
    if (menuPassword) {
        menuPassword.addEventListener('click', () => {
            settingsSidebar.classList.remove('active');
            passwordSidebar.classList.add('active');
            history.pushState({ passwordOpen: true }, '');
        });
    }
    if (closePasswordBtn) {
        closePasswordBtn.addEventListener('click', () => {
            if (history.state && history.state.passwordOpen) {
                history.back();
            } else {
                passwordSidebar.classList.remove('active');
            }
        });
    }

    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPass = currentPasswordInput.value;
            const newPass = newPasswordInput.value;
            
            try {
                const user = auth.currentUser;
                if (!user) throw new Error("Please wait for authentication to complete or log in again.");
                
                // Reauthenticate
                const credential = EmailAuthProvider.credential(user.email, currentPass);
                await reauthenticateWithCredential(user, credential);
                
                // Update password
                await updatePassword(user, newPass);
                
                window.showToast("Password updated successfully!", "success");
                passwordForm.reset();
                passwordSidebar.classList.remove('active');
            } catch (err) {
                window.showToast("Failed to update password: " + err.message, "error");
            }
        });
    }


    // Manage Storage Menu
    const calculateStorage = () => {
        const currentUser = window.ChatApp.getCurrentUser();
        if (!currentUser) return;
        
        const messages = window.ChatApp.getAllMessages();
        const otherUsers = window.ChatApp.getOtherUsers();
        
        let totalBytes = 0;
        const chatStorage = {};
        
        otherUsers.forEach(u => chatStorage[u.id] = { user: u, bytes: 0, msgCount: 0 });
        
        messages.forEach(msg => {
            if (msg.senderId === currentUser.id || msg.receiverId === currentUser.id) {
                const partnerId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;
                if (!chatStorage[partnerId]) return;
                
                // Estimate size
                let size = 0;
                if (msg.text) size += msg.text.length * 2; // 2 bytes per char
                if (msg.imageUrl) size += 500 * 1024; // estimate 500KB per image
                
                chatStorage[partnerId].bytes += size;
                chatStorage[partnerId].msgCount += 1;
                totalBytes += size;
            }
        });
        
        // Render Total
        storageTotalUsed.textContent = (totalBytes / (1024 * 1024)).toFixed(2) + ' MB';
        
        // Render List
        storageChatsList.innerHTML = '';
        const sortedChats = Object.values(chatStorage).sort((a, b) => b.bytes - a.bytes).filter(c => c.bytes > 0);
        
        if (sortedChats.length === 0) {
            storageChatsList.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 1rem;">No storage used yet.</div>';
            return;
        }
        
        sortedChats.forEach(chat => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.padding = '0.5rem';
            item.style.background = 'var(--bg-primary)';
            item.style.borderRadius = '8px';
            item.style.marginBottom = '0.5rem';
            
            const mb = (chat.bytes / (1024 * 1024)).toFixed(2);
            
            item.innerHTML = `
                <div class="avatar" style="width: 40px; height: 40px; font-size: 1rem; margin-right: 0.5rem; flex-shrink: 0;">${chat.user.name ? chat.user.name.charAt(0).toUpperCase() : '?'}</div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${chat.user.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${chat.msgCount} messages</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.9rem; color: var(--accent); font-weight: 600;">${mb} MB</div>
                    <button class="btn-clear-chat" data-id="${chat.user.id}" style="background: transparent; border: none; color: var(--danger); font-size: 0.8rem; cursor: pointer; padding: 4px;">Clear</button>
                </div>
            `;
            storageChatsList.appendChild(item);
            
            // Set Avatar BG if available
            if (chat.user.profilePic) {
                const av = item.querySelector('.avatar');
                av.style.backgroundImage = `url('${chat.user.profilePic}')`;
                av.style.color = 'transparent';
            }
        });
        
        // Bind Clear buttons
        const clearBtns = storageChatsList.querySelectorAll('.btn-clear-chat');
        clearBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const pid = btn.getAttribute('data-id');
                if (confirm('Clear all messages and media for this chat?')) {
                    window.ChatApp.deleteEntireChat(pid);
                    setTimeout(calculateStorage, 500); // refresh after a short delay
                }
            });
        });
    };

    if (menuManageStorage) {
        menuManageStorage.addEventListener('click', () => {
            settingsSidebar.classList.remove('active');
            manageStorageSidebar.classList.add('active');
            history.pushState({ manageStorageOpen: true }, '');
            calculateStorage();
        });
    }
    
    if (closeManageStorageBtn) {
        closeManageStorageBtn.addEventListener('click', () => {
            if (history.state && history.state.manageStorageOpen) {
                history.back();
            } else {
                manageStorageSidebar.classList.remove('active');
            }
        });
    }
    
    if (btnClearAllStorage) {
        btnClearAllStorage.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear ALL chat histories? This cannot be undone.')) {
                const otherUsers = window.ChatApp.getOtherUsers().map(u => u.id);
                window.ChatApp.deleteMultipleChats(otherUsers);
                setTimeout(calculateStorage, 500);
            }
        });
    }

    // Theme Toggle
    if (themeToggle) {
        themeToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.classList.remove('light-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // Logout
    if (menuLogout) {
        menuLogout.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
            } catch (err) {
                console.error("Firebase signout error", err);
            }
            window.ChatApp.clearCurrentUser();
            window.location.href = 'login.html';
        });
    }
});
