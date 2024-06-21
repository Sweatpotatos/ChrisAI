let outputText = "";
let outputElement = document.getElementById('output');
let conversationHistory = [];

const fileInput = document.getElementById('fileInput');
const fileButton = document.getElementById('fileButton');
const emojiButton = document.getElementById('emojiButton');
const inputText = document.getElementById('inputText');
const topicInput = document.getElementById('topicInput');

fileButton.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', handleFileUpload);

function initializeConversationHistory(topic) {
    conversationHistory = [{
        role: 'system',
        content: `You should only speak according to the user topic: "${topic}". Your name is Chris. If asked, always state that your name is Chris.`
    }];
}

async function generateResponse() {
    const inputTextValue = inputText.value.trim();
    const topicValue = topicInput.value.trim();

    if (topicValue !== "" && conversationHistory.length === 0) {
        initializeConversationHistory(topicValue);
    }

    if (inputTextValue !== "") {
        addMessage(inputTextValue, 'client');
        inputText.value = "";

        // Show typing indicator
        addTypingIndicator();

        // Check if the user is asking about the bot's name
        if (inputTextValue.toLowerCase().includes("what is your name")) {
            addMessage("My name is Chris.", 'bot');
            removeTypingIndicator();
            return;
        }

        conversationHistory.push({
            role: 'user',
            content: inputTextValue
        });

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sk-proj-120SacAQjM0SgfRh04BCT3BlbkFJYgfvWVnPdsLh9QPfJ4OK'
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: conversationHistory
                })
            });

            removeTypingIndicator();

            if (response.status === 429) {
                console.error('Too many requests. Please try again later.');
                addMessage("Too many requests. Please try again later.", 'bot');
                return;
            }

            if (!response.ok) {
                console.error('Error:', response.statusText);
                addMessage("An error occurred: " + response.statusText, 'bot');
                return;
            }

            const responseData = await response.json();
            console.log(responseData);

            if (responseData && responseData.choices && responseData.choices.length > 0) {
                const botResponse = responseData.choices[0].message.content;
                animateMessage(botResponse);
                conversationHistory.push({
                    role: 'assistant',
                    content: botResponse
                });
            } else {
                addMessage("Error: No response data or empty choices array.", 'bot');
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage("Error: An error occurred while fetching the response.", 'bot');
        }
    }
}

function addMessage(text, type) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message ' + type;

    const textElement = document.createElement('div');
    textElement.className = 'text';
    textElement.textContent = text;

    messageElement.appendChild(textElement);

    outputElement.appendChild(messageElement);
    outputElement.scrollTop = outputElement.scrollHeight;
}

function addTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.textContent = 'Chris is typing...';
    typingIndicator.id = 'typingIndicator';
    outputElement.appendChild(typingIndicator);
    outputElement.scrollTop = outputElement.scrollHeight;
}

function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

function animateMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message bot';
    outputElement.appendChild(messageElement);
    outputElement.scrollTop = outputElement.scrollHeight;

    let index = 0;
    function type() {
        if (index < text.length) {
            messageElement.textContent += text.charAt(index);
            index++;
            outputElement.scrollTop = outputElement.scrollHeight;
            setTimeout(type, 50); // Adjust typing speed here
        }
    }
    type();
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        addMessage(`Client is uploading a file: ${file.name}`, 'client');
        if (file.type === "application/pdf") {
            await handlePDFUpload(file);
        } else if (file.type === "text/plain") {
            await handleTextFileUpload(file);
        } else {
            addMessage("Client uploaded a file: Unsupported file type.", 'client');
        }
        fileInput.value = ""; // Reset file input
    }
}

// Handle PDF file upload
async function handlePDFUpload(file) {
    const reader = new FileReader();
    reader.onload = async function(event) {
        const pdfData = new Uint8Array(event.target.result);
        const pdfDoc = await PDFLib.PDFDocument.load(pdfData);
        const textContent = await extractTextFromPDF(pdfDoc);
        addMessage("Client uploaded a PDF: " + textContent.slice(0, 100) + "...", 'client');
    };
    reader.readAsArrayBuffer(file);
}

// Extract text from PDF
async function extractTextFromPDF(pdfDoc) {
    const textContent = [];
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
        const text = await pages[i].getTextContent();
        text.items.forEach(item => textContent.push(item.str));
    }
    return textContent.join(' ');
}

// Handle text file upload
async function handleTextFileUpload(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const textContent = event.target.result;
        addMessage("Client uploaded a text file: " + textContent.slice(0, 100) + "...", 'client');
    };
    reader.readAsText(file);
}

// Debounce function to limit the rate of requests
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}

const debouncedGenerateResponse = debounce(generateResponse, 2000); // Adjust the delay as needed

document.getElementById("submitButton").addEventListener("click", debouncedGenerateResponse);

// Additional Event Listener for Enter Key
inputText.addEventListener("keypress", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        debouncedGenerateResponse();
    }
});