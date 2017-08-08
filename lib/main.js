'use babel'

import { importCost, cleanup }  from 'import-cost';
import Utils                    from './utils'

let emitters  = {};
let markers   = {};

export default {
  activate() {
    atom.workspace.onDidChangeActivePaneItem(() => this.calculateImportCost())

    atom.workspace.observeTextEditors(editor =>
      editor.onDidSave(() => this.calculateImportCost())
    )

    this.calculateImportCost()
  },

  calculateImportCost() {
    // Get the active editor
    const editor = atom.workspace.getActiveTextEditor()
    if (!editor) return

    // Get the current file path and check whether it is a valid file extension
    const filePath      = editor.getPath();
    const fileExtension = Utils.extractFileExtension(filePath);
    if (!fileExtension) return

    // Get the content of the active editor
    const content = editor.getText()

    // Remove active importCost event listeners
    if (emitters[filePath]) {
      emitters[filePath].removeAllListeners()
    }

    // Calculate import cost of the active editor
    emitters[filePath] = importCost(filePath, content, fileExtension);
    emitters[filePath].on('calculated', packageInfo => this.renderImportCost(editor, packageInfo))
  },

  clearImportCost(packageName) {
    let marker = markers[packageName]
    if (marker) {
      marker.destroy()
      delete markers[packageName]
    }
  },

  renderImportCost(editor, packageInfo) {
    // Remove labels
    this.clearImportCost(packageInfo.name)

    // Get the position where we are going to insert the label
    const row = packageInfo.line - 1
    const col = editor.lineLengthForScreenRow(row)

    // Create a label and render it
    markers[packageInfo.name] = Utils.createMarker(packageInfo.size, editor, row, col)
  },

  deactivate() {
    cleanup()

    for (var emitter in emitters) {
      if (emitters.hasOwnProperty(emitter)) {
         emitters[emitter].removeAllListeners()
         delete emitters[emitter]
      }
    }

    for (var marker in markers) {
      if (markers.hasOwnProperty(marker)) {
         markers[marker].destroy()
         delete markers[marker]
      }
    }

  }
}
