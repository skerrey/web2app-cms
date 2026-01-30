const state = {
  data: null,
  sourcePath: "../content/content.json"
}

const statusEl = document.getElementById("status")
const pagesEl = document.getElementById("pages")
const outputEl = document.getElementById("output")
const reloadButton = document.getElementById("reloadButton")
const publishButton = document.getElementById("publishButton")

const setStatus = (message) => {
  statusEl.textContent = message
}

const loadContent = async () => {
  setStatus("Loading content.json...")
  outputEl.value = ""

  try {
    const response = await fetch(state.sourcePath, { cache: "no-store" })
    if (!response.ok) {
      throw new Error("Unable to load content.json")
    }
    const json = await response.json()
    if (!json || !Array.isArray(json.pages)) {
      throw new Error("Invalid content.json structure")
    }
    state.data = json
    renderPages()
    setStatus("Loaded content.json")
  } catch (error) {
    setStatus(error.message)
    pagesEl.innerHTML = ""
    state.data = null
  }
}

const movePage = (index, direction) => {
  if (!state.data) return
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= state.data.pages.length) return
  const pages = state.data.pages
  const [page] = pages.splice(index, 1)
  pages.splice(newIndex, 0, page)
  renderPages()
}

const updatePageTitle = (index, value) => {
  if (!state.data) return
  state.data.pages[index].title = value
}

const updateBlockText = (pageIndex, blockIndex, value) => {
  if (!state.data) return
  state.data.pages[pageIndex].blocks[blockIndex].text = value
}

const renderPages = () => {
  if (!state.data) return
  pagesEl.innerHTML = ""

  state.data.pages.forEach((page, index) => {
    const pageEl = document.createElement("div")
    pageEl.className = "page"

    const headerEl = document.createElement("div")
    headerEl.className = "page-header"

    const titleInput = document.createElement("input")
    titleInput.type = "text"
    titleInput.value = page.title || ""
    titleInput.setAttribute("aria-label", "Page title")
    titleInput.addEventListener("input", (event) => {
      updatePageTitle(index, event.target.value)
    })

    const moveUpButton = document.createElement("button")
    moveUpButton.type = "button"
    moveUpButton.textContent = "Move up"
    moveUpButton.disabled = index === 0
    moveUpButton.addEventListener("click", () => movePage(index, -1))

    const moveDownButton = document.createElement("button")
    moveDownButton.type = "button"
    moveDownButton.textContent = "Move down"
    moveDownButton.disabled = index === state.data.pages.length - 1
    moveDownButton.addEventListener("click", () => movePage(index, 1))

    headerEl.appendChild(titleInput)
    headerEl.appendChild(moveUpButton)
    headerEl.appendChild(moveDownButton)

    pageEl.appendChild(headerEl)

    const blocks = Array.isArray(page.blocks) ? page.blocks : []
    blocks.forEach((block, blockIndex) => {
      if (block.type !== "text") return
      const blockEl = document.createElement("div")
      blockEl.className = "block"

      const blockLabel = document.createElement("label")
      blockLabel.textContent = `Text block ${blockIndex + 1}`

      const blockInput = document.createElement("textarea")
      blockInput.value = block.text || ""
      blockInput.addEventListener("input", (event) => {
        updateBlockText(index, blockIndex, event.target.value)
      })

      blockEl.appendChild(blockLabel)
      blockEl.appendChild(blockInput)
      pageEl.appendChild(blockEl)
    })

    pagesEl.appendChild(pageEl)
  })
}

const publish = () => {
  if (!state.data) {
    setStatus("Nothing to publish")
    return
  }
  const output = JSON.stringify(state.data, null, 2)
  outputEl.value = output
  setStatus("JSON ready for copy")
}

reloadButton.addEventListener("click", loadContent)
publishButton.addEventListener("click", publish)

loadContent()
