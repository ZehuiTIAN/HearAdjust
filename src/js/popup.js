// src/js/popup.js

const toggleButton = document.getElementById('toggleButton');
const statusText = document.getElementById('statusText');

// Function to update the UI based on the active state
function updateUI(isActive) {
    if (isActive) {
        statusText.textContent = 'Active';
        toggleButton.textContent = 'Deactivate';
        toggleButton.classList.remove('button-off');
        toggleButton.classList.add('button-on');
    } else {
        statusText.textContent = 'Inactive';
        toggleButton.textContent = 'Activate';
        toggleButton.classList.remove('button-on');
        toggleButton.classList.add('button-off');
    }
}

// Immediately check the state when the popup is opened
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('Error getting state:', chrome.runtime.lastError.message);
        // Assume inactive state on error
        updateUI(false);
        return;
    }
    updateUI(response.isActive);
});

// Listen for clicks on the toggle button
toggleButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        if (chrome.runtime.lastError) {
            console.error('Error getting state for toggle:', chrome.runtime.lastError.message);
            return;
        }
        
        const currentlyActive = response.isActive;
        const actionType = currentlyActive ? 'STOP_PROCESSING' : 'START_PROCESSING';

        // Send the appropriate message to the background script
        chrome.runtime.sendMessage({ type: actionType }, (newResponse) => {
            if (chrome.runtime.lastError) {
                console.error(`Error sending ${actionType}:`, chrome.runtime.lastError.message);
                return;
            }
            // Update the UI with the new state from the background
            updateUI(newResponse.isActive);
        });
    });
});

// Listen for state changes from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STATE_CHANGED') {
        updateUI(message.isActive);
    }
});