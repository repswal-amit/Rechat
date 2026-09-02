import { db } from './firebase-config.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    if (!window.ChatApp.getCurrentUser()) return;

    const myProfileSidebar = document.getElementById('my-profile-sidebar');
    const closeMyProfileBtn = document.getElementById('close-my-profile-btn');
    const myProfileAvatar = document.getElementById('my-profile-avatar');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const profileForm = document.getElementById('profile-form');
    const editNameInput = document.getElementById('edit-name');
    const editUsernameInput = document.getElementById('edit-username');
    const editBioInput = document.getElementById('edit-bio');
    
    // We get pendingProfilePic from the window to share state locally in this file
    let pendingProfilePic = null;

    // The button to open this sidebar is inside the settings menu, handled by settings.js
    // But we expose a global function to open the profile editor
    window.ChatApp.openProfileEditor = () => {
        const currentUser = window.ChatApp.getCurrentUser();
        pendingProfilePic = currentUser.profilePic || null;
        window.ChatApp.updateAvatarElement(myProfileAvatar, currentUser);
        editNameInput.value = currentUser.name;
        editUsernameInput.value = currentUser.username || '';
        editBioInput.value = currentUser.bio || '';
        myProfileSidebar.classList.add('active');
    };

    if (closeMyProfileBtn) {
        closeMyProfileBtn.addEventListener('click', () => {
            myProfileSidebar.classList.remove('active');
        });
    }

    if (profilePicUpload) {
        profilePicUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 256;
                        let width = img.width;
                        let height = img.height;
                        
                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                            }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        pendingProfilePic = canvas.toDataURL('image/jpeg', 0.8);
                        myProfileAvatar.style.backgroundImage = `url('${pendingProfilePic}')`;
                        myProfileAvatar.textContent = '';
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentUser = window.ChatApp.getCurrentUser();
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            
            const updatedUser = {
                ...currentUser,
                name: editNameInput.value.trim(),
                username: editUsernameInput.value.trim(),
                bio: editBioInput.value.trim(),
                profilePic: pendingProfilePic
            };
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
            
            try {
                // Update Firestore
                const userRef = doc(db, "users", currentUser.id);
                await updateDoc(userRef, {
                    name: updatedUser.name,
                    username: updatedUser.username,
                    bio: updatedUser.bio,
                    profilePic: updatedUser.profilePic
                });
                
                // Update Local Storage Session
                window.ChatApp.setCurrentUser(updatedUser);
                
                myProfileSidebar.classList.remove('active');
            } catch (err) {
                console.error("Error updating profile:", err);
                window.showToast('Failed to save profile. The image might be too large.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Changes';
            }
        });
    }
});
