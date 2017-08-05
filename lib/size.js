'use babel'

import axios from 'axios'
import bytes from 'bytes'
import versions from './versions'

const cache = {}

module.exports = name => {
  return new Promise(resolve => {
    if (versions(name)) name += '@' + versions(name)

    if (cache[name]) resolve(bytes(cache[name]))
    else {
      axios
        .get('https://cost-of-modules.herokuapp.com/package?name=' + name)
        .then(result => {
          const size = result.data.gzipSize
          cache[name] = size
          resolve(bytes(size))
        })
        .catch(error => {
          if (error.response && error.response.status === 400) {
            cache[name] = 'invalid'
            resolve('invalid')
          } else resolve('error')
        })
    }
  })
}
