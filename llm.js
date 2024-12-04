// 所有跟大模型有关的都在llm.js

document.addEventListener('DOMContentLoaded', function() {
    const distantContent = document.getElementById('distant-content');
    if (!distantContent) {
        console.error('Element with id "distant-content" not found');
        return;
    }

    const outputDiv = document.createElement('div');
    outputDiv.id = 'output';
    outputDiv.style.overflow = 'auto';
    distantContent.appendChild(outputDiv);

    const inputContainer = document.createElement('div');
    inputContainer.id = 'input-container';
    distantContent.appendChild(inputContainer);

    const startButton = document.createElement('button');
    startButton.id = 'submit-button';
    inputContainer.appendChild(startButton);

    const contentDiv = document.createElement('div');
    contentDiv.id = 'contentDiv';
    contentDiv.contentEditable = true;
    inputContainer.appendChild(contentDiv);

    const sendButton = document.createElement('button');
    sendButton.id = 'sendButton';
    inputContainer.appendChild(sendButton);

   

    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let transcript = '';

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                transcript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        contentDiv.textContent = (transcript + interimTranscript).slice(0, 400);
    };

    recognition.onerror = (event) => {
        console.error(event.error);
    };

    startButton.addEventListener('click', () => {
        recognition.start();
    });

    sendButton.addEventListener('click', async () => {
        const content = contentDiv.textContent;
        console.log(content);
        try {
            const response = await fetch('http://127.0.0.1:8080/llm_api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: content })
            });
            const data = await response.json();
            outputDiv.textContent = data.llm;
            const utterance = new SpeechSynthesisUtterance(data.llm);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error('Error:', error);
        }
    });
});