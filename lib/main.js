'use babel'

import { Point } from 'atom'
import imports from './imports'

export default {
  subscriptions: null,
  decorations: [],

  activate(state) {
    console.log('coo')

    atom.workspace.observeTextEditors(editor =>
      editor.onDidSave(() => {
        this.removeLabels()
        this.attachLabels(editor)
      })
    )
  },

  removeLabels() {
    this.decorations.map(deco => deco.destroy())
  },

  attachLabels(editor) {
    const code = editor.getText()

    const dependencies = imports(code)

    dependencies.map(dep => {
      const line = dep.loc.start.line - 1 // starts at 0 in atom
      const length = editor.lineLengthForScreenRow(line)

      const label = document.createElement('span')
      label.className = 'atom-import-cost-label'
      label.textContent = 'foobar'

      const position = new Point(line, length)

      console.log(position)
      const marker = editor.markScreenPosition(position, {
        invalidate: 'never'
      })
      const decoration = editor.decorateMarker(marker, {
        type: 'overlay',
        item: label
      })
      this.decorations.push(decoration)
    })
  },

  deactivate() {
    this.subscriptions.dispose()
  }
}
