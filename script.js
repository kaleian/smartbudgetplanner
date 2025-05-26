// Auth state management
let currentUser = null;
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];
let pieChart = null;
let selectedFile = null; // Store the selected file

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Hide main content initially
    document.querySelector('.header').style.display = 'none';
    document.querySelector('.dashboard').style.display = 'none';
    
    // Show auth modal by default
    document.getElementById('auth-modal').style.display = 'flex';
    
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        hideAuthModal();
    }
    
    // Initialize auth tabs
    initAuthTabs();
    
    // Initialize auth forms
    initAuthForms();
    
    // Initialize other functionality
    initSidebarNavigation();
    initTransactionSystem();
    initDarkMode();
    initSignOutButtons();
    initReportModal();
    initDragAndDrop();
});

function initSignOutButtons() {
    // Header sign out button
    
    
    // Settings sign out button
    document.getElementById('signOutSettings').addEventListener('click', handleSignOut);
}

function handleSignOut() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // Clear user data
    transactions = [];
    uploadedFiles = [];
    
    // Show auth modal again
    document.querySelector('.header').style.display = 'none';
    document.querySelector('.dashboard').style.display = 'none';
    document.getElementById('auth-modal').style.display = 'flex';
    
    // Reset forms
    document.getElementById('loginForm').reset();
    document.getElementById('signupForm').reset();
}

function initAuthTabs() {
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding form
            const tabId = this.getAttribute('data-tab');
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.remove('active');
            });
            document.getElementById(`${tabId}-form`).classList.add('active');
        });
    });
}

function initAuthForms() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Simple validation
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        // Check if user exists (in a real app, this would be a server request)
        const users = JSON.parse(localStorage.getItem('users')) || [];
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            hideAuthModal();
        } else {
            alert('Invalid email or password');
        }
    });
    
    // Signup form
    document.getElementById('signupForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;
        
        // Validation
        if (!name || !email || !password || !confirm) {
            alert('Please fill in all fields');
            return;
        }
        
        if (password !== confirm) {
            alert('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            alert('Password must be at least 6 characters');
            return;
        }
        
        // Check if user already exists
        const users = JSON.parse(localStorage.getItem('users')) || [];
        if (users.some(u => u.email === email)) {
            alert('Email already registered');
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now(),
            name,
            email,
            password, // In a real app, NEVER store plain passwords - always hash them
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Log the user in
        currentUser = newUser;
        localStorage.setItem('currentUser', JSON.stringify(newUser));
        hideAuthModal();
    });
    
    // Google sign-in button in modal
     // Google sign-in button in modal
     document.getElementById('modal-google-signin').addEventListener('click', async function() {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            // Store user in localStorage
            currentUser = {
                id: user.uid,
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: new Date().toISOString()
            };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Also store in users array if needed
            const users = JSON.parse(localStorage.getItem('users')) || [];
            if (!users.some(u => u.email === user.email)) {
                users.push({
                    id: user.uid,
                    name: user.displayName,
                    email: user.email,
                    createdAt: new Date().toISOString()
                });
                localStorage.setItem('users', JSON.stringify(users));
            }
            
            hideAuthModal();
        } catch (error) {
            console.error("Google sign-in error:", error);
            document.getElementById('login-error').textContent = getAuthErrorMessage(error.code);
        }
    });
}

function hideAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    document.querySelector('.header').style.display = 'flex';
    document.querySelector('.dashboard').style.display = 'flex';
    
    // Load user data
    if (currentUser) {
        // Update UI with user info
        const profileIcon = document.getElementById('profileIcon');
        if (profileIcon) {
            profileIcon.style.display = 'block';
            profileIcon.querySelector('img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=random`;
            document.getElementById('profileName').textContent = currentUser.name;
        }
        
        // Update settings page
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('userCreated').textContent = new Date(currentUser.createdAt).toLocaleDateString();
        
        // Load transactions and files
        transactions = JSON.parse(localStorage.getItem(`transactions_${currentUser.id}`)) || [];
        uploadedFiles = JSON.parse(localStorage.getItem(`uploadedFiles_${currentUser.id}`)) || [];
        
        updateTransactions();
        updateSummary();
        updateChart();
        updateUploadedFilesList();
        updateAdviceList();
    }
    
    // Show dashboard by default
    showPage('dashboard');
}

