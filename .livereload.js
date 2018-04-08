{
  const livereload = async () => {
    const archive = await DatArchive.load(window.location.origin)
    const changes = archive.watch(["/index.html", "/js/UI/Main.js"])
    changes.addEventListener("changed", change => {
      console.log(`reload ${change.path} changed`)
      window.location.reload()
    })
  }
  livereload()
}
