(() => {
  const briefing = document.getElementById('briefing');
  const room = document.getElementById('room');
  const setupForm = document.getElementById('setup-form');
  const transcript = document.getElementById('transcript');
  const replyForm = document.getElementById('reply-form');
  const replyInput = document.getElementById('reply-input');
  const sendBtn = document.getElementById('send-btn');
  const endBtn = document.getElementById('end-interview-btn');
  const restartBtn = document.getElementById('restart-btn');
  const onAirDot = document.getElementById('on-air-dot');

  let config = null;
  let apiKey = '';
  let messages = []; // Anthropic-style {role, content} history
  let sending = false;

  // ---------- Setup ----------
  setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(setupForm);

    config = {
      role: data.get('role')?.trim(),
      experienceLevel: data.get('experienceLevel'),
      interviewType: data.get('interviewType'),
      difficulty: data.get('difficulty'),
      numQuestions: data.get('numQuestions'),
      language: data.get('language')?.trim() || '',
      jobDescription: data.get('jobDescription')?.trim() || '',
      resume: data.get('resume')?.trim() || '',
    };
    apiKey = data.get('apiKey')?.trim() || '';

    document.getElementById('s-role').textContent = config.role;
    document.getElementById('s-level').textContent = config.experienceLevel;
    document.getElementById('s-type').textContent = config.interviewType;
    document.getElementById('s-difficulty').textContent = config.difficulty;
    document.getElementById('s-questions').textContent = config.numQuestions;

    briefing.classList.add('hidden');
    room.classList.remove('hidden');

    // Kick things off — the model opens Phase 1 (Introduction).
    await sendTurn(
      'Please begin the interview now. Introduce yourself briefly, then ask me to introduce myself.',
      { silent: true }
    );
  });

  restartBtn.addEventListener('click', () => window.location.reload());

  endBtn.addEventListener('click', () => {
    if (sending) return;
    sendTurn(
      "I'd like to end the interview here. Please give me the full final evaluation report now, following the FINAL REPORT format exactly."
    );
  });

  // ---------- Reply box ----------
  replyInput.addEventListener('input', () => {
    replyInput.style.height = 'auto';
    replyInput.style.height = `${Math.min(replyInput.scrollHeight, 200)}px`;
  });

  replyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      replyForm.requestSubmit();
    }
  });

  replyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = replyInput.value.trim();
    if (!text || sending) return;
    replyInput.value = '';
    replyInput.style.height = 'auto';
    sendTurn(text);
  });

  // ---------- Transcript rendering ----------
  function addMessage(role, text) {
    const el = document.createElement('div');
    el.className = `msg ${role}`;
    const who = document.createElement('div');
    who.className = 'who';
    who.textContent = role === 'interviewer' ? 'Interviewer' : role === 'candidate' ? 'You' : 'Session';
    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = text;
    el.appendChild(who);
    el.appendChild(body);
    transcript.appendChild(el);
    transcript.scrollTop = transcript.scrollHeight;
    return el;
  }

  function addThinking() {
    const el = document.createElement('div');
    el.className = 'msg thinking';
    el.innerHTML = '<div class="body">Interviewer is thinking…</div>';
    transcript.appendChild(el);
    transcript.scrollTop = transcript.scrollHeight;
    return el;
  }

  // ---------- API calls ----------
  async function sendTurn(userText, opts = {}) {
    if (sending) return;
    sending = true;
    sendBtn.disabled = true;
    onAirDot.style.opacity = '1';

    if (!opts.silent) {
      addMessage('candidate', userText);
    }
    messages.push({ role: 'user', content: userText });

    const thinkingEl = addThinking();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'x-api-key-override': apiKey } : {}),
        },
        body: JSON.stringify({ messages, config }),
      });

      const data = await res.json();
      thinkingEl.remove();

      if (!res.ok) {
        addMessage('system', data.error || 'Something went wrong. Check the server console.');
        sending = false;
        sendBtn.disabled = false;
        return;
      }

      messages.push({ role: 'assistant', content: data.text });
      addMessage('interviewer', data.text);
    } catch (err) {
      thinkingEl.remove();
      addMessage('system', `Network error: ${err.message}`);
    } finally {
      sending = false;
      sendBtn.disabled = false;
      replyInput.focus();
    }
  }
})();
