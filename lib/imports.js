'use babel'

import readPkgUp from 'read-pkg-up'
import Walker from 'node-source-walk'

const isValidModule = ({ value }) => {
  const regex = new RegExp('^([a-z0-9-_]{1,})$')
  return regex.test(value)
}

module.exports = src => {
  const walker = new Walker()
  const dependencies = []

  if (src === '') return dependencies

  try {
    walker.walk(src, function(node) {
      switch (node.type) {
        case 'ImportDeclaration':
          if (node.source && node.source.value) {
            dependencies.push(node.source)
          }
          break
        case 'ExportNamedDeclaration':
        case 'ExportAllDeclaration':
          if (node.source && node.source.value) {
            dependencies.push(node.source)
          }
          break
        default:
          return
      }
    })
  } catch (e) {}

  return dependencies.filter(isValidModule)
}
