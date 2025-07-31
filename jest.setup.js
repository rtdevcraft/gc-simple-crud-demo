/* eslint-disable @typescript-eslint/no-require-imports */
import '@testing-library/jest-dom'

// First, load the utilities and make them globally available.
// We use require here to control the execution order.
const util = require('util')
global.TextEncoder = util.TextEncoder
global.TextDecoder = util.TextDecoder

// Polyfill for ReadableStream and MessagePort, which are also required by undici
const { ReadableStream } = require('stream/web')
const { MessageChannel } = require('worker_threads')
global.ReadableStream = ReadableStream
global.MessagePort = MessageChannel

// Now that the globals are set, we can safely import from undici.
const undici = require('undici')
global.Response = undici.Response
global.Request = undici.Request
global.Headers = undici.Headers
global.fetch = undici.fetch
