// Initialize Socket.IO connection
let socket;
let serverAddresses = { ipv4: [], ipv6: [] };
let currentServerUrl = window.location.origin;
let username = '';
let currentIPType = 'ipv4';

// DOM Elements
const loginModal = document.getElementById('loginModal');
const connectModal = document.getElementById('connectModal');
const qrModal = document.getElementById('qrModal');
const showQRButton = document.getElementById('showQRButton');
const connectButton = document.getElementById('connectButton');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginButton = document.getElementById('loginButton');
const loginError = document.getElementById('loginError');
const serverAddressInput = document.getElementById('serverAddressInput');
const connectServerButton = document.getElementById('connectServerButton');
const qrCodeDiv = document.getElementById('qrCode');
const serverAddressSpan = document.getElementById('serverAddress');
const copyButton = document.getElementById('copyButton');
const msgContainer = document.getElementById('msgcontainer');
const input = document.getElementById('inputtextbox');
const sendBtn = document.getElementById('sendbtn');
const typingIndicator = document.getElementById('typingIndicator');
const ipv4Button = document.getElementById('ipv4Button');
const ipv6Button = document.getElementById('ipv6Button');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.querySelector('.sidebar');
const fileInput = document.getElementById('fileInput');
const fileButton = document.getElementById('fileButton');

// Show/Hide Modals
function showModal(modal) {
    modal.style.display = 'block';
    // Auto-focus the input field
    if (modal === connectModal) {
        setTimeout(() => serverAddressInput.focus(), 100);
    } else if (modal === loginModal) {
        setTimeout(() => usernameInput.focus(), 100);
    }
}

function hideModal(modal) {
    modal.style.display = 'none';
}

function toggleModal(modal) {
    if (modal.style.display === 'block') {
        hideModal(modal);
    } else {
        showModal(modal);
    }
}

// Close modals when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === loginModal) hideModal(loginModal);
    if (event.target === connectModal) hideModal(connectModal);
    if (event.target === qrModal) hideModal(qrModal);
});

// Close modals when clicking close button
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        hideModal(qrModal);
        hideModal(connectModal);
    });
});

// Event Listeners
showQRButton.addEventListener('click', () => {
    if (qrModal.style.display === 'block') {
        hideModal(qrModal);
    } else if (serverAddresses.ipv4.length || serverAddresses.ipv6.length) {
        showQRCode();
        showModal(qrModal);
    }
});

connectButton.addEventListener('click', () => {
    toggleModal(connectModal);
});

// Function to extract IP address from URL
function extractIPFromURL(url) {
    // Remove protocol if present
    url = url.replace(/^(https?|ws):\/\//, '');
    
    // Remove port if present
    url = url.replace(/:\d+$/, '');
    
    // Remove trailing slash if present
    url = url.replace(/\/$/, '');
    
    return url;
}

// Event Listeners
ipv4Button.addEventListener('click', () => {
    showQRCode('ipv4');
});

ipv6Button.addEventListener('click', () => {
    showQRCode('ipv6');
});

connectServerButton.addEventListener('click', () => {
    const address = serverAddressInput.value.trim();
    if (address) {
        const ip = extractIPFromURL(address);
        currentServerUrl = `ws://${ip}:8080`;
        hideModal(connectModal);
        connectToServer();
    }
});

// Add enter key handling for server address input
serverAddressInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const address = serverAddressInput.value.trim();
        if (address) {
            const ip = extractIPFromURL(address);
            currentServerUrl = `ws://${ip}:8080`;
            hideModal(connectModal);
            connectToServer();
        }
    }
});

// Add error message display
function showErrorMessage(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
    
    // Hide error message after 3 seconds
    setTimeout(() => {
        loginError.style.display = 'none';
    }, 3000);
}

loginButton.addEventListener('click', () => {
    handleLogin();
});

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        passwordInput.focus();
    }
});

passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

