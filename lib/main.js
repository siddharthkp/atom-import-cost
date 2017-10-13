'use babel'

import { Point } from 'atom'
import { importCost, cleanup, JAVASCRIPT, TYPESCRIPT } from 'import-cost'
import bytes from 'bytes'

const getFileTypeByName = name => {
  const isJavaScript = name.match(/javascript/i)
  const isTypeScript = name.match(/typescript/i)

  return isJavaScript ? JAVASCRIPT : isTypeScript ? TYPESCRIPT : null;
}

export default {
  subscriptions: null,
  decorations: [],
  loadingDecorations: [],
  styleElementIds: [],

  activate() {
    console.log('import cost activated')
    this.attachLabels()

    atom.workspace.onDidChangeActivePaneItem(() => this.attachLabels())

    atom.workspace.observeTextEditors(editor =>
      editor.onDidSave(() => this.attachLabels())
    )
  },

  removeLabels() {
    this.decorations.map(d => d.destroy())
    this.decorations = []

    this.loadingDecorations.map(d => d.destroy())
    this.loadingDecorations = []

    this.styleElementIds.map(id => document.getElementById(id).remove())
    this.styleElementIds = []
  },

  attachLabels() {
    this.removeLabels()
    const editor = atom.workspace.getActiveTextEditor()
    if (!editor) return

    // Deduce filetype, currently only supporting JavaScript and TypeScript
    const { name } = editor.getGrammar();
    const fileType = getFileTypeByName(name);
    if (!fileType) return

    const filePath = editor.getBuffer().getPath()
    const code = editor.getText()
    const emitter = importCost(filePath, code, fileType)

    emitter.on('start', packages => this.handleCalculatingStart(packages))
    emitter.on('calculated', package => this.handleCalculatedPackage(package))
    emitter.on('done', () => this.handleCalculationDone())
  },

  getStyleBasedOnSize(size) {
    // These might be best set in configuration
    if (size < 50 * 1024) {
      return 'opacity: 0.5;'
    } else if (size > 100 * 1024) {
      return 'color: #d44e40;'
    }

    return null;
  },

  createMarkerFromLineNumber(line) {
    const editor = atom.workspace.getActiveTextEditor()
    // import-cost module returns line numbers in a 1 based index
    // while the atom decorateMarker API requires 0 based
    const position = new Point(line - 1, 0)
    const marker = editor.markBufferPosition(position)

    return marker;
  },

  handleCalculatingStart(packages) {
    const editor = atom.workspace.getActiveTextEditor()

    packages.map(({ line }) => {
      const marker = this.createMarkerFromLineNumber(line)
      const decoration = editor.decorateMarker(marker, {
        type: 'line',
        class: 'atom-import-cost-loading'
      })

      this.loadingDecorations.push(decoration)
    })
  },

  handleCalculatedPackage(package) {
    const editor = atom.workspace.getActiveTextEditor()
    const { line, size, gzip } = package

    if (!editor || !size) return

    const formattedSize = bytes(size, { decimalPlaces: 1 })
    const formattedGzippedSize = bytes(gzip, { decimalPlaces: 1 })

    // Create a style tag with a class for this specific
    // line and add it to the head element
    const styleElement = document.createElement('style')
    styleElement.id = `atom-import-cost-label-${line}`
    styleElement.type = 'text/css'
    styleElement.innerHTML = `
      .atom-import-cost-label-${line}::after {
        content: "  ${formattedSize} (gzipped: ${formattedGzippedSize})";
        opacity: 1;
        ${this.getStyleBasedOnSize(size)}
      }
    `
    document.getElementsByTagName('head')[0].appendChild(styleElement)

    // Keep track of the id of the style tag
    // so we can remove it from the DOM later
    this.styleElementIds.push(styleElement.id)
    const marker = this.createMarkerFromLineNumber(line)
    const decoration = editor.decorateMarker(marker, {
      type: 'line',
      class: `atom-import-cost-label-${line}`
    })

    this.decorations.push(decoration)
  },

  handleCalculationDone() {
    this.loadingDecorations.map(d => d.destroy())
    this.loadingDecorations = []
  },

  deactivate() {
    this.subscriptions.dispose()
    cleanup();
  }
}
