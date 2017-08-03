'use babel'

import { Point } from 'atom'
import imports from './imports'
import getSize from './size'

export default {
  subscriptions: null,
  decorations: [],

  activate() {
    console.log('import cost activated')
    const activeEditor = atom.workspace.getActiveTextEditor()
    this.attachLabels(activeEditor)

    atom.workspace.observeTextEditors(editor =>
      editor.onDidSave(() => {
        this.removeLabels()
        this.attachLabels(editor)
      })
    )
  },

  removeLabels() {
    this.decorations.map(d => d.destroy())
    this.decorations = []
  },

  attachLabels(editor) {
    const code = editor.getText()

    const dependencies = imports(code)

    dependencies.map(d => {
      const name = d.value

      getSize(name).then(size => {
        if (!size) return

        const line = d.loc.start.line - 1 // starts at 0 in atom
        const length = editor.lineLengthForScreenRow(line)

        const label = document.createElement('span')
        label.className = 'atom-import-cost-label'
        label.textContent = size

        const position = new Point(line, length)

        const marker = editor.markScreenPosition(position, {
          invalidate: 'never'
        })
        const decoration = editor.decorateMarker(marker, {
          type: 'overlay',
          item: label
        })
        this.decorations.push(decoration)
      })
    })
  },

  deactivate() {
    this.subscriptions.dispose()
  }
}
