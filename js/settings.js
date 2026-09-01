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
    const themeToggle = document.getElementById('theme-toggle');
    const menuLogout = document.getElementById('menu-logout');
    const myProfileBtn = document.getElementById('my-profile-btn'); // From main header
    
    // DOM Elements - Password Update
    const passwordSidebar = document.getElementById('password-sidebar');
    const closePasswordBtn = document.getElementById('close-password-btn');
    const passwordForm = document.getElementById('password-form');
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');

    // Sidebar Toggles
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            settingsSidebar.classList.add('active');
        });
    }
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsSidebar.classList.remove('active');
        });
    }

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
        });
    }
    if (closePasswordBtn) {
        closePasswordBtn.addEventListener('click', () => {
            passwordSidebar.classList.remove('active');
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
                
                alert("Password updated successfully!");
                passwordSidebar.classList.remove('active');
                passwordForm.reset();
            } catch (err) {
                alert("Failed to update password: " + err.message);
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
