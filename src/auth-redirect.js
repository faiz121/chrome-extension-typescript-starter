// This will handle the redirect from SSO
// Will be updated with actual PKCE flow later

async function handleAuthRedirect() {
  try {
    // Get auth code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (!code) {
      throw new Error('No authorization code received');
    }

    // Mock token exchange - will be replaced with actual token exchange
    const mockSession = {
      username: 'testuser@example.com',
      token: 'mock-token-from-redirect'
    };

    // Save session
    await chrome.storage.local.set({ session: mockSession });

    // Notify background script
    await chrome.runtime.sendMessage({
      type: 'AUTH_SUCCESS',
      session: mockSession
    });

    // Close window after small delay
    setTimeout(() => {
      window.close();
    }, 1000);
  } catch (error) {
    console.error('Auth redirect error:', error);
    // You might want to show an error message to the user here
  }
}

handleAuthRedirect();