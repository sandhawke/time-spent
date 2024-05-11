import * as my from './index.mjs'
import {readyPAC} from 'datapages-auto'

const lines = await my.readMatchingLines('/home/sandro/log')

// sorry, I'm just intimidated by that function
const buffer = []
const save = global.console
global.console = {
  error: (...args) => save.error(...args),
  log: (...args) => buffer.push(args)
}
my.processTimeStack(lines, ['--work', '--day', '--csv'])
global.console = save

const pac = await readyPAC()

const data = []
for (const [format, date, hours] of buffer) {
  // console.log({date, hours})
  data.push([date, hours])
}
const pg = {data}
await pac.update('/u/sandrohawke/work-hours', pg)

await pac.stop()

/*
  WEBKEY=q node upload-days.mjs
  site set -k q /u/sandrohawke/work-hours
*/
