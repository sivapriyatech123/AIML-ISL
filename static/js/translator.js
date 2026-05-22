document.addEventListener('DOMContentLoaded', () => {
    console.log("Translator Page Loaded");
});

let translatorPollInterval = null;

// ================= MODE SWITCHING =================
function switchMode(mode) {
    const sectionSignToText = document.getElementById('signToTextSection');
    const sectionTextToSign = document.getElementById('textToSignSection');
    const btnSignToText = document.getElementById('btnModeSignToText');
    const btnTextToSign = document.getElementById('btnModeTextToSign');

    if (mode === 'signToText') {
        sectionSignToText.style.display = 'block';
        sectionTextToSign.style.display = 'none';
        btnSignToText.classList.add('active');
        btnTextToSign.classList.remove('active');
    } else {
        sectionSignToText.style.display = 'none';
        sectionTextToSign.style.display = 'block';
        btnSignToText.classList.remove('active');
        btnTextToSign.classList.add('active');
        stopTranslator(); 
    }
}

// ================= SIGN TO TEXT (CAMERA) =================
function startTranslator() {
    fetch("/start_webcam").then(() => {
        const videoApi = "/video_feed";
        const img = document.getElementById("videoStream");
        const placeholder = document.getElementById("cameraPlaceholder");

        if (placeholder) placeholder.style.display = 'none';
        if (img) {
            img.style.display = 'block';
            img.src = videoApi;
        }

        
        if (translatorPollInterval) clearInterval(translatorPollInterval);

        translatorPollInterval = setInterval(() => {
            fetch("/get_text").then(res => res.text()).then(text => {
                const outputBox = document.getElementById("outputText");
                if (outputBox) {
                    if (text.trim()) {
                        outputBox.innerText = text;
                        // Use a class to style it differently if active
                        outputBox.style.color = "#fff";
                    } else {
                        outputBox.innerText = "Listening...";
                        outputBox.style.color = "#aaa";
                    }
                }
            }).catch(e => console.error(e));
        }, 500);

    }).catch(err => {
        console.error("Failed to start camera", err);
        alert("Could not start camera. Please check permissions.");
    });
}

function stopTranslator() {
    const img = document.getElementById("videoStream");
    const placeholder = document.getElementById("cameraPlaceholder");

    if (img) {
        img.src = "";
        img.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'flex';

    if (translatorPollInterval) {
        clearInterval(translatorPollInterval);
        translatorPollInterval = null;
    }

    fetch("/stop_webcam").catch(e => console.error(e));

    const out = document.getElementById("outputText");
    if (out) out.innerText = "Camera stopped.";
}

function playAudio() {
    fetch("/speak_text").then(res => {
        console.log("Audio playing...");
    }).catch(e => console.error(e));
}

function stopAudio() {
    console.log("Stop Audio clicked");
}

// ================= TEXT TO SIGN =================

function clearTextToSign() {
    const input = document.getElementById('textInput');
    const outputArea = document.getElementById('signOutputArea');
    const card = document.getElementById('signOutputCard');

    if (input) input.value = '';
    if (outputArea) outputArea.innerHTML = '';
    if (card) card.style.display = 'none';
}

function convertTextToSign() {
    const input = document.getElementById('textInput');
    const outputArea = document.getElementById('signOutputArea');
    const card = document.getElementById('signOutputCard');

    if (!input || !input.value.trim()) {
        alert("Please enter some text!");
        return;
    }

    const text = input.value.trim().toUpperCase();
    outputArea.innerHTML = '';
    card.style.display = 'block';

    // Split text into words 
    const words = text.split(/\s+/);

    words.forEach((word, index) => {
        const wordContainer = document.createElement('div');
        wordContainer.className = 'sign-word-group';
        wordContainer.style.animationDelay = `${index * 0.1}s`;
        wordContainer.style.display = 'flex';
        wordContainer.style.flexDirection = 'row';
        wordContainer.style.marginRight = '20px'; // Space between words
        wordContainer.style.marginBottom = '20px';

        // Check if it is a number or alphabet
        for (let char of word) {
            if (char.match(/[A-Z0-9]/)) {
                // Flat Structure Image Path
                const imgSrc = `/static/images/${char}.jpg`;

                const img = document.createElement('img');
                img.src = imgSrc;
                img.alt = char;
                img.title = char;
                img.style.height = '100px';
                img.style.width = 'auto'; // Keep aspect ratio
                img.style.objectFit = 'contain';
                img.style.borderRadius = '8px';
                img.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';

                // Error Handling for Missing Images
                img.onerror = function () {
                    this.style.display = 'none'; // Hide broken image
                    const placeholder = document.createElement('div');
                    placeholder.className = 'missing-sign';
                    placeholder.innerText = char;
                    placeholder.style.width = '80px';
                    placeholder.style.height = '100px';
                    placeholder.style.display = 'flex';
                    placeholder.style.alignItems = 'center';
                    placeholder.style.justifyContent = 'center';
                    placeholder.style.border = '2px dashed #ccc';
                    placeholder.style.borderRadius = '8px';
                    placeholder.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    placeholder.style.color = '#fff';
                    placeholder.style.fontSize = '24px';
                    placeholder.title = "No sign available";
                    charDiv.insertBefore(placeholder, label);
                };

                const label = document.createElement('span');
                label.innerText = char;
                label.style.marginTop = '5px';
                label.style.fontSize = '14px';
                label.style.color = '#ccc';

                const charDiv = document.createElement('div');
                charDiv.style.display = 'flex';
                charDiv.style.flexDirection = 'column';
                charDiv.style.alignItems = 'center';
                charDiv.style.marginRight = '8px';
                charDiv.style.flexShrink = '0';

                charDiv.appendChild(img);
                charDiv.appendChild(label);
                wordContainer.appendChild(charDiv);
            }
        }

        outputArea.appendChild(wordContainer);
    });
}

// Voice Input (Web Speech API)
function toggleVoiceInput() {
    const micBtn = document.getElementById('micBtn');
    const textArea = document.getElementById('textInput');

    if (!('webkitSpeechRecognition' in window)) {
        alert("Your browser does not support voice input. Please use Chrome.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    micBtn.classList.add('listening');

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        textArea.value = transcript;
        micBtn.classList.remove('listening');
        convertTextToSign(); // Auto-convert after speaking
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        micBtn.classList.remove('listening');
    };

    recognition.onend = () => {
        micBtn.classList.remove('listening');
    };
}
