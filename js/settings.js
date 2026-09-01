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
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentUser = window.ChatApp.getCurrentUser();
            const currentPass = currentPasswordInput.value;
            const newPass = newPasswordInput.value;
            
            if (currentUser.password && currentUser.password !== currentPass) {
                alert("Current password is incorrect.");
                return;
            }
            
            const updatedUser = { ...currentUser, password: newPass };
            let users = window.ChatApp.getAllUsers();
            const index = users.findIndex(u => u.id === currentUser.id);
            if (index !== -1) {
                users[index] = updatedUser;
            } else {
                users.push(updatedUser);
            }
            
            try {
                window.ChatApp.setAllUsers(users);
                window.ChatApp.setCurrentUser(updatedUser);
                alert("Password updated successfully!");
                passwordSidebar.classList.remove('active');
                passwordForm.reset();
            } catch (err) {
                alert("Failed to save password.");
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
        menuLogout.addEventListener('click', (e) => {
            e.preventDefault();
            window.ChatApp.clearCurrentUser();
            window.location.href = 'login.html';
        });
    }
});
