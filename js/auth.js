import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
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
                alert('Passwords do not match!');
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
                sessionStorage.setItem('current_user', JSON.stringify(userData));
                
                // 4. Redirect
                window.location.href = 'chat.html';
            } catch (error) {
                alert('Error creating account: ' + error.message);
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
                sessionStorage.setItem('current_user', JSON.stringify({
                    id: userCredential.user.uid,
                    email: userCredential.user.email
                }));
                
                window.location.href = 'chat.html';
            } catch (error) {
                alert('Invalid email or password! ' + error.message);
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
                alert('A password reset link has been sent to your email!');
                window.location.href = 'login.html';
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    }
});
