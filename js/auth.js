import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // Global Toast Function for Auth Pages
    window.showToast = (message, type = 'error') => {
        let toast = document.getElementById('toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast';
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        if (type === 'error') toast.style.backgroundColor = 'var(--danger)';
        else if (type === 'success') toast.style.backgroundColor = 'var(--success)';
        else toast.style.backgroundColor = 'var(--accent-color)';
        
        toast.className = 'toast show';
        setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
    };

    // -- Register Form Logic --
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            
            if (password !== confirmPassword) {
                window.showToast('Passwords do not match!', 'error');
                return;
            }
            
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';
            
            try {
                // 1. Create user in Firebase Auth
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                
                // 2. Create user document in Firestore
                const userData = {
                    id: user.uid,
                    name: name,
                    email: email,
                    joinedAt: new Date().toISOString(),
                    username: '@' + name.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 1000),
                    bio: 'Available',
                    profilePic: null
                };
                
                await setDoc(doc(db, "users", user.uid), userData);
                
                // 3. Save locally for immediate access
                localStorage.setItem('current_user', JSON.stringify(userData));
                
                // 4. Redirect
                window.location.href = 'chat.html';
            } catch (error) {
                window.showToast('Error creating account: ' + error.message, 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Up';
            }
        });
    }

    // -- Login Form Logic --
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing In...';
            
            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                
                // Note: The actual user data will be fetched in store.js or app.js
                // For now, just set a basic token so router knows we're authenticated
                localStorage.setItem('current_user', JSON.stringify({
                    id: userCredential.user.uid,
                    email: userCredential.user.email
                }));
                
                window.location.href = 'chat.html';
            } catch (error) {
                window.showToast('Invalid email or password!', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign In';
            }
        });
    }

    // -- Forgot Password Form Logic --
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            
            try {
                await sendPasswordResetEmail(auth, email);
                window.showToast('A password reset link has been sent to your email!', 'success');
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            } catch (error) {
                window.showToast('Error: ' + error.message, 'error');
            }
        });
    }
});