function handleLogin() {
    const name = usernameInput.value.trim();
    const password = passwordInput.value;
    username = name ;
    if (!name || !password) {
        showErrorMessage('Username and password are required');
        if (!name) usernameInput.focus();
        else passwordInput.focus();
        return;
    }
    
    socket.emit('register', { username: name, password: password }, (response) => {
        if (response.success) {
            username = name;
            hideModal(loginModal);
            // Focus chat input after successful login
            setTimeout(() => input.focus(), 100);
        } else {
            showErrorMessage(response.message);
            if (response.message.includes('password')) {
                passwordInput.value = '';
                passwordInput.focus();
            } else {
                usernameInput.focus();
            }
        }
    });
}

// Socket.IO Functions
function connectToServer() {
    socket = io(currentServerUrl);
    
    socket.on('connect', () => {
        showModal(loginModal);
        usernameInput.value = '';
        passwordInput.value = '';
    });
    
    socket.on('serverInfo', (addresses) => {
        serverAddresses = addresses;
    });
    
    socket.on('message_history', (messages) => {
        // Clear existing messages
        msgContainer.innerHTML = '';
        
        // Display message history
        messages.forEach(msg => {
            // Compare sender with current username to determine message alignment
            const isSentByCurrentUser = msg.sender === username;
            
            switch(msg.type) {
                case 'text':
                    receiveChatMessage({
                        sender: msg.sender,
                        message: msg.message,
                        timestamp: msg.timestamp,
                        isSentByCurrentUser: isSentByCurrentUser
                    });
                    break;
                case 'file':
                    receiveChatMessage({
                        sender: msg.sender,
                        message: createFileMessage(msg),
                        timestamp: msg.timestamp,
                        isSentByCurrentUser: isSentByCurrentUser
                    });
                    break;
                case 'video':
                    const messageContainer = document.createElement('div');
                    messageContainer.className = isSentByCurrentUser ? 'message sent' : 'message received';
                    
                    if (!isSentByCurrentUser) {
                        const senderElement = document.createElement('div');
                        senderElement.className = 'message-sender';
                        senderElement.textContent = msg.sender;
                        messageContainer.appendChild(senderElement);
                    }
                    
                    const videoCard = createVideoCard(msg.videoPath, msg.videoName, msg.fileSize);
                    messageContainer.appendChild(videoCard);
                    msgContainer.appendChild(messageContainer);
                    break;
            }
        });
        
        // Scroll to bottom after loading history
        msgContainer.scrollTop = msgContainer.scrollHeight;
    });
    
    socket.on('chat', (data) => {
        console.log(`${data.sender}: ${data.message}`);
        receiveChatMessage(data);
    });
    
    socket.on('info', (message) => {
        console.log(message);
        showInfoMessage(message);
    });
    
    socket.on('typing', (username) => {
        handleTypingIndicator(username);
    });
    
    socket.on('userList', (users) => {
        updateUserList(users);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        showInfoMessage('Connection lost. Please reconnect.');
    });

    socket.on('newFile', (fileInfo) => {
        // Only process if it's from another user
        if (fileInfo.sender !== username) {
            receiveChatMessage({
                sender: fileInfo.sender,
                message: createFileMessage(fileInfo),
                timestamp: Date.now()
            });
        }
    });

    // Update video message handling
    socket.on('video', (data) => {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message received';
        messageContainer.style.display = 'flex';
        messageContainer.style.flexDirection = 'column';
        
        const senderElement = document.createElement('div');
        senderElement.className = 'message-sender';
        senderElement.textContent = data.sender;
        
        const videoCard = createVideoCard(data.videoPath, data.videoName, data.fileSize);
        videoCard.style.width = '100%';
        
        messageContainer.appendChild(senderElement);
        messageContainer.appendChild(videoCard);
        document.querySelector('.message-container').appendChild(messageContainer);
        scrollToBottom();
    });

    socket.on('video-sent', (data) => {
        const messageContainer = document.createElement('div');
        messageContainer.className = 'message sent';
        messageContainer.style.display = 'flex';
        messageContainer.style.flexDirection = 'column';
        
        const videoCard = createVideoCard(data.videoPath, data.videoName, data.fileSize);
        videoCard.style.width = '100%';
        
        messageContainer.appendChild(videoCard);
        document.querySelector('.message-container').appendChild(messageContainer);
        scrollToBottom();
    });
}

