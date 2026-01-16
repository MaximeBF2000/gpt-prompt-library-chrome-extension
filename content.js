;(() => {
  const APP_ID = 'gpt-prompt-lib-root'
  const TOGGLE_ID = 'gpt-prompt-lib-toggle'
  const STORAGE_KEY = 'gptPromptLibrary.prompts'

  const state = {
    prompts: [],
    search: '',
    editingId: null,
    isOpen: false
  }

  const $ = (sel, root = document) => root.querySelector(sel)

  const uuid = () => {
    if (crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  const truncate = (value, length = 120) => {
    const cleaned = value.replace(/\s+/g, ' ').trim()
    if (cleaned.length <= length) return cleaned
    return `${cleaned.slice(0, length)}…`
  }

  const loadPrompts = () =>
    new Promise(resolve => {
      chrome.storage.local.get([STORAGE_KEY], result => {
        resolve(Array.isArray(result[STORAGE_KEY]) ? result[STORAGE_KEY] : [])
      })
    })

  const savePrompts = prompts =>
    new Promise(resolve => {
      chrome.storage.local.set({ [STORAGE_KEY]: prompts }, () => resolve())
    })

  const getSidebarAnchor = () => {
    const codexLink = document.querySelector(
      "#stage-slideover-sidebar a[href='/codex']"
    )
    if (codexLink && codexLink.parentElement) return codexLink.parentElement
    const stage = document.querySelector('#stage-slideover-sidebar')
    if (stage) return stage.querySelector('nav') || stage
    return null
  }

  const ensureToggleButton = () => {
    if ($('#' + TOGGLE_ID)) return
    const anchor = getSidebarAnchor()
    if (!anchor) return

    const button = document.createElement('button')
    button.id = TOGGLE_ID
    button.type = 'button'
    button.className = 'gpl-toggle'
    button.innerHTML = `
      <span class="gpl-toggle-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 3h10a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V5a2 2 0 0 1 2-2z"></path>
          <path d="M9 8h6"></path>
          <path d="M9 12h6"></path>
        </svg>
      </span>
      <span class="gpl-toggle-label">Prompts</span>
      <span class="gpl-toggle-pill">CUSTOM</span>
    `

    button.addEventListener('click', () => {
      state.isOpen = !state.isOpen
      updateOpenState()
    })

    anchor.appendChild(button)
  }

  const ensureSidebar = () => {
    if ($('#' + APP_ID)) return

    const root = document.createElement('div')
    root.id = APP_ID
    root.dataset.open = 'false'
    root.innerHTML = `
      <aside class="gpl-panel">
        <header class="gpl-header">
          <div>
            <p class="gpl-eyebrow">Prompt Library</p>
            <h2 class="gpl-title">Your prompts, always ready.</h2>
          </div>
          <button class="gpl-icon-btn" data-action="close" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
              <path d="M6 6l12 12"></path>
              <path d="M18 6l-12 12"></path>
            </svg>
          </button>
        </header>

        <div class="gpl-search">
          <div class="gpl-search-field">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="M20 20l-3.5-3.5"></path>
            </svg>
            <input type="search" placeholder="Search prompts by name" aria-label="Search prompts" />
          </div>
        </div>

        <div class="gpl-list" data-view="list">
          <div class="gpl-grid" aria-live="polite"></div>
          <div class="gpl-empty" hidden>
            <p>No prompts yet.</p>
            <span>Add your first prompt to start building your library.</span>
          </div>
        </div>

        <div class="gpl-editor" data-view="editor" hidden>
          <div class="gpl-editor-header">
            <button class="gpl-ghost gpl-back" data-action="back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 18l-6-6 6-6"></path>
              </svg>
              Back
            </button>
            <div>
              <p class="gpl-editor-eyebrow">Prompt editor</p>
              <h3 class="gpl-editor-title">Create a prompt</h3>
            </div>
          </div>
          <form class="gpl-editor-form">
            <label class="gpl-field">
              <span>Name</span>
              <input type="text" name="name" placeholder="e.g. Product launch email" required />
            </label>
            <label class="gpl-field">
              <span>Prompt</span>
              <textarea name="content" rows="20" placeholder="Write the prompt in full..." required></textarea>
            </label>
            <div class="gpl-editor-actions">
              <button class="gpl-secondary" type="button" data-action="back">Cancel</button>
              <button class="gpl-primary" type="submit">Save prompt</button>
            </div>
          </form>
        </div>

        <footer class="gpl-footer">
          <button class="gpl-primary" data-action="add">Add a new prompt</button>
          <p class="gpl-footer-note">Stored locally in your browser.</p>
        </footer>
      </aside>

      <div class="gpl-toast" aria-live="polite" hidden></div>
    `

    document.body.appendChild(root)

    wireEvents(root)
  }

  const updateOpenState = () => {
    const root = $('#' + APP_ID)
    if (!root) return
    root.dataset.open = state.isOpen ? 'true' : 'false'
    document.body.classList.toggle('gpl-open', state.isOpen)
  }

  const setEditorState = (open, prompt = null) => {
    const root = $('#' + APP_ID)
    if (!root) return
    const listView = $('.gpl-list', root)
    const searchView = $('.gpl-search', root)
    const footerView = $('.gpl-footer', root)
    const editorView = $('.gpl-editor', root)
    const title = $('.gpl-editor-title', root)
    const form = $('.gpl-editor-form', root)
    const nameInput = $("input[name='name']", form)
    const contentInput = $("textarea[name='content']", form)

    state.editingId = prompt ? prompt.id : null
    title.textContent = prompt ? 'Edit prompt' : 'Create a prompt'
    nameInput.value = prompt ? prompt.name : ''
    contentInput.value = prompt ? prompt.content : ''

    listView.hidden = open
    searchView.hidden = open
    footerView.hidden = open
    editorView.hidden = !open
    if (open) {
      nameInput.focus()
    }
  }

  const showToast = (message, tone = 'info') => {
    const root = $('#' + APP_ID)
    if (!root) return
    const toast = $('.gpl-toast', root)
    toast.textContent = message
    toast.dataset.tone = tone
    toast.hidden = false
    toast.classList.remove('gpl-toast-show')
    void toast.offsetWidth
    toast.classList.add('gpl-toast-show')
    clearTimeout(showToast._timer)
    showToast._timer = setTimeout(() => {
      toast.hidden = true
      toast.classList.remove('gpl-toast-show')
    }, 2500)
  }

  const renderPrompts = () => {
    const root = $('#' + APP_ID)
    if (!root) return

    const grid = $('.gpl-grid', root)
    const empty = $('.gpl-empty', root)

    const search = state.search.trim().toLowerCase()
    const filtered = state.prompts.filter(prompt =>
      prompt.name.toLowerCase().includes(search)
    )

    grid.innerHTML = ''
    if (!filtered.length) {
      empty.hidden = false
      return
    }

    empty.hidden = true
    filtered.forEach((prompt, index) => {
      const card = document.createElement('article')
      card.className = 'gpl-card'
      card.style.animationDelay = `${Math.min(index * 40, 240)}ms`
      card.dataset.id = prompt.id

      const name = document.createElement('h4')
      name.className = 'gpl-card-title'
      name.textContent = prompt.name

      const preview = document.createElement('p')
      preview.className = 'gpl-card-preview'
      preview.textContent = truncate(prompt.content)

      const actions = document.createElement('div')
      actions.className = 'gpl-card-actions'
      actions.innerHTML = `
        <button class="gpl-pill" data-action="use">Use</button>
        <button class="gpl-ghost" data-action="edit">Edit</button>
        <button class="gpl-ghost gpl-danger" data-action="delete">Delete</button>
      `

      card.appendChild(name)
      card.appendChild(preview)
      card.appendChild(actions)
      grid.appendChild(card)
    })
  }

  const writePromptIntoChat = content => {
    const input = document.querySelector("[contenteditable='true']")
    if (!input) {
      showToast('Chat input not found on this page.', 'error')
      return
    }

    input.focus()
    try {
      document.execCommand('selectAll', false, null)
      document.execCommand('delete', false, null)
    } catch (err) {
      // Best effort only; continue to insert.
    }

    const lines = content.split(/\n/)
    lines.forEach((line, index) => {
      if (line.length) {
        document.execCommand('insertText', false, line)
      }
      if (index < lines.length - 1) {
        const ok = document.execCommand('insertParagraph', false, null)
        if (!ok) {
          document.execCommand('insertLineBreak', false, null)
        }
      }
    })

    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    showToast('Prompt inserted into the chat.', 'success')
  }

  const handleAction = async (action, target) => {
    if (action === 'add') {
      setEditorState(true)
      return
    }

    if (action === 'close') {
      state.isOpen = false
      updateOpenState()
      setEditorState(false)
      return
    }

    if (action === 'cancel' || action === 'back') {
      setEditorState(false)
      return
    }

    const card = target.closest('.gpl-card')
    if (!card) return

    const promptId = card.dataset.id
    const prompt = state.prompts.find(item => item.id === promptId)
    if (!prompt) return

    if (action === 'use') {
      writePromptIntoChat(prompt.content)
    }

    if (action === 'edit') {
      setEditorState(true, prompt)
    }

    if (action === 'delete') {
      const confirmed = window.confirm(`Delete "${prompt.name}"?`)
      if (!confirmed) return
      state.prompts = state.prompts.filter(item => item.id !== promptId)
      await savePrompts(state.prompts)
      renderPrompts()
    }
  }

  const wireEvents = root => {
    const searchInput = $("input[type='search']", root)
    const grid = $('.gpl-grid', root)
    const form = $('.gpl-editor-form', root)

    root.addEventListener('click', event => {
      const action = event.target.closest('[data-action]')
      if (!action) return
      event.preventDefault()
      handleAction(action.dataset.action, event.target)
    })

    searchInput.addEventListener('input', event => {
      state.search = event.target.value
      renderPrompts()
    })

    form.addEventListener('submit', async event => {
      event.preventDefault()
      const formData = new FormData(form)
      const name = String(formData.get('name') || '').trim()
      const content = String(formData.get('content') || '').trim()

      if (!name || !content) {
        showToast('Name and prompt content are required.', 'error')
        return
      }

      if (state.editingId) {
        state.prompts = state.prompts.map(prompt =>
          prompt.id === state.editingId ? { ...prompt, name, content } : prompt
        )
      } else {
        state.prompts = [
          {
            id: uuid(),
            name,
            content
          },
          ...state.prompts
        ]
      }

      await savePrompts(state.prompts)
      setEditorState(false)
      renderPrompts()
    })

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        const editorView = $('.gpl-editor', root)
        if (editorView && !editorView.hidden) {
          setEditorState(false)
          return
        }
        if (state.isOpen) {
          state.isOpen = false
          updateOpenState()
        }
      }
    })
  }

  const init = async () => {
    ensureSidebar()
    ensureToggleButton()

    state.prompts = await loadPrompts()
    renderPrompts()
    updateOpenState()
  }

  const observe = () => {
    const observer = new MutationObserver(() => {
      ensureSidebar()
      ensureToggleButton()
    })

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    })

    setInterval(() => {
      ensureSidebar()
      ensureToggleButton()
    }, 1500)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init()
      observe()
    })
  } else {
    init()
    observe()
  }
})()
