const App = () => {
  return (
    <main className="container">
      <header>
        <h1>Web2App CMS Admin</h1>
        <p>Block-based visual editor. (Sidebar, canvas, inspector + preview coming next.)</p>
      </header>
      <section className="layout-placeholder">
        <div className="layout-sidebar">Pages (sidebar)</div>
        <div className="layout-canvas">Blocks (canvas)</div>
        <div className="layout-right">Inspector + Preview</div>
      </section>
    </main>
  )
}

export default App