function registerUser() {
    if (socket && socket.connected) {
        socket.emit('register', username);
        // Focus chat input after successful login
        setTimeout(() => input.focus(), 100);
    }
}

function formatIPv6Address(ip) {
    return `[${ip}]`;
}

function getFullServerURL(ip, type) {
    if (type === 'ipv6') {
        return `http://${formatIPv6Address(ip)}:8080`;
    }
    return `http://${ip}:8080`;
}

function showQRCode(ipType = 'ipv4') {
    currentIPType = ipType;
    const ip = ipType === 'ipv4' ? serverAddresses.ipv4[0] : serverAddresses.ipv6[0];
    if (!ip) return;
    
    const serverUrl = getFullServerURL(ip, ipType);
    
    // Generate QR code
    const qr = qrcode(0, 'L');
    qr.addData(serverUrl);
    qr.make();
    
    // Clear previous QR code
    qrCodeDiv.innerHTML = '';
    
    // Create and append QR code image
    const qrImage = qr.createImgTag(4);
    qrCodeDiv.innerHTML = qrImage;
    
    // Update button styles
    ipv4Button.classList.toggle('active', ipType === 'ipv4');
    ipv6Button.classList.toggle('active', ipType === 'ipv6');
    
    // Display server addresses
    serverAddressSpan.innerHTML = `
        <div class="address-row">
            <span>IPv4: ${getFullServerURL(serverAddresses.ipv4[0], 'ipv4')}</span>
        </div>
        <div class="address-row">
            <span>IPv6: ${getFullServerURL(serverAddresses.ipv6[0], 'ipv6')}</span>
        </div>
    `;
    
    showModal(qrModal);
}

// File handling functions
function handleFileUpload(file) {
    const formData = new FormData();
    formData.append('file', file);

    fetch(currentServerUrl + '/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(fileInfo => {
        // Only emit the event, let the socket handler display the message
        socket.emit('chat', { message: createFileMessage({...fileInfo, sender: username}) });
    })
    .catch(error => {
        console.error('Error uploading file:', error);
        showInfoMessage('Failed to upload file. Please try again.');
    });
}

function createFileMessage(fileInfo) {
    const isImage = fileInfo.type.startsWith('image/');
    const isVideo = fileInfo.type.startsWith('video/');
    const isPDF = fileInfo.type === 'application/pdf';
    const fileSize = formatFileSize(fileInfo.size);
    
    if (isImage) {
        return `<img src="${fileInfo.url}" alt="${fileInfo.name}" style="max-width: 200px; max-height: 200px;"><br><a href="${fileInfo.url}" download="${fileInfo.name}">${fileInfo.name}</a> (${fileSize})`;
    } else if (isVideo) {
        const shortFileName = fileInfo.name.length > 30 ? fileInfo.name.substring(0, 27) + '...' : fileInfo.name;
        return `
            <div class="video-card">
                <video controls>
                    <source src="${fileInfo.url}" type="${fileInfo.type}">
                </video>
                <div class="video-info">
                    <div class="video-title">${shortFileName}</div>
                    <br>
                    <a href="${fileInfo.url}" download="${fileInfo.name}" class="video-link">Download (${fileSize})</a>
                </div>
            </div>`;
    } else if (isPDF) {
        return `<div class="file-card">
            <a href="${fileInfo.url}" target="_blank" class="file-link">📄 ${fileInfo.name} (${fileSize})</a>
        </div>`;
    } else {
        return `<div class="file-card">
            <a href="${fileInfo.url}" download="${fileInfo.name}" class="file-link">📎 ${fileInfo.name} (${fileSize})</a>
        </div>`;
    }
}

