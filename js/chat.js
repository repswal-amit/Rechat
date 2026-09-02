import { cloudinaryConfig } from './cloudinary-config.js';

document.addEventListener('DOMContentLoaded', () => {
    if (!window.ChatApp.getCurrentUser()) return;

    const contactsList = document.getElementById('contacts-list');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.querySelector('.chat-input');
    const btnSend = document.querySelector('.btn-send');
    const chatPartnerName = document.getElementById('chat-partner-name');
    const chatPartnerStatus = document.getElementById('chat-partner-status');
    const chatPartnerAvatar = document.getElementById('chat-partner-avatar');
    const closeChatBtn = document.getElementById('close-chat-btn');
    const chatPartnerInfoBtn = document.getElementById('chat-partner-info-btn');
    
    const contactInfoSidebar = document.getElementById('contact-info-sidebar');
    const closeContactInfoBtn = document.getElementById('close-contact-info-btn');
    const contactInfoAvatar = document.getElementById('contact-info-avatar');
    const contactInfoName = document.getElementById('contact-info-name');
    const contactInfoUsername = document.getElementById('contact-info-username');
    const contactInfoBio = document.getElementById('contact-info-bio');

    const editBanner = document.getElementById('edit-banner');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    
    const chatImageUpload = document.getElementById('chat-image-upload');
    const btnAttachImage = document.getElementById('btn-attach-image');
    
    // Header Actions & Toast
    const chatHeaderActions = document.getElementById('chat-header-actions');
    const toast = document.getElementById('toast');
    const chatOptionsBtn = document.getElementById('chat-options-btn');
    const chatOptionsMenu = document.getElementById('chat-options-menu');
    const headerActionBtns = document.querySelectorAll('.header-action-btn');
    const appContainer = document.querySelector('.app-container');
    
    let editingMessageId = null;

    // Image Viewer Modal Logic
    const imageViewerModal = document.getElementById('image-viewer-modal');
    const imageViewerImg = document.getElementById('image-viewer-img');

    const openImageViewer = (src) => {
        if (!src || src === 'none' || src === '') return;
        // Clean URL if it's from a background-image property
        const cleanSrc = src.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
        imageViewerImg.src = cleanSrc;
        imageViewerModal.classList.add('active');
        imageViewerImg.style.transform = 'scale(1) translateY(0)';
    };

    const closeImageViewer = () => {
        imageViewerModal.classList.remove('active');
        setTimeout(() => { 
            imageViewerImg.src = ''; 
            imageViewerImg.style.transform = '';
            imageViewerModal.style.backgroundColor = '';
        }, 300);
    };

    if (imageViewerModal) {
        // Tap outside to close
        imageViewerModal.addEventListener('click', (e) => {
            if (e.target === imageViewerModal) closeImageViewer();
        });

        // Swipe up/down to close
        let touchStartY = 0;
        let touchCurrentY = 0;
        
        imageViewerModal.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchCurrentY = touchStartY;
            imageViewerImg.style.transition = 'none';
        }, { passive: true });

        imageViewerModal.addEventListener('touchmove', (e) => {
            touchCurrentY = e.touches[0].clientY;
            const deltaY = touchCurrentY - touchStartY;
            imageViewerImg.style.transform = `scale(1) translateY(${deltaY}px)`;
            
            // Adjust background opacity based on swipe distance
            const opacity = 1 - Math.min(Math.abs(deltaY) / (window.innerHeight / 2), 0.8);
            imageViewerModal.style.backgroundColor = `rgba(0, 0, 0, ${opacity * 0.9})`;
        }, { passive: true });

        imageViewerModal.addEventListener('touchend', () => {
            const deltaY = touchCurrentY - touchStartY;
            imageViewerImg.style.transition = 'transform 0.3s ease';
            
            // If swiped more than 100px up or down, close
            if (Math.abs(deltaY) > 100) {
                const direction = deltaY > 0 ? 1 : -1;
                imageViewerImg.style.transform = `scale(0.9) translateY(${direction * window.innerHeight}px)`;
                closeImageViewer();
            } else {
                // Snap back
                imageViewerImg.style.transform = 'scale(1) translateY(0)';
                imageViewerModal.style.backgroundColor = '';
            }
        });
    }

    // Global click listener for images and avatars
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('message-image')) {
            openImageViewer(e.target.src);
        } else if (e.target.classList.contains('avatar')) {
            // Some avatars might just have text '?', check if there is a background image
            const bgImage = window.getComputedStyle(e.target).backgroundImage;
            if (bgImage && bgImage !== 'none') {
                openImageViewer(bgImage);
            }
        }
    });

    window.ChatApp.renderContacts = () => {
        if (!contactsList) return;
        const currentUser = window.ChatApp.getCurrentUser();
        const otherUsers = window.ChatApp.getOtherUsers();
        const messages = window.ChatApp.getAllMessages();
        
        contactsList.innerHTML = '';
        
        if (otherUsers.length === 0) {
            contactsList.innerHTML = '<div style="padding: 1rem; color: var(--text-secondary); text-align: center;">No other users registered. Open a new tab and register a new user!</div>';
            return;
        }

        const enrichedUsers = otherUsers.map(user => {
            const chatHistory = messages.filter(m => 
                (m.senderId === currentUser.id && m.receiverId === user.id) ||
                (m.senderId === user.id && m.receiverId === currentUser.id)
            );
            const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
            const unreadCount = chatHistory.filter(m => m.senderId === user.id && m.receiverId === currentUser.id && !m.read).length;
            return { ...user, lastMessage, unreadCount };
        });
        
        // Sort: Latest message first
        enrichedUsers.sort((a, b) => {
            if (!a.lastMessage && !b.lastMessage) return 0;
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
        });

        enrichedUsers.forEach(user => {
            const lastMessage = user.lastMessage;
            const contactItem = document.createElement('div');
            const isActive = window.ChatApp.activeChatPartner && window.ChatApp.activeChatPartner.id === user.id;
            contactItem.className = `contact-item ${isActive ? 'active' : ''}`;
            
            const isOnline = user.lastActive && (new Date() - new Date(user.lastActive)) < 2 * 60000;
            const avatarHtml = window.ChatApp.getAvatarHtml(user, isOnline ? "online" : "");
            const unreadBadge = user.unreadCount > 0 ? `<span class="unread-badge">${user.unreadCount}</span>` : '';
            let previewHtml = 'No messages yet';
            if (lastMessage) {
                if (lastMessage.imageUrl) {
                    previewHtml = `<span style="display: flex; align-items: center; gap: 6px;">
                        <img src="${lastMessage.imageUrl}" style="width: 18px; height: 18px; object-fit: cover; border-radius: 4px;" alt="Image">
                        ${lastMessage.text ? `<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${lastMessage.text}</span>` : 'Photo'}
                    </span>`;
                } else {
                    previewHtml = lastMessage.text;
                }
            }

            const infoHtml = `
                <div class="contact-info">
                    <div class="contact-header">
                        <span class="contact-name">${user.name}</span>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            ${unreadBadge}
                            <span class="contact-time">${lastMessage ? window.ChatApp.formatTime(lastMessage.timestamp) : ''}</span>
                        </div>
                    </div>
                    <div class="contact-preview">${previewHtml}</div>
                </div>
            `;
            
            contactItem.innerHTML = avatarHtml + infoHtml;
            
            contactItem.addEventListener('click', () => {
                if (appContainer && !appContainer.classList.contains('mobile-chat-active')) {
                    history.pushState({ chatOpen: true }, '');
                }

                window.ChatApp.activeChatPartner = user;
                if (contactInfoSidebar && contactInfoSidebar.classList.contains('active')) {
                    populateContactInfo(user);
                }
                
                // Mark messages as read
                if (user.unreadCount > 0) {
                    window.ChatApp.markMessagesAsRead(user.id);
                }
                
                // Cancel edit mode if switching chats
                cancelEditMode();
                
                // Add class for mobile responsiveness
                if (appContainer) appContainer.classList.add('mobile-chat-active');
                
                window.ChatApp.renderContacts();
                window.ChatApp.renderMessages();
            });
            
            contactsList.appendChild(contactItem);
        });
    };

    window.ChatApp.renderMessages = () => {
        let activeChatPartner = window.ChatApp.activeChatPartner;
        if (!activeChatPartner || !chatMessages) return;
        
        const currentUser = window.ChatApp.getCurrentUser();
        const allUsers = window.ChatApp.getAllUsers();
        activeChatPartner = allUsers.find(u => u.id === activeChatPartner.id) || activeChatPartner;
        window.ChatApp.activeChatPartner = activeChatPartner;
        
        // Mark messages as read if the chat is open
        window.ChatApp.markMessagesAsRead(activeChatPartner.id);
        
        if (chatPartnerName) chatPartnerName.textContent = activeChatPartner.name;
        if (chatPartnerStatus) {
            let statusText = 'Offline';
            const isOnline = activeChatPartner.lastActive && (new Date() - new Date(activeChatPartner.lastActive)) < 2 * 60000;
            
            if (isOnline) {
                statusText = 'Active now';
                chatPartnerAvatar.classList.add('online');
            } else {
                chatPartnerAvatar.classList.remove('online');
                if (activeChatPartner.lastActive) {
                    const lastTime = new Date(activeChatPartner.lastActive);
                    const diffMins = Math.floor((new Date() - lastTime) / 60000);
                    if (diffMins < 60 && diffMins > 0) {
                        statusText = `last seen ${diffMins} minutes ago`;
                    } else {
                        const isToday = new Date().toDateString() === lastTime.toDateString();
                        statusText = `last seen ${isToday ? 'today at' : 'on'} ${window.ChatApp.formatTime(activeChatPartner.lastActive)}`;
                    }
                } else {
                    statusText = 'last seen a long time ago';
                }
            }
            chatPartnerStatus.textContent = statusText;
            chatPartnerStatus.style.textTransform = 'none'; // Ensure case looks like WhatsApp
        }
        window.ChatApp.updateAvatarElement(chatPartnerAvatar, activeChatPartner);
        if (closeChatBtn) closeChatBtn.style.display = 'flex';
        if (chatHeaderActions) chatHeaderActions.style.display = 'flex';

        const messages = window.ChatApp.getAllMessages();
        const chatHistory = messages.filter(m => 
            (m.senderId === currentUser.id && m.receiverId === activeChatPartner.id) ||
            (m.senderId === activeChatPartner.id && m.receiverId === currentUser.id)
        );
        
        chatMessages.innerHTML = '';
        
        if (chatHistory.length === 0) {
            chatMessages.innerHTML = `<div style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">No messages yet. Say hi to ${activeChatPartner.name}!</div>`;
            return;
        }

        chatHistory.forEach(msg => {
            const isSentByMe = msg.senderId === currentUser.id;
            const messageClass = isSentByMe ? 'sent' : 'received';
            const userForMsg = isSentByMe ? currentUser : activeChatPartner;
            
            const avatarHtml = !isSentByMe ? window.ChatApp.getAvatarHtml(userForMsg, "message-avatar") : '';
            
            let actionsHtml = '';
            if (isSentByMe) {
                actionsHtml = `
                    <div class="message-actions">
                        <button class="action-icon edit" data-id="${msg.id}" title="Edit">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="action-icon delete" data-id="${msg.id}" title="Delete">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                `;
            }
            
            const editedTag = msg.edited ? `<span style="font-size: 0.65rem; font-style: italic; opacity: 0.8; margin-left: 4px;">(edited)</span>` : '';
            
            const imageHtml = msg.imageUrl ? `<img src="${msg.imageUrl}" alt="Image" class="message-image">` : '';
            
            const readReceiptHtml = isSentByMe ? 
                (msg.read ? `<span style="color: #34b7f1; margin-left: 4px; font-weight: bold; letter-spacing: -2px;">✓✓</span>` : 
                            `<span style="color: var(--text-secondary); margin-left: 4px; font-weight: bold;">✓</span>`) 
                : '';
            
            const messageHtml = `
                <div class="message ${messageClass}">
                    ${avatarHtml}
                    <div class="message-content">
                        <div style="display: flex; align-items: center;">
                            ${isSentByMe ? actionsHtml : ''}
                            <div class="message-bubble">
                                ${imageHtml}
                                ${msg.text ? `<div>${msg.text}</div>` : ''}
                            </div>
                            ${!isSentByMe ? actionsHtml : ''}
                        </div>
                        <div class="message-time">${window.ChatApp.formatTime(msg.timestamp)}${editedTag}${readReceiptHtml}</div>
                    </div>
                </div>
            `;
            chatMessages.insertAdjacentHTML('beforeend', messageHtml);
        });
        
        chatMessages.scrollTop = chatMessages.scrollHeight;
        bindMessageActions();
    };
    
    const bindMessageActions = () => {
        document.querySelectorAll('.action-icon.edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const msgId = e.currentTarget.dataset.id;
                const msg = window.ChatApp.getAllMessages().find(m => m.id === msgId);
                if (msg) {
                    editingMessageId = msgId;
                    chatInput.value = msg.text;
                    chatInput.focus();
                    if (editBanner) editBanner.style.display = 'flex';
                }
            });
        });
        
        document.querySelectorAll('.action-icon.delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm("Delete this message?")) {
                    const msgId = e.currentTarget.dataset.id;
                    window.ChatApp.deleteMessage(msgId);
                    window.ChatApp.renderMessages();
                    window.ChatApp.renderContacts();
                }
            });
        });
    };
    
    const cancelEditMode = () => {
        editingMessageId = null;
        if (chatInput) chatInput.value = '';
        if (editBanner) editBanner.style.display = 'none';
    };

    // Chat Actions
    const handleSend = () => {
        if (!window.ChatApp.activeChatPartner || !chatInput || !chatInput.value.trim()) return;
        
        const text = chatInput.value.trim();
        
        if (editingMessageId) {
            window.ChatApp.editMessage(editingMessageId, text);
            cancelEditMode();
        } else {
            window.ChatApp.saveMessage(window.ChatApp.activeChatPartner.id, text);
            chatInput.value = '';
        }
        
        window.ChatApp.renderMessages();
        window.ChatApp.renderContacts(); 
    };

    if (btnSend) btnSend.addEventListener('click', handleSend);
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', cancelEditMode);
    }
    
    // Image Upload Logic
    if (btnAttachImage && chatImageUpload) {
        btnAttachImage.addEventListener('click', () => {
            chatImageUpload.click();
        });

        chatImageUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const originalHtml = btnAttachImage.innerHTML;
            btnAttachImage.innerHTML = `<svg class="spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
            btnAttachImage.disabled = true;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', cloudinaryConfig.uploadPreset);

            try {
                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.secure_url) {
                    await window.ChatApp.saveMessage(window.ChatApp.activeChatPartner.id, chatInput ? chatInput.value.trim() : '', data.secure_url);
                    if (chatInput) chatInput.value = '';
                    window.ChatApp.renderMessages();
                    window.ChatApp.renderContacts();
                } else {
                    window.showToast('Failed to upload image: ' + (data.error ? data.error.message : 'Unknown error'), 'error');
                }
            } catch (error) {
                console.error("Cloudinary upload error", error);
                window.showToast("Error uploading image", 'error');
            } finally {
                btnAttachImage.innerHTML = originalHtml;
                btnAttachImage.disabled = false;
                chatImageUpload.value = '';
            }
        });
    }
    
    // Close Chat button & Hardware Back Button Logic
    const closeChat = () => {
        if (!window.ChatApp.activeChatPartner) return;
        window.ChatApp.activeChatPartner = null;
        if (contactInfoSidebar) contactInfoSidebar.classList.remove('active');
        
        chatPartnerName.textContent = 'Select a contact';
        chatPartnerStatus.textContent = '';
        chatPartnerAvatar.style.backgroundImage = 'none';
        chatPartnerAvatar.textContent = '?';
        closeChatBtn.style.display = 'none';
        if (chatHeaderActions) chatHeaderActions.style.display = 'none';
        if (chatOptionsMenu) chatOptionsMenu.classList.remove('show');
        if (appContainer) appContainer.classList.remove('mobile-chat-active');
        
        chatMessages.innerHTML = `<div style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">Please select a contact from the sidebar to start chatting.</div>`;
        
        cancelEditMode();
        window.ChatApp.renderContacts();
    };

    window.addEventListener('popstate', (e) => {
        if (appContainer && appContainer.classList.contains('mobile-chat-active')) {
            closeChat();
        }
    });

    if (closeChatBtn) {
        closeChatBtn.addEventListener('click', () => {
            if (history.state && history.state.chatOpen) {
                history.back();
            } else {
                closeChat();
            }
        });
    }

    // Right Sidebar Info
    const populateContactInfo = (user) => {
        window.ChatApp.updateAvatarElement(contactInfoAvatar, user);
        contactInfoName.textContent = user.name;
        contactInfoUsername.textContent = user.username || '@username';
        contactInfoBio.textContent = user.bio || 'No bio available.';
    };

    if (chatPartnerInfoBtn) {
        chatPartnerInfoBtn.addEventListener('click', () => {
            if (window.ChatApp.activeChatPartner) {
                populateContactInfo(window.ChatApp.activeChatPartner);
                contactInfoSidebar.classList.add('active');
            }
        });
    }
    if (closeContactInfoBtn) {
        closeContactInfoBtn.addEventListener('click', () => {
            contactInfoSidebar.classList.remove('active');
        });
    }

    // Header Actions Toast & Dropdown
    window.showToast = (message, type = 'error') => {
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
        
        toast.className = "toast show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    };

    headerActionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            window.showToast('Coming Soon', 'default');
            if (chatOptionsMenu) chatOptionsMenu.classList.remove('show');
        });
    });

    if (chatOptionsBtn && chatOptionsMenu) {
        chatOptionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            chatOptionsMenu.classList.toggle('show');
        });
        
        // Hide dropdown when clicking outside
        document.addEventListener('click', () => {
            if (chatOptionsMenu.classList.contains('show')) {
                chatOptionsMenu.classList.remove('show');
            }
        });
        
        chatOptionsMenu.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent document click from immediately hiding before action
        });
    }
});
