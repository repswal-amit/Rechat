import { cloudinaryConfig } from './cloudinary-config.js';

document.addEventListener('DOMContentLoaded', () => {
    if (!window.ChatApp.getCurrentUser()) return;

    const contactsList = document.getElementById('contacts-list');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.querySelector('.chat-input');
    const searchInput = document.querySelector('.search-input');
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
    let replyingMessageId = null;
    let selectedChats = new Set();
    let chatListLongPressTimer = null;

    const actionReply = document.getElementById('action-reply');
    const replyBanner = document.getElementById('reply-banner');
    const replyBannerName = document.getElementById('reply-banner-name');
    const replyBannerText = document.getElementById('reply-banner-text');
    const cancelReplyBtn = document.getElementById('cancel-reply-btn');
    
    const chatListSelectionHeader = document.getElementById('chat-list-selection-header');
    const chatListSelectionCount = document.getElementById('chat-list-selection-count');
    const closeChatListSelectionBtn = document.getElementById('close-chat-list-selection-btn');
    const actionDeleteChatList = document.getElementById('action-delete-chat-list');
    
    const actionClearChat = document.getElementById('action-clear-chat');
    const actionBlock = document.getElementById('action-block');
    
    const muteNotificationsToggle = document.getElementById('mute-notifications-toggle');
    const disappearingMessagesSelect = document.getElementById('disappearing-messages-select');
    let selectedMessages = new Set();
    let reactionTargetId = null;
    let longPressTimer = null;

    const selectionHeader = document.getElementById('selection-header');
    const selectionCount = document.getElementById('selection-count');
    const closeSelectionBtn = document.getElementById('close-selection-btn');
    const actionEdit = document.getElementById('action-edit');
    const actionCopy = document.getElementById('action-copy');
    const actionForward = document.getElementById('action-forward');
    const actionDelete = document.getElementById('action-delete');

    const reactionPicker = document.getElementById('reaction-picker');
    
    const forwardModal = document.getElementById('forward-modal');
    const closeForwardModal = document.getElementById('close-forward-modal');
    const forwardSearchInput = document.getElementById('forward-search-input');
    const forwardContactsList = document.getElementById('forward-contacts-list');

    const deleteModal = document.getElementById('delete-modal');
    const btnDeleteEveryone = document.getElementById('btn-delete-everyone');
    const btnDeleteMe = document.getElementById('btn-delete-me');
    const btnDeleteCancel = document.getElementById('btn-delete-cancel');

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
    
    let searchQuery = '';
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            window.ChatApp.renderContacts();
        });
    }

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

        let filteredUsers = otherUsers;
        if (searchQuery) {
            filteredUsers = otherUsers.filter(user => 
                (user.name && user.name.toLowerCase().includes(searchQuery)) || 
                (user.username && user.username.toLowerCase().includes(searchQuery))
            );
        }

        const enrichedUsers = filteredUsers.map(user => {
            const chatHistory = messages.filter(m => 
                ((m.senderId === currentUser.id && m.receiverId === user.id) ||
                (m.senderId === user.id && m.receiverId === currentUser.id)) &&
                (!m.deletedFor || !m.deletedFor.includes(currentUser.id))
            );
            const lastMessage = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
            const unreadCount = chatHistory.filter(m => m.senderId === user.id && m.receiverId === currentUser.id && !m.read).length;
            return { ...user, lastMessage, unreadCount };
        });

        // Filter out empty chats from the main list unless the user is searching
        let usersToDisplay = enrichedUsers;
        if (!searchQuery) {
            usersToDisplay = enrichedUsers.filter(user => user.lastMessage !== null);
        }

        if (usersToDisplay.length === 0) {
            if (searchQuery) {
                contactsList.innerHTML = '<div style="padding: 1rem; color: var(--text-secondary); text-align: center;">No contacts found matching your search.</div>';
            } else {
                contactsList.innerHTML = '<div style="padding: 1rem; color: var(--text-secondary); text-align: center;">No active chats. Search for a user to start chatting!</div>';
            }
            return;
        }

        // Sort: Latest message first
        usersToDisplay.sort((a, b) => {
            if (!a.lastMessage && !b.lastMessage) return 0;
            if (!a.lastMessage) return 1;
            if (!b.lastMessage) return -1;
            return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
        });

        usersToDisplay.forEach(user => {
            const lastMessage = user.lastMessage;
            const contactItem = document.createElement('div');
            const isActive = window.ChatApp.activeChatPartner && window.ChatApp.activeChatPartner.id === user.id;
            const isSelected = selectedChats.has(user.id) ? 'selected' : '';
            contactItem.className = `contact-item ${isActive ? 'active' : ''} ${isSelected}`;
            
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
            
            // Long Press
            contactItem.addEventListener('touchstart', (e) => {
                chatListLongPressTimer = setTimeout(() => {
                    toggleChatSelection(user.id);
                }, 500);
            }, {passive: true});
            contactItem.addEventListener('touchend', () => { clearTimeout(chatListLongPressTimer); });
            contactItem.addEventListener('touchmove', () => { clearTimeout(chatListLongPressTimer); });

            // Right click
            contactItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleChatSelection(user.id);
            });
            
            contactItem.addEventListener('click', (e) => {
                if (selectedChats.size > 0) {
                    toggleChatSelection(user.id);
                    e.stopPropagation();
                    return;
                }

                if (appContainer && !appContainer.classList.contains('mobile-chat-active')) {
                    history.pushState({ chatOpen: true }, '');
                }

                window.ChatApp.activeChatPartner = user;
                if (typeof populateContactInfo !== 'undefined' && contactInfoSidebar && contactInfoSidebar.classList.contains('active')) {
                    populateContactInfo(user);
                }
                
                // Mark messages as read
                if (user.unreadCount > 0) {
                    window.ChatApp.markMessagesAsRead(user.id);
                }
                
                // Cancel edit mode if switching chats
                if (typeof cancelEditMode === 'function') {
                    cancelEditMode();
                }
                
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
            ((m.senderId === currentUser.id && m.receiverId === activeChatPartner.id) ||
            (m.senderId === activeChatPartner.id && m.receiverId === currentUser.id)) &&
            (!m.deletedFor || !m.deletedFor.includes(currentUser.id))
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
            
            const editedTag = msg.edited ? `<span style="font-size: 0.65rem; font-style: italic; opacity: 0.8; margin-left: 4px;">(edited)</span>` : '';
            
            let replyPreviewHtml = '';
            if (msg.replyTo) {
                const originalMsg = messages.find(m => m.id === msg.replyTo);
                if (originalMsg) {
                    const originalSender = originalMsg.senderId === currentUser.id ? currentUser : activeChatPartner;
                    replyPreviewHtml = `
                        <div style="background: rgba(0,0,0,0.05); padding: 4px 8px; border-left: 4px solid var(--accent); border-radius: 4px; margin-bottom: 4px; font-size: 0.8rem; cursor: pointer;">
                            <div style="font-weight: 600; color: var(--accent); margin-bottom: 2px;">${originalSender.name}</div>
                            <div style="color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${originalMsg.text || 'Photo'}</div>
                        </div>
                    `;
                }
            }
            
            let messageBodyHtml = '';
            if (msg.deletedForEveryone) {
                messageBodyHtml = `<div class="deleted-message">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                    This message was deleted
                </div>`;
            } else {
                const imageHtml = msg.imageUrl ? `<img src="${msg.imageUrl}" alt="Image" class="message-image">` : '';
                messageBodyHtml = `
                    ${replyPreviewHtml}
                    ${imageHtml}
                    ${msg.text ? `<div>${msg.text}</div>` : ''}
                `;
            }

            let reactionBadgesHtml = '';
            if (msg.reactions && Object.keys(msg.reactions).length > 0) {
                reactionBadgesHtml = `<div class="reaction-badges">`;
                const counts = {};
                Object.values(msg.reactions).forEach(emoji => {
                    counts[emoji] = (counts[emoji] || 0) + 1;
                });
                for (const emoji in counts) {
                    reactionBadgesHtml += `<span>${emoji} ${counts[emoji] > 1 ? counts[emoji] : ''}</span>`;
                }
                reactionBadgesHtml += `</div>`;
            }
            
            const readReceiptHtml = isSentByMe ? 
                (msg.read ? `<span style="color: #34b7f1; margin-left: 4px; font-weight: bold; letter-spacing: -2px;">✓✓</span>` : 
                            `<span style="color: var(--text-secondary); margin-left: 4px; font-weight: bold;">✓</span>`) 
                : '';
            
            const isSelected = selectedMessages.has(msg.id) ? 'selected' : '';

            const messageHtml = `
                <div class="message ${messageClass} ${isSelected}" data-id="${msg.id}">
                    ${avatarHtml}
                    <div class="message-content">
                        <div style="display: flex; align-items: center;">
                            <div class="message-bubble">
                                ${messageBodyHtml}
                                ${reactionBadgesHtml}
                            </div>
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
    
    const toggleChatSelection = (partnerId) => {
        if (selectedChats.has(partnerId)) {
            selectedChats.delete(partnerId);
        } else {
            selectedChats.add(partnerId);
        }
        updateChatListSelectionUI();
        window.ChatApp.renderContacts();
    };

    const updateChatListSelectionUI = () => {
        if (selectedChats.size > 0) {
            if(chatListSelectionHeader) chatListSelectionHeader.style.display = 'flex';
            if(chatListSelectionCount) chatListSelectionCount.textContent = selectedChats.size;
        } else {
            if(chatListSelectionHeader) chatListSelectionHeader.style.display = 'none';
        }
    };
    
    const toggleMessageSelection = (msgId) => {
        if (selectedMessages.has(msgId)) {
            selectedMessages.delete(msgId);
        } else {
            selectedMessages.add(msgId);
        }
        window.ChatApp.renderMessages();
    };

    const showReactionPicker = (e, msgId) => {
        reactionTargetId = msgId;
        if (reactionPicker) {
            reactionPicker.style.display = 'flex';
            const x = Math.min(e.clientX, window.innerWidth - reactionPicker.offsetWidth - 10);
            const y = Math.max(e.clientY - reactionPicker.offsetHeight - 10, 10);
            reactionPicker.style.left = `${x}px`;
            reactionPicker.style.top = `${y}px`;
        }
    };

    const bindMessageActions = () => {
        updateSelectionUI();
        document.querySelectorAll('.message').forEach(msgEl => {
            const msgId = msgEl.dataset.id;
            
            // Long Press
            msgEl.addEventListener('touchstart', (e) => {
                longPressTimer = setTimeout(() => {
                    toggleMessageSelection(msgId);
                }, 500);
            }, {passive: true});
            msgEl.addEventListener('touchend', () => { clearTimeout(longPressTimer); });
            msgEl.addEventListener('touchmove', () => { clearTimeout(longPressTimer); });

            // Right click
            msgEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleMessageSelection(msgId);
            });

            // Click
            msgEl.addEventListener('click', (e) => {
                if (selectedMessages.size > 0) {
                    toggleMessageSelection(msgId);
                    e.stopPropagation();
                } else if (!msgEl.classList.contains('sent')) {
                    const bubble = msgEl.querySelector('.message-bubble');
                    if (bubble && (e.target === bubble || bubble.contains(e.target))) {
                        showReactionPicker(e, msgId);
                        e.stopPropagation();
                    }
                }
            });
        });
    };

    const updateSelectionUI = () => {
        if (selectedMessages.size > 0) {
            if(selectionHeader) selectionHeader.style.display = 'flex';
            if(selectionCount) selectionCount.textContent = selectedMessages.size;
            
            if (selectedMessages.size === 1) {
                const msgId = Array.from(selectedMessages)[0];
                const msg = window.ChatApp.getAllMessages().find(m => m.id === msgId);
                if (msg && msg.senderId === window.ChatApp.getCurrentUser().id && !msg.imageUrl && !msg.deletedForEveryone) {
                    if(actionEdit) actionEdit.style.display = 'flex';
                } else {
                    if(actionEdit) actionEdit.style.display = 'none';
                }
                if(actionReply) actionReply.style.display = 'flex';
            } else {
                if(actionEdit) actionEdit.style.display = 'none';
                if(actionReply) actionReply.style.display = 'none';
            }
        } else {
            if(selectionHeader) selectionHeader.style.display = 'none';
        }
    };

    // Bind Advanced Actions outside
    document.addEventListener('click', () => {
        if (reactionPicker) reactionPicker.style.display = 'none';
    });

    if (closeSelectionBtn) {
        closeSelectionBtn.addEventListener('click', () => {
            selectedMessages.clear();
            window.ChatApp.renderMessages();
        });
    }

    if (actionCopy) {
        actionCopy.addEventListener('click', () => {
            const msgs = window.ChatApp.getAllMessages().filter(m => selectedMessages.has(m.id));
            msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            const textToCopy = msgs.map(m => m.text).filter(bool => bool).join('\n');
            navigator.clipboard.writeText(textToCopy).then(() => {
                window.showToast('Copied to clipboard', 'success');
                selectedMessages.clear();
                window.ChatApp.renderMessages();
            });
        });
    }

    if (actionEdit) {
        actionEdit.addEventListener('click', () => {
            if (selectedMessages.size === 1) {
                const msgId = Array.from(selectedMessages)[0];
                const msg = window.ChatApp.getAllMessages().find(m => m.id === msgId);
                if (msg) {
                    editingMessageId = msgId;
                    const chatInput = document.querySelector('.chat-input');
                    const editBanner = document.getElementById('edit-banner');
                    if (chatInput) {
                        chatInput.value = msg.text;
                        chatInput.focus();
                    }
                    if (editBanner) editBanner.style.display = 'flex';
                }
                selectedMessages.clear();
                window.ChatApp.renderMessages();
            }
        });
    }

    if (actionDelete) {
        actionDelete.addEventListener('click', () => {
            const msgs = window.ChatApp.getAllMessages().filter(m => selectedMessages.has(m.id));
            const anySentByOther = msgs.some(m => m.senderId !== window.ChatApp.getCurrentUser().id);
            if (anySentByOther) {
                if(btnDeleteEveryone) btnDeleteEveryone.style.display = 'none';
            } else {
                if(btnDeleteEveryone) btnDeleteEveryone.style.display = 'block';
            }
            if(deleteModal) deleteModal.classList.add('active');
        });
    }

    if (btnDeleteCancel) {
        btnDeleteCancel.addEventListener('click', () => {
            if(deleteModal) deleteModal.classList.remove('active');
        });
    }
    
    if (btnDeleteMe) {
        btnDeleteMe.addEventListener('click', () => {
            window.ChatApp.deleteMessagesForMe(Array.from(selectedMessages));
            if(deleteModal) deleteModal.classList.remove('active');
            selectedMessages.clear();
            updateSelectionUI();
            window.ChatApp.renderMessages();
        });
    }

    if (btnDeleteEveryone) {
        btnDeleteEveryone.addEventListener('click', () => {
            window.ChatApp.deleteMessagesForEveryone(Array.from(selectedMessages));
            if(deleteModal) deleteModal.classList.remove('active');
            selectedMessages.clear();
            updateSelectionUI();
            window.ChatApp.renderMessages();
        });
    }

    const renderForwardContacts = () => {
        if (!forwardContactsList) return;
        const otherUsers = window.ChatApp.getOtherUsers();
        let query = forwardSearchInput ? forwardSearchInput.value.toLowerCase().trim() : '';
        
        const filtered = otherUsers.filter(user => 
            (user.name && user.name.toLowerCase().includes(query)) || 
            (user.username && user.username.toLowerCase().includes(query))
        );

        forwardContactsList.innerHTML = '';
        filtered.forEach(user => {
            const item = document.createElement('div');
            item.className = 'contact-item';
            item.innerHTML = window.ChatApp.getAvatarHtml(user, "") + `<div class="contact-info"><div class="contact-name">${user.name}</div></div>`;
            item.addEventListener('click', () => {
                if (confirm(`Forward to ${user.name}?`)) {
                    window.ChatApp.forwardMessages(Array.from(selectedMessages), user.id);
                    if(forwardModal) forwardModal.classList.remove('active');
                    selectedMessages.clear();
                    updateSelectionUI();
                    window.ChatApp.renderMessages();
                    window.showToast('Messages forwarded', 'success');
                }
            });
            forwardContactsList.appendChild(item);
        });
    };

    if (actionForward) {
        actionForward.addEventListener('click', () => {
            if(forwardModal) forwardModal.classList.add('active');
            renderForwardContacts();
        });
    }

    if (closeForwardModal) {
        closeForwardModal.addEventListener('click', () => {
            if(forwardModal) forwardModal.classList.remove('active');
        });
    }

    if (forwardSearchInput) {
        forwardSearchInput.addEventListener('input', renderForwardContacts);
    }

    document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (reactionTargetId) {
                window.ChatApp.addReaction(reactionTargetId, btn.dataset.emoji);
                if(reactionPicker) reactionPicker.style.display = 'none';
                reactionTargetId = null;
            }
        });
    });

    const cancelEditMode = () => {
        editingMessageId = null;
        if (chatInput) chatInput.value = '';
        if (editBanner) editBanner.style.display = 'none';
    };

    const cancelReplyMode = () => {
        replyingMessageId = null;
        if (replyBanner) replyBanner.style.display = 'none';
    };

    const checkBlockStatus = () => {
        if (!window.ChatApp.activeChatPartner) return false;
        const currentUser = window.ChatApp.getCurrentUser();
        const partnerId = window.ChatApp.activeChatPartner.id;
        
        if (currentUser && currentUser.blockedUsers && currentUser.blockedUsers.includes(partnerId)) {
            window.showToast("You blocked this contact. Unblock to send messages.", "error");
            return true; // blocked
        }
        
        const latestPartner = window.ChatApp.getOtherUsers().find(u => u.id === partnerId);
        if (latestPartner && latestPartner.blockedUsers && latestPartner.blockedUsers.includes(currentUser.id)) {
            window.showToast("Message failed to send.", "error");
            return true; // blocked
        }
        
        return false;
    };

    // Chat Actions
    const handleSend = () => {
        if (!window.ChatApp.activeChatPartner || !chatInput || !chatInput.value.trim()) return;
        if (checkBlockStatus()) return;
        
        const text = chatInput.value.trim();
        
        if (editingMessageId) {
            window.ChatApp.editMessage(editingMessageId, text);
            cancelEditMode();
        } else {
            window.ChatApp.saveMessage(window.ChatApp.activeChatPartner.id, text, null, replyingMessageId);
            chatInput.value = '';
            cancelReplyMode();
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



    if (cancelReplyBtn) {
        cancelReplyBtn.addEventListener('click', cancelReplyMode);
    }

    if (actionReply) {
        actionReply.addEventListener('click', () => {
            if (selectedMessages.size === 1) {
                const msgId = Array.from(selectedMessages)[0];
                const msg = window.ChatApp.getAllMessages().find(m => m.id === msgId);
                if (msg) {
                    replyingMessageId = msgId;
                    if (replyBanner) {
                        const sender = msg.senderId === window.ChatApp.getCurrentUser().id ? window.ChatApp.getCurrentUser() : window.ChatApp.getOtherUsers().find(u => u.id === msg.senderId);
                        if (replyBannerName) replyBannerName.textContent = sender ? sender.name : 'Unknown';
                        if (replyBannerText) replyBannerText.textContent = msg.text || 'Photo';
                        replyBanner.style.display = 'block';
                    }
                    if (chatInput) chatInput.focus();
                }
                selectedMessages.clear();
                window.ChatApp.renderMessages();
            }
        });
    }

    if (actionClearChat) {
        actionClearChat.addEventListener('click', () => {
            if (window.ChatApp.activeChatPartner && confirm('Clear this entire chat history?')) {
                window.ChatApp.deleteEntireChat(window.ChatApp.activeChatPartner.id);
                chatOptionsMenu.classList.remove('show');
                window.ChatApp.renderMessages();
            }
        });
    }

    if (actionBlock) {
        actionBlock.addEventListener('click', () => {
            if (window.ChatApp.activeChatPartner) {
                const partnerId = window.ChatApp.activeChatPartner.id;
                const currentUser = window.ChatApp.getCurrentUser();
                const isBlocked = currentUser && currentUser.blockedUsers && currentUser.blockedUsers.includes(partnerId);
                
                if (isBlocked) {
                    if (confirm(`Unblock ${window.ChatApp.activeChatPartner.name}?`)) {
                        window.ChatApp.unblockUser(partnerId);
                        window.showToast(`${window.ChatApp.activeChatPartner.name} unblocked`, 'success');
                    }
                } else {
                    if (confirm(`Block ${window.ChatApp.activeChatPartner.name}? They won't be able to message you.`)) {
                        window.ChatApp.blockUser(partnerId);
                        window.showToast(`${window.ChatApp.activeChatPartner.name} blocked`, 'success');
                    }
                }
                chatOptionsMenu.classList.remove('show');
            }
        });
    }

    if (closeChatListSelectionBtn) {
        closeChatListSelectionBtn.addEventListener('click', () => {
            selectedChats.clear();
            updateChatListSelectionUI();
            window.ChatApp.renderContacts();
        });
    }

    if (actionDeleteChatList) {
        actionDeleteChatList.addEventListener('click', () => {
            if (selectedChats.size > 0 && confirm('Delete selected chats?')) {
                window.ChatApp.deleteMultipleChats(Array.from(selectedChats));
                selectedChats.clear();
                updateChatListSelectionUI();
                window.ChatApp.renderContacts();
            }
        });
    }

    
    // Image Upload Logic
    if (btnAttachImage && chatImageUpload) {
        btnAttachImage.addEventListener('click', () => {
            chatImageUpload.click();
        });

        chatImageUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (checkBlockStatus()) {
                chatImageUpload.value = '';
                return;
            }

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
            if (window.ChatApp.activeChatPartner && actionBlock) {
                const currentUser = window.ChatApp.getCurrentUser();
                const isBlocked = currentUser && currentUser.blockedUsers && currentUser.blockedUsers.includes(window.ChatApp.activeChatPartner.id);
                actionBlock.textContent = isBlocked ? 'Unblock' : 'Block';
            }
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