function createVideoCard(videoPath, videoName, fileSize) {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    
    const video = document.createElement('video');
    video.controls = true;
    video.style.width = '100%';
    video.style.maxHeight = '300px';
    video.style.objectFit = 'contain';
    
    const source = document.createElement('source');
    source.src = videoPath;
    source.type = 'video/webm';
    video.appendChild(source);
    
    const info = document.createElement('div');
    info.className = 'video-info';
    info.style.padding = '8px 10px';
    info.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    info.style.borderTop = '1px solid rgba(0, 0, 0, 0.1)';
    info.style.position = 'relative';
    info.style.zIndex = '1';
    
    const title = document.createElement('div');
    title.className = 'video-title';
    title.textContent = videoName;
    title.style.marginBottom = '6px';
    title.style.color = '#333';
    title.style.wordBreak = 'break-word';
    
    const fileLink = document.createElement('a');
    fileLink.href = videoPath;
    fileLink.setAttribute('download', videoName);
    fileLink.className = 'video-link';
    fileLink.textContent = `Download video (${fileSize})`;
    fileLink.style.color = '#007bff';
    fileLink.style.textDecoration = 'none';
    fileLink.style.display = 'inline-block';
    
    // Add click handler to force download
    fileLink.addEventListener('click', (e) => {
        e.preventDefault();
        const downloadLink = document.createElement('a');
        downloadLink.href = videoPath;
        downloadLink.download = videoName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    });
    
    info.appendChild(title);
    info.appendChild(fileLink);
    
    card.appendChild(video);
    card.appendChild(info);
    
    return card;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
}

// Message handling functions
function sendMessage(message) {
    if (message.trim() && socket && socket.connected) {
        // Send message to server
        socket.emit('chat', { message });
        input.value = '';
    }
}

function receiveChatMessage(data) {
    const isSentByCurrentUser = data.sender === username;
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isSentByCurrentUser ? 'sent' : 'received'}`;
    
    // Only add sender name for received messages
    const messageHTML = `
        ${!isSentByCurrentUser ? `<div class="message-sender">${data.sender}</div>` : ''}
        <div class="message-content">${data.message}</div>
        <div class="message-time">${new Date(data.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
    `;
    messageDiv.innerHTML = messageHTML;
    msgContainer.appendChild(messageDiv);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

function showInfoMessage(message) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'message info';
    infoDiv.textContent = message;
    msgContainer.appendChild(infoDiv);
    msgContainer.scrollTop = msgContainer.scrollHeight;
}

function handleTypingIndicator(user) {
    if (user && user !== username) {
        typingIndicator.textContent = `${user} is typing...`;
        typingIndicator.style.display = 'block';
        setTimeout(() => {
            typingIndicator.style.display = 'none';
        }, 2000);
    }
}

function updateUserList(users) {
    const userList = document.getElementById('userList');
    userList.innerHTML = users.map(user => `
        <div class="user-item">
            <span class="user-status online"></span>
            <span class="user-name">${user}</span>
        </div>
    `).join('');
}

function copyAddress(type) {
    const ip = type === 'ipv4' ? serverAddresses.ipv4[0] : serverAddresses.ipv6[0];
    if (!ip) return;
    
    const url = getFullServerURL(ip, type);
    navigator.clipboard.writeText(url).then(() => {
        const buttons = document.querySelectorAll('.copy-button');
        buttons.forEach(button => {
            if (button.getAttribute('onclick').includes(type)) {
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            }
        });
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

// Input handling
input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage(input.value);
    }
});

sendBtn.addEventListener('click', () => {
    sendMessage(input.value);
});

// Sidebar toggle functionality
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('visible');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        !sidebarToggle.contains(e.target) && 
        sidebar.classList.contains('visible')) {
        sidebar.classList.remove('visible');
    }
});

// Event Listeners
fileButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileUpload(file);
        fileInput.value = ''; // Reset file input
    }
});

// Initialize and connect automatically
connectToServer();
