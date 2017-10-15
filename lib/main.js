'use babel'

import { Point } from 'atom'
import { importCost, cleanup, JAVASCRIPT, TYPESCRIPT } from 'import-cost'
import bytes from 'bytes'

const getFileTypeByName = name => {
  const isJavaScript = name.match(/javascript/i)
  const isTypeScript = name.match(/typescript/i)

  return isJavaScript ? JAVASCRIPT : isTypeScript ? TYPESCRIPT : null;
}

const normalizeString = str => str.replace(/\W/g, '')

const moduleDecorations = {}

class ModuleDecoration {
  editor: null
  lineNumber: null
  normalizedModuleName: null
  loading: null
  decoration: null
  styleElementId: null
  size: null
  gzip: null

  constructor(props) {
    this.editor = props.editor

    // import-cost module returns line numbers in a 1 based index
    // while the atom decorateMarker API requires 0 based
    this.lineNumber = props.lineNumber - 1
    this.normalizedModuleName = props.normalizedModuleName
    this.loading = true

    moduleDecorations[this.editor.id] = moduleDecorations[this.editor.id] || {}
    moduleDecorations[this.editor.id][this.lineNumber] = this

    this.renderDecoration()
  }

  renderDecoration() {
    const marker = this.createMarker()
    const decoration = this.editor.decorateMarker(marker, {
      type: 'line',
      class: 'atom-import-cost-loading'
    })

    this.decoration = decoration
  }

  update({ size, gzip }) {
    // If there's no change to the size, bail
    if (this.size === size && this.gzip === gzip) return

    // If the size comes back as 0 for some reason, destroy and bail
    if (!size && !gzip) {
      this.destroy()
      return
    }

    this.size = size
    this.gzip = gzip

    // Remove loading decoration
    this.decoration.destroy()
    this.loading = false

    // Attach the style
    this.renderStyleElement()

    const marker = this.createMarker()
    const decoration = this.editor.decorateMarker(marker, {
      type: 'line',
      class: this.styleElementId,
    })

    this.decoration = decoration
  }

  renderStyleElement() {
    const id = `atom-import-cost-module-${this.normalizedModuleName}`
    this.styleElementId = id

    // If we've already created a style tag for this module, bail
    if (document.getElementById(id)) return

    const formattedSize = bytes(this.size, { decimalPlaces: 1 })
    const formattedGzippedSize = bytes(this.gzip, { decimalPlaces: 1 })

    // Create a style tag with a class for this specific
    // package and add it to the head element
    const styleElement = document.createElement('style')
    styleElement.id = id
    styleElement.type = 'text/css'
    styleElement.innerHTML = `
      .${id}::after {
        content: "  ${formattedSize} (gzipped: ${formattedGzippedSize})";
        ${this.getStyleBasedOnSize(this.size)}
      }
    `
    document.getElementsByTagName('head')[0].appendChild(styleElement)
  }

  getStyleBasedOnSize(size) {
    // These might be best set in configuration
    if (size < 50 * 1024) {
      return 'opacity: 0.5;'
    } else if (size > 100 * 1024) {
      return 'color: #d44e40;'
    }

    return null;
  }

  createMarker() {
    const position = new Point(this.lineNumber, 0)
    const marker = this.editor.markBufferPosition(position)

    return marker;
  }

  destroy() {
    this.decoration && this.decoration.destroy()
    delete moduleDecorations[this.editor.id][this.lineNumber]
  }
}

export default {
  activate() {
    atom.workspace.onDidStopChangingActivePaneItem(editor => this.attachLabels(editor))

    atom.workspace.observeTextEditors(editor => {
      this.attachLabels(editor)

      editor.onDidChangeGrammar(() => this.attachLabels(editor))

      editor.onDidStopChanging(({ changes }) => {
        this.removeLabelsOnChangedLines(editor, changes)
        this.attachLabels(editor)
      })
    })
  },

  removeLabelsOnChangedLines(editor, changes) {
    const moduleDecorationsInCurrentEditor = this.getAllModuleDecorationsByEditor(editor.id)

    changes.map(change => {
      Object.values(moduleDecorationsInCurrentEditor).map(moduleDecoration => {
        // if the user has made a change to this ModuleDecoration's line
        // then destroy it so we can recalculate
        if (change.oldRange.start.row <= moduleDecoration.lineNumber && change.oldRange.end.row >= moduleDecoration.lineNumber) {
          moduleDecoration.destroy();
        }
      })
    })
  },

  attachLabels(editor) {
    if (!editor || !editor.getGrammar) return

    // Deduce filetype, currently only supporting JavaScript and TypeScript
    const { name } = editor.getGrammar();
    const fileType = getFileTypeByName(name);

    if (!fileType) return

    const filePath = editor.getPath()
    const code = editor.getText()
    const emitter = importCost(filePath, code, fileType)

    emitter.on('start', packages => this.handleCalculatingStart(editor, packages))
    emitter.on('calculated', package => this.handleCalculatedPackage(editor, package))
  },

  handleCalculatingStart(editor, packages) {
    const filePath = editor.getPath()

    // In case the user hasn't saved the file yet
    if (!filePath) return

    packages.map(package => {
      const normalizedModuleName = normalizeString(package.name)
      const currentModuleDecoration = this.getModuleDecoration(editor.id, package.line)

      // If we currently have a ModuleDecoration for this editor and line but the
      // module name has changed, destroy it
      if (currentModuleDecoration && currentModuleDecoration.normalizedModuleName !== normalizedModuleName) {
        currentModuleDecoration.destroy()
      } else if (currentModuleDecoration) {
        // Otherwise if everything is the same we don't need to create a new one
        return
      }

      new ModuleDecoration({
        editor,
        normalizedModuleName,
        lineNumber: package.line
      })
    })
  },

  handleCalculatedPackage(editor, package) {
    const filePath = editor.getPath()
    // import-cost returns 1 based indexes
    const lineNumber = package.line - 1

    // In case the user hasn't saved the file yet
    if (!filePath) return

    const moduleDecoration = this.getModuleDecoration(editor.id, lineNumber)

    // in case the ModuleDecoration has been destroyed before this
    // calculation has responded
    if (!moduleDecoration) return

    moduleDecoration.update({
      size: package.size,
      gzip: package.gzip
    })
  },

  getModuleDecoration(editorId, lineNumber) {
    moduleDecorations[editorId] = moduleDecorations[editorId] || {}
    return moduleDecorations[editorId][lineNumber]
  },

  getAllModuleDecorationsByEditor(editorId) {
    moduleDecorations[editorId] = moduleDecorations[editorId] || {}
    return moduleDecorations[editorId]
  },

  deactivate() {
    // remove subscriptions to import-cost module
    cleanup();

    // destroy all ModuleDecorations
    Object.values(moduleDecorations).map(editors =>
      Object.values(editor).map(moduleDecoration =>
        moduleDecoration.destory()
      )
    )
  }
}
