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

    emitter.on('calculated', package => this.handleCalculatedPackage(package))
  },

  handleCalculatedPackage(package) {
    const editor = atom.workspace.getActiveTextEditor()
    const { line, size, gzip } = package

    if (!editor || !size) return

    const length = editor.lineLengthForScreenRow(line - 1)
    const editorElement = document.getElementsByTagName('atom-text-editor')[0];
    const verticalOffset = window.getComputedStyle(editorElement).lineHeight;
    const labelElement = document.createElement('span')
    const label = `
      &nbsp;&nbsp;
      ${bytes(size, { decimalPlaces: 1 })}
      <span>(gzipped: ${bytes(gzip, { decimalPlaces: 1 })})</span>
    `;

    labelElement.className = 'atom-import-cost-label'
    labelElement.innerHTML = label
    labelElement.style.top = `-${verticalOffset}`;

    const position = editor.bufferPositionForScreenPosition(new Point(line - 1, length))
    const marker = editor.markBufferPosition(position)
    const decoration = editor.decorateMarker(marker, {
      type: 'overlay',
      item: labelElement
    })

    this.decorations.push(decoration)
  },

  deactivate() {
    this.subscriptions.dispose()
    cleanup();
  }
}