// ====================== SIDEBAR NAVIGATION ======================
function initSidebarNavigation() {
    const navItems = document.querySelectorAll('.sidelist ul li[data-page]');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the page to show from data attribute
            const pageId = this.getAttribute('data-page');
            
            // Update active state
            navItems.forEach(navItem => navItem.classList.remove('active'));
            this.classList.add('active');
            
            // Show the selected page
            showPage(pageId);
        });
    });
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-container').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the selected page
    const targetPage = document.getElementById(`${pageId}-page`);
    if (targetPage) {
        targetPage.classList.add('active');
        
        // Update specific content when pages are shown
        if (pageId === 'reports') {
            updateUploadedFilesList();
            updateAdviceList();
        } else if (pageId === 'dashboard') {
            updateChart(); // Ensure chart is properly rendered
        }
    }
}

// ====================== TRANSACTION SYSTEM ======================
function initTransactionSystem() {
    const addBtn = document.getElementById('add-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addTransaction);
    }
}

function addTransaction() {
    const type = document.getElementById('type-select').value;
    const category = document.getElementById('category-select').value;
    const amount = parseFloat(document.getElementById('amount-input').value);
    const date = document.getElementById('date-input').value;
    
    if (!amount || isNaN(amount)) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    const transaction = {
        id: Date.now(),
        type,
        category,
        amount,
        date
    };
    
    transactions.push(transaction);
    saveTransactions();
    updateTransactions();
    updateSummary();
    updateChart();
    
    // Clear inputs
    document.getElementById('amount-input').value = '';
    document.getElementById('date-input').value = '';
}

function saveTransactions() {
    if (currentUser) {
        localStorage.setItem(`transactions_${currentUser.id}`, JSON.stringify(transactions));
    } else {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }
}

