// Authentication logic for the chatting app

document.addEventListener('DOMContentLoaded', () => {
    
    // -- Register Form Logic --
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }
            
            // Get existing users or initialize empty array
            let users = JSON.parse(localStorage.getItem('chat_users') || '[]');
            
            // Check if user already exists
            if (users.find(u => u.email === email)) {
                alert('Email already registered!');
                return;
            }
            
            // Create user object
            const newUser = {
                id: 'user_' + Date.now(),
                name: name,
                email: email,
                password: password, // In a real app, never store plain passwords!
                joinedAt: new Date().toISOString(),
                username: '@' + name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000),
                bio: 'Available',
                profilePic: null // null means use initials
            };
            
            users.push(newUser);
            localStorage.setItem('chat_users', JSON.stringify(users));
            
            // Log them in by saving to sessionStorage
            sessionStorage.setItem('current_user', JSON.stringify(newUser));
            
            // Redirect to chat
            window.location.href = 'chat.html';
        });
    }

    // -- Login Form Logic --
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            let users = JSON.parse(localStorage.getItem('chat_users') || '[]');
            const user = users.find(u => u.email === email && u.password === password);
            
            if (user) {
                // Log them in
                sessionStorage.setItem('current_user', JSON.stringify(user));
                window.location.href = 'chat.html';
            } else {
                alert('Invalid email or password!');
            }
        });
    }

    // -- Forgot Password Form Logic --
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('A password reset link has been sent to your email! (Mocked)');
            window.location.href = 'login.html';
        });
    }
});
