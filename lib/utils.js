'use babel'

import { Point }                from 'atom'
import {JAVASCRIPT, TYPESCRIPT} from 'import-cost';
import filesize                 from 'filesize';

export default {
  extractFileExtension(filePath) {
    if (/\.js$/.test(filePath)) {
      return JAVASCRIPT;
    } else if (/\.ts$/.test(filePath)) {
      return TYPESCRIPT
    } else {
      return undefined;
    }
  },

  createMarker(packageSize, editor, row, col) {
    const label       = document.createElement('span')
    label.className   = 'atom-import-cost-label'
    label.textContent = filesize(packageSize)

    const marker = editor.markScreenPosition(new Point(row, col))
    return editor.decorateMarker(marker, {
      type: 'overlay',
      item: label
    })
  }

}
