/* ==========================================================================
   Seerah Study Portal - Application Logic Controller
   Handles state management, transitions, filtering, and image loading.
   ========================================================================== */

// App State
let currentGroup = null;
let filteredQuestions = [];
let currentIndex = 0;
let isAnswerRevealed = false;

// DOM Elements
const homeScreen = document.getElementById('home-screen');
const suggestionScreen = document.getElementById('suggestion-screen');

// Dashboard Cards
const cardJunior = document.getElementById('card-junior');
const cardSenior = document.getElementById('card-senior');
const cardTeacher = document.getElementById('card-teacher');

// Navigation Controls
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnHome = document.getElementById('btn-home');
const btnHeaderBack = document.getElementById('btn-header-back');

// Content Displays
const activeGroupTitle = document.getElementById('active-group-title');
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const questionText = document.getElementById('question-text');
const answerText = document.getElementById('answer-text');
const answerCard = document.getElementById('answer-card');
const answerContentWrapper = document.getElementById('answer-content-wrapper');
const btnRevealAnswer = document.getElementById('btn-reveal-answer');

// Image Elements
const aiImage = document.getElementById('ai-image');
const imageLoading = document.getElementById('image-loading');

// Jump Navigation Elements
const inputJump = document.getElementById('input-jump');
const btnJump = document.getElementById('btn-jump');

// Custom Image Cache to prevent flickering
const imageCache = new Map();

/* ==========================================================================
   1. Event Listeners Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Group Selection Listeners
    cardJunior.addEventListener('click', () => startStudy('junior'));
    cardSenior.addEventListener('click', () => startStudy('senior'));
    cardTeacher.addEventListener('click', () => startStudy('teacher'));

    // Navigation Button Listeners
    btnPrev.addEventListener('click', navigatePrevious);
    btnNext.addEventListener('click', navigateNext);
    btnHome.addEventListener('click', returnHome);
    btnHeaderBack.addEventListener('click', returnHome);

    // Answer Reveal Listener
    btnRevealAnswer.addEventListener('click', toggleAnswer);
    // Jump Navigation Listeners
    btnJump.addEventListener('click', executeJump);
    inputJump.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            executeJump();
        }
    });
    // Keyboard Navigation support
    document.addEventListener('keydown', handleKeyboardNavigation);
});

/* ==========================================================================
   2. Core Navigation & Filtering Logic
   ========================================================================== */

/**
 * Filter the database and transition to the suggestion view screen.
 * @param {string} group - Selection group ('junior' | 'senior' | 'teacher')
 */
function startStudy(group) {
    currentGroup = group;
    currentIndex = 0;
    
    // Filter logic based on requirements
    if (group === 'junior') {
        filteredQuestions = seerahData.filter(item => item.JuniorSection);
        activeGroupTitle.textContent = "জুনিয়ার সেকশন (প্লে - ২য়)";
    } else if (group === 'senior') {
        filteredQuestions = seerahData.filter(item => item.SeniorSection);
        activeGroupTitle.textContent = "সিনিয়র সেকশন (৩য় - ১০ম)";
    } else if (group === 'teacher') {
        // Teacher/Guardian group loads all 319 records unfiltered
        filteredQuestions = [...seerahData];
        activeGroupTitle.textContent = "শিক্ষক ও অভিভাবক গ্রুপ";
    }

    if (filteredQuestions.length === 0) {
        alert("কোন তথ্য পাওয়া যায়নি!");
        return;
    }

    // Set maximum range for jump input
    inputJump.max = filteredQuestions.length;

    // Switch screen with animation
    switchScreen(homeScreen, suggestionScreen);
    
    // Load first question
    loadQuestion(0);
}

/**
 * Transition between screens with a smooth fade & slide effect
 */
function switchScreen(fromScreen, toScreen) {
    fromScreen.classList.remove('active');
    
    setTimeout(() => {
        fromScreen.style.display = 'none';
        toScreen.style.display = 'flex';
        
        // Force reflow
        toScreen.offsetHeight;
        
        toScreen.classList.add('active');
    }, 300); // Matches CSS transition timings
}

/**
 * Return to the main home dashboard screen
 */
function returnHome() {
    currentGroup = null;
    filteredQuestions = [];
    currentIndex = 0;
    
    switchScreen(suggestionScreen, homeScreen);
}

/* ==========================================================================
   3. Question Content Rendering & Image Preloading
   ========================================================================== */

/**
 * Load a question by index, updating texts, buttons, progress, and images.
 * @param {number} index - Index of the filtered questions array.
 */
function loadQuestion(index) {
    if (index < 0 || index >= filteredQuestions.length) return;
    
    currentIndex = index;
    isAnswerRevealed = false;
    
    const questionData = filteredQuestions[currentIndex];
    


    // 3a. Update Text Elements (with slide transition)
    const contentElements = [questionText, answerText, btnRevealAnswer, aiImage];
    contentElements.forEach(el => {
        el.classList.add('fade-out');
    });

    setTimeout(() => {
        // Set new values
        questionText.textContent = questionData.question;
        answerText.textContent = questionData.answer;
        
        // Reset jump input value and set placeholder to current question index + 1
        inputJump.value = '';
        inputJump.placeholder = index + 1;
        
        // Collapse the answer box
        answerContentWrapper.classList.remove('revealed');
        btnRevealAnswer.innerHTML = '<i class="fa-solid fa-eye"></i> উত্তর দেখুন (Reveal)';
        btnRevealAnswer.style.display = 'flex';

        // Update progress indicators
        updateProgress();

        // 3b. Load & Swap AI Image
        loadAIImage(questionData.image_prompt, questionData.SN);

        // Fade back in
        contentElements.forEach(el => {
            el.classList.remove('fade-out');
            el.classList.add('fade-in');
            setTimeout(() => el.classList.remove('fade-in'), 250);
        });
    }, 250);
}

