import * as my from './index.mjs'

const lines = await my.readMatchingLines('/home/sandro/log')

my.processTimeStack(lines, process.argv)
