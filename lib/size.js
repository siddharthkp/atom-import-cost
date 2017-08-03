'use babel'

import axios from 'axios'
import versions from './versions'

const cache = {}

module.exports = name => {
  return new Promise(resolve => {
    if (versions(name)) name += '@' + versions(name)

    if (cache[name]) resolve(cache[name])
    else {
      axios
        .get('https://cost-of-modules.herokuapp.com/package?name=' + name)
        .then(result => {
          const size = result.data.gzipSize
          cache[name] = size
          resolve(size)
        })
        .catch(error => resolve(0))
    }
  })
}
