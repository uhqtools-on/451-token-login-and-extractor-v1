const tokenInput = document.getElementById('token');
const loginBtn = document.getElementById('login');
const saveBtn = document.getElementById('save');
const getTokenBtn = document.getElementById('getToken');
const statusEl = document.getElementById('status');
const savedIndicator = document.getElementById('savedIndicator');

function showStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = 'status show ' + type;
  setTimeout(() => statusEl.classList.remove('show'), 3000);
}

// Charge le token sauvegardé au démarrage
chrome.storage.local.get(['discordToken'], (res) => {
  if (res.discordToken) {
    tokenInput.value = res.discordToken;
    savedIndicator.textContent = '✓ Token sauvegardé';
    savedIndicator.classList.add('active');
  }
});

// Sauvegarde le token
saveBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (!token) return showStatus('Aucun token à sauvegarder', 'error');
  chrome.storage.local.set({ discordToken: token }, () => {
    showStatus('Token sauvegardé', 'success');
    savedIndicator.textContent = '✓ Token sauvegardé';
    savedIndicator.classList.add('active');
  });
});

// Récupère le token depuis une session Discord ouverte
getTokenBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ url: 'https://discord.com/*' });
  if (!tab) return showStatus('Aucun onglet Discord ouvert', 'error');

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        let token = null;
        try {
          token = JSON.parse(iframe.contentWindow.localStorage.getItem('token'));
        } catch (e) {
          token = iframe.contentWindow.localStorage.getItem('token');
        }
        if (token && token.startsWith('"')) token = JSON.parse(token);
        iframe.remove();
        return token;
      }
    });
    const token = results[0].result;
    if (token) {
      tokenInput.value = token;
      chrome.storage.local.set({ discordToken: token });
      showStatus('Token récupéré !', 'success');
    } else {
      showStatus('Token introuvable dans le localStorage', 'error');
    }
  } catch (e) {
    showStatus('Erreur : ' + e.message, 'error');
  }
});

// Se connecter avec le token
loginBtn.addEventListener('click', () => {
  const token = tokenInput.value.trim();
  if (!token) return showStatus('Entre un token valide', 'error');

  chrome.storage.local.set({ discordToken: token });
  const url = `https://discord.com/login?token=${encodeURIComponent(token)}`;

  chrome.tabs.query({ url: 'https://discord.com/*' }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { url });
    } else {
      chrome.tabs.create({ url });
    }
  });
  showStatus('Connexion en cours...', 'success');
});