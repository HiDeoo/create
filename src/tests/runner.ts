import glob from 'fast-glob'
import Mocha from 'mocha'

export function run(): Promise<void> {
  return new Promise((resolve, reject) => {
    const mocha = new Mocha({
      color: true,
      reporter: undefined,
      ui: 'bdd',
    })

    try {
      const testFiles = glob.sync(['dist/**/*.test.js'], { absolute: true })

      for (const testFile of testFiles) {
        mocha.addFile(testFile)
      }

      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`))
        } else {
          resolve()
        }
      })
    } catch (error) {
      console.error(error)

      reject(error)
    }
  })
}
