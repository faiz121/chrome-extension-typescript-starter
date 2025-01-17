import React from 'react';

const ChatInterface: React.FC = () => {
    return (
        <div id="my-chat-container" style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            border: '1px solid #ccc',
            padding: '10px',
            backgroundColor: 'white',
            zIndex: 1000,
            maxHeight: '300px',
            overflowY: 'auto',
            width: '300px', // Added width for better layout
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div id="messages" style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '5px' }}></div> {/* Messages container */}
            <div style={{ display: 'flex' }}> {/* Input and button container */}
                <input type="text" id="message-input" style={{ flexGrow: 1, marginRight: '5px' }} />
                <button id="send-message">Send</button>
            </div>
            <button id="summarize-tab" style={{ marginTop: '5px' }}>Summarize Tab</button>
        </div>
    );
};

export default ChatInterface;