/**
 * Load the image from Pollinations AI with custom styling, seed, and loading state.
 * @param {string} prompt - Image generation prompt.
 * @param {number} seed - Question SN to act as a stable seed.
 */
function loadAIImage(prompt, seed) {
    // Display loading spinner
    imageLoading.style.opacity = '1';
    imageLoading.style.pointerEvents = 'all';
    aiImage.classList.remove('loaded');

    // Encode prompt and construct image URL
    // Adding custom seeds keeps images stable for the same question
    const width = 800;
    const height = 800;
    const cleanPrompt = prompt.replace(/"/g, "'"); // Sanitize double quotes
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=${width}&height=${height}&nologo=true&seed=${seed}`;

    // Gracefully handle image load
    const imgObj = new Image();
    
    imgObj.onload = () => {
        aiImage.src = imageUrl;
        aiImage.classList.add('loaded');
        
        // Hide loading spinner
        imageLoading.style.opacity = '0';
        imageLoading.style.pointerEvents = 'none';
    };

    imgObj.onerror = () => {
        // Fallback to a placeholder style if image generation fails or user is offline
        aiImage.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"><rect width="800" height="800" fill="%23052F1B"/><circle cx="400" cy="400" r="150" fill="none" stroke="%23D4AF37" stroke-width="4"/><path d="M400 250 L400 550 M250 400 L550 400" stroke="%23D4AF37" stroke-width="4"/><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="%23D4AF37" font-size="28" font-family="sans-serif">সীরাত চিত্রকল্প লোড হতে পারেনি</text></svg>`;
        aiImage.classList.add('loaded');
        imageLoading.style.opacity = '0';
        imageLoading.style.pointerEvents = 'none';
    };

    imgObj.src = imageUrl;
}

/**
 * Update navigation buttons disabled states and header progress bar/text
 */
function updateProgress() {
    const total = filteredQuestions.length;
    const current = currentIndex + 1;
    
    // Progress badges
    progressText.textContent = `প্রশ্ন ${current} / ${total}`;
    
    // Progress bar width
    const percentage = (current / total) * 100;
    progressBar.style.width = `${percentage}%`;

    // Navigation buttons (hide or disable according to bounds)
    if (currentIndex === 0) {
        btnPrev.disabled = true;
        btnPrev.classList.add('hidden');
    } else {
        btnPrev.disabled = false;
        btnPrev.classList.remove('hidden');
    }

    if (currentIndex === total - 1) {
        btnNext.disabled = true;
        btnNext.classList.add('hidden');
    } else {
        btnNext.disabled = false;
        btnNext.classList.remove('hidden');
    }
}

/* ==========================================================================
   4. Interactivity Helpers
   ========================================================================== */

/**
 * Toggle the answer visibility (accordion animation)
 */
function toggleAnswer() {
    isAnswerRevealed = !isAnswerRevealed;
    
    if (isAnswerRevealed) {
        answerContentWrapper.classList.add('revealed');
        btnRevealAnswer.innerHTML = '<i class="fa-solid fa-eye-slash"></i> উত্তর লুকান (Hide)';
    } else {
        answerContentWrapper.classList.remove('revealed');
        btnRevealAnswer.innerHTML = '<i class="fa-solid fa-eye"></i> উত্তর দেখুন (Reveal)';
    }
}

/**
 * Navigation triggers
 */
function navigateNext() {
    if (currentIndex < filteredQuestions.length - 1) {
        loadQuestion(currentIndex + 1);
    }
}

function navigatePrevious() {
    if (currentIndex > 0) {
        loadQuestion(currentIndex - 1);
    }
}

/**
 * Jump to a specific question entered by the user
 */
function executeJump() {
    const value = parseInt(inputJump.value, 10);
    const total = filteredQuestions.length;
    if (isNaN(value) || value < 1 || value > total) {
        alert(`অনুগ্রহ করে ১ থেকে ${total}-এর মধ্যে একটি সঠিক নম্বর লিখুন!`);
        inputJump.value = '';
        return;
    }
    loadQuestion(value - 1);
}



/**
 * Handle hotkeys for accessibility and premium feel
 */
function handleKeyboardNavigation(e) {
    if (currentGroup === null) return; // Only trigger keyboard nav when inside suggestion view

    if (e.key === 'ArrowRight') {
        navigateNext();
    } else if (e.key === 'ArrowLeft') {
        navigatePrevious();
    } else if (e.key === 'Escape') {
        returnHome();
    } else if (e.key === ' ' || e.key === 'Enter') {
        // Spacebar or Enter toggles answer if suggestion screen is active
        if (document.activeElement.tagName !== 'BUTTON') {
            e.preventDefault();
            toggleAnswer();
        }
    }
}
