'use babel'

import readPkgUp from 'read-pkg-up'

module.exports = name => {
  let dependencies = {}

  try {
    const directory = atom.workspace.getActiveTextEditor().getDirectoryPath()
    dependencies = readPkgUp.sync({ cwd: directory }).pkg.dependencies
  } catch (error) {}

  if (!dependencies) dependencies = {}

  return dependencies[name] || null
}