function updateTransactions() {
    const tableBody = document.getElementById('transactions-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</td>
            <td>${transaction.category}</td>
            <td>KSh ${transaction.amount.toFixed(2)}</td>
            <td>${transaction.date}</td>
            <td><button class="delete-btn" onclick="deleteTransaction(${transaction.id})">Delete</button></td>
        `;
        tableBody.appendChild(row);
    });
}

function updateSummary() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
    const netBalance = totalIncome - totalExpenses;
    
    const incomeDisplay = document.getElementById('total-income');
    const expensesDisplay = document.getElementById('total-expenses');
    const balanceDisplay = document.getElementById('net-balance');
    
    if (incomeDisplay) incomeDisplay.textContent = `KSh ${totalIncome.toFixed(2)}`;
    if (expensesDisplay) expensesDisplay.textContent = `KSh ${totalExpenses.toFixed(2)}`;
    if (balanceDisplay) balanceDisplay.textContent = `KSh ${netBalance.toFixed(2)}`;
}

function updateChart() {
    const ctx = document.getElementById('pieChart')?.getContext('2d');
    if (!ctx) return;
    
    const expenseCategories = {};
    
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            if (!expenseCategories[t.category]) {
                expenseCategories[t.category] = 0;
            }
            expenseCategories[t.category] += t.amount;
        });
    
    const labels = Object.keys(expenseCategories);
    const data = Object.values(expenseCategories);
    
    // Destroy previous chart if it exists
    if (pieChart) {
        pieChart.destroy();
    }
    
    if (labels.length > 0) {
        pieChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40',
                        '#8AC24A',
                        '#FF5722',
                        '#607D8B'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-dark'),
                            font: {
                                family: "'Open Sans', sans-serif"
                            }
                        }
                    }
                }
            }
        });
        
        // Update chart colors for dark mode
        if (document.body.classList.contains('dark-mode')) {
            pieChart.options.plugins.legend.labels.color = getComputedStyle(document.body).getPropertyValue('--text-light');
            pieChart.update();
        }
    }
}

// ====================== FILE UPLOAD & ANALYSIS ======================
function initDragAndDrop() {
    const dropArea = document.getElementById('drop-area');
        const fileInput = document.getElementById('statementUpload');
        const browseBtn = document.getElementById('browse-btn');
        const fileInfo = document.getElementById('file-info');
        const analyzeBtn = document.getElementById('analyze-btn');
        const clearBtn = document.getElementById('clear-btn');
        const userPrompt = document.getElementById('userPrompt');
        const aiResponse = document.getElementById('aiResponse');
        const aiResponseContainer = document.getElementById('ai-response-container');
        const spinner = document.getElementById('spinner');
        const errorMessage = document.getElementById('error-message');
        const successMessage = document.getElementById('success-message');
        const uploadSection = document.getElementById('upload-section');

        // Event listeners
        browseBtn.addEventListener('click', () => fileInput.click());
        clearBtn.addEventListener('click', clearAll);
        analyzeBtn.addEventListener('click', analyzeDocument);

        // Drag and drop functionality
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, unhighlight, false);
        });

        dropArea.addEventListener('drop', handleDrop, false);
        fileInput.addEventListener('change', handleFiles);

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        function highlight() {
            uploadSection.classList.add('drag-over');
        }

        function unhighlight() {
            uploadSection.classList.remove('drag-over');
        }

        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            handleFiles({ target: { files } });
        }

        function handleFiles(e) {
            const files = e.target.files;
            if (files.length) {
                const file = files[0];
                fileInfo.innerHTML = `<i class="fas fa-check-circle"></i><span>${file.name} (${formatFileSize(file.size)})</span>`;
                fileInfo.classList.add('has-file');
                showSuccess('File ready for analysis');
                selectedFile = file;
            }
        }
        
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        function clearAll() {
            fileInput.value = '';
            fileInfo.innerHTML = '<i class="fas fa-info-circle"></i><span>No file selected</span>';
            fileInfo.classList.remove('has-file');
            userPrompt.value = '';
            aiResponse.textContent = '';
            aiResponseContainer.style.display = 'none';
            hideError();
            hideSuccess();
            selectedFile = null;
        }

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            hideSuccess();
        }
        
        function hideError() {
            errorMessage.style.display = 'none';
        }
        
        function showSuccess(message) {
            successMessage.textContent = message;
            successMessage.style.display = 'block';
            hideError();
        }
        
        function hideSuccess() {
            successMessage.style.display = 'none';
        }

        async function analyzeDocument() {
    // Validate inputs
    if (!selectedFile) {
        showError('Please select a file to upload.');
        return;
    }
    
    if (!userPrompt.value.trim()) {
        showError('Please enter your question or instructions.');
        return;
    }
    
    // Clear previous results and errors
    hideError();
    hideSuccess();
    aiResponseContainer.style.display = 'none';
    
    // Show loading spinner
    spinner.style.display = 'block';
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    try {
        // Prepare form data
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('prompt', userPrompt.value.trim());
        
        // Send request to backend
        const response = await fetch('http://localhost:5000/analyze', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Response from backend:", data);

        if (data.error) {
            throw new Error(data.error);
        }

        if (data.success) {
            // Display the analysis
            aiResponse.textContent = data.analysis;
            aiResponseContainer.style.display = 'block';
            showSuccess('Analysis completed successfully');
            
            // Create a new report object
            const report = {
                id: Date.now(),
                name: selectedFile.name,
                date: new Date().toLocaleDateString(),
                analysisData: {
                    analysis: data.analysis,
                    financial_data: data.financial_data,
                    recommendations: data.recommendations
                }
            };
            
            // Add to uploaded files and save
            uploadedFiles.unshift(report); // Add to beginning of array
            saveUploadedFiles();
            
            // Update the reports list
            updateUploadedFilesList();
        } else {
            throw new Error('Failed to analyze the file.');
        }
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'An error occurred during analysis.');
    } finally {
        spinner.style.display = 'none';
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> Analyze Document';
    }
}
}
function saveUploadedFiles() {
    if (currentUser) {
        localStorage.setItem(`uploadedFiles_${currentUser.id}`, JSON.stringify(uploadedFiles));
    } else {
        localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
    }
}

function updateUploadedFilesList() {
    const filesList = document.getElementById('reports-container');
    if (!filesList) return;
    
    filesList.innerHTML = '';
    
    if (uploadedFiles.length === 0) {
        filesList.innerHTML = `
            <div class="no-reports">
                <i class="fas fa-file-alt"></i>
                <h3>No Reports Found</h3>
                <p>Upload a financial document to generate your first report</p>
                <button class="btn btn-primary" onclick="showPage('upload')">
                    <i class="fas fa-upload"></i> Upload Document
                </button>
            </div>
        `;
        return;
    }
    
    uploadedFiles.forEach(file => {
        const reportCard = document.createElement('div');
        reportCard.className = 'report-card';
        
        // Check if we have financial data
        let statsHTML = '';
        if (file.analysisData?.financial_data) {
            const data = file.analysisData.financial_data;
            statsHTML = `
                <div class="financial-stats">
                    <div class="stat-item">
                        <div class="stat-label">Total Income</div>
                        <div class="stat-value">${formatCurrency(data.total_income || 0)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Expenses</div>
                        <div class="stat-value negative">${formatCurrency(data.total_expenses || 0)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Net Savings</div>
                        <div class="stat-value positive">${formatCurrency(data.net_savings || 0)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Savings Rate</div>
                        <div class="stat-value">${data.savings_rate || 0}%</div>
                    </div>
                </div>
            `;
        }
        
        reportCard.innerHTML = `
            <div class="report-header">
                <div class="report-title">${file.name || 'Financial Report'}</div>
                <div class="report-meta">
                    <span><i class="fas fa-calendar-alt"></i> ${file.date}</span>
                    <span><i class="fas fa-file-alt"></i> ${file.name ? file.name.split('.').pop().toUpperCase() : 'PDF'}</span>
                </div>
            </div>
            
            ${statsHTML}
            
            <div class="report-summary">
                <h4>Summary</h4>
                <p>${file.analysisData?.analysis.substring(0, 200) || 'No summary available'}${file.analysisData?.analysis.length > 200 ? '...' : ''}</p>
            </div>
            
            <div class="report-actions">
                <button class="btn btn-outline" onclick="viewFullReport(${file.id})">
                    <i class="fas fa-eye"></i> View Details
                </button>
                <button class="btn btn-primary" onclick="downloadReport('${file.name}')">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `;
        
        filesList.appendChild(reportCard);
    });
}

function updateAdviceList() {
    const adviceContainer = document.getElementById('advice-container');
    if (!adviceContainer) return;
    
    adviceContainer.innerHTML = '';
    
    uploadedFiles.forEach(file => {
        const adviceCard = document.createElement('div');
        adviceCard.className = 'advice-card';
        adviceCard.innerHTML = `
            <h4>Recommendations for ${file.name}</h4>
            <p>${file.advice}</p>
            <div class="file-meta">Generated on ${file.date}</div>
        `;
        adviceContainer.appendChild(adviceCard);
    });
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
}

// Extract first paragraph from analysis
function extractFirstParagraph(text) {
    if (!text) return "No summary available";
    const paragraphs = text.split('\n\n');
    return paragraphs.length > 0 ? paragraphs[0] : text;
}

// Modal functions
function initReportModal() {
    // Close modal when clicking outside content
    window.onclick = function(event) {
        const modal = document.getElementById('reportModal');
        if (event.target === modal) {
            closeModal();
        }
    }
}

function openModal() {
    document.getElementById('reportModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('reportModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// View full report
async function viewFullReport(fileId) {
    const file = uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    // Set modal title and date
    document.getElementById('modalReportTitle').textContent = file.name;
    document.getElementById('modalReportDate').textContent = `Analyzed on: ${file.date}`;
    
    // Build full report content
    let contentHTML = `
        <div class="full-analysis">
            <h3>Complete Analysis</h3>
            ${file.analysisData?.analysis || 'No analysis content available.'}
        </div>
    `;
    
    // Add financial data if available
    if (file.analysisData?.financial_data) {
        const data = file.analysisData.financial_data;
        contentHTML += `
            <div class="financial-details">
                <h3>Financial Summary</h3>
                <p><strong>Total Income:</strong> ${formatCurrency(data.total_income || 0)}</p>
                <p><strong>Total Expenses:</strong> ${formatCurrency(data.total_expenses || 0)}</p>
                <p><strong>Net Savings:</strong> ${formatCurrency(data.net_savings || 0)}</p>
                <p><strong>Savings Rate:</strong> ${data.savings_rate || 0}%</p>
                
                <h4>Spending Categories</h4>
                <ul class="categories-list">
                    ${data.main_categories ? data.main_categories.map(cat => 
                        `<li><strong>${cat.name}:</strong> ${formatCurrency(cat.amount)}</li>`
                    ).join('') : '<li>No category data available</li>'}
                </ul>
                
                <h4>Notable Transactions</h4>
                <ul class="transactions-list">
                    ${data.notable_transactions ? data.notable_transactions.map(tx => 
                        `<li><strong>${tx.description}:</strong> ${formatCurrency(tx.amount)}</li>`
                    ).join('') : '<li>No notable transactions</li>'}
                </ul>
            </div>
        `;
    }
    
    // Add recommendations if available
    if (file.analysisData?.recommendations) {
        contentHTML += `
            <div class="recommendations">
                <h3>Recommendations</h3>
                ${file.analysisData.recommendations}
            </div>
        `;
    }
    
    document.getElementById('modalReportContent').innerHTML = contentHTML;
    openModal();
}

// Download report
function downloadReport(filename) {
    const file = uploadedFiles.find(f => f.name === filename);
    if (!file) return;
    
    // Create a blob with the analysis content
    const blob = new Blob([file.analysisData.analysis], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary link to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename.split('.')[0]}_analysis.txt`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

// ====================== DARK MODE ======================
function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        // Set initial state from localStorage
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
            darkModeToggle.checked = true;
        }
        
        // Add change event listener
        darkModeToggle.addEventListener('change', toggleDarkMode);
    }
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    
    // Update chart colors if it exists
    if (pieChart) {
        pieChart.options.plugins.legend.labels.color = isDarkMode ? 
            getComputedStyle(document.body).getPropertyValue('--text-light') : 
            getComputedStyle(document.body).getPropertyValue('--text-dark');
        pieChart.update();
    }
}

// ====================== GLOBAL FUNCTIONS ======================
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    updateTransactions();
    updateSummary();
    updateChart();
}

function triggerFileInput() {
    document.getElementById('statementUpload').click();
}

function toggleFAQ(element) {
    const faqItem = element.parentElement;
    faqItem.classList.toggle('active');
    
    const icon = element.querySelector('i');
    if (faqItem.classList.contains('active')) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
    } else {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
    }
}

// Make functions available globally for HTML onclick attributes
window.toggleSidebar = toggleSidebar;
window.deleteTransaction = deleteTransaction;
window.triggerFileInput = triggerFileInput;
window.toggleFAQ = toggleFAQ;
window.viewFullReport = viewFullReport;
window.downloadReport = downloadReport;
window.closeModal = closeModal;