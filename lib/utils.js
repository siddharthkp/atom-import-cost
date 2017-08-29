'use babel'

import { Point }                from 'atom'
import {JAVASCRIPT, TYPESCRIPT} from 'import-cost';
import filesize                 from 'filesize';

function extractFileExtension(filePath) {
  if (/\.js$/.test(filePath)) {
    return JAVASCRIPT;
  } else if (/\.ts$/.test(filePath)) {
    return TYPESCRIPT
  } else {
    return undefined;
  }
}

function createMarker(packageInfo, editor, row, col) {
  const label       = document.createElement('span');
  label.className   = 'atom-import-cost-label';

      
  if (packageInfo.size === undefined) {
    // show loader initially
    label.textContent = 'Calculating...';
  } else if (packageInfo.size <= 0) {
    // don't render any thing if package size is 0
    return '';
  } else {
    const size = filesize(packageInfo.size, {unix:true});
    label.textContent = `${size}`;
  }

  const marker = editor.markScreenPosition(new Point(row, col))
  return editor.decorateMarker(marker, {
    type: 'overlay',
    item: label
  })
}

export default { extractFileExtension, createMarker };