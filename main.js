const Bot = require('messenger-bot')
const http = require('http')

const { token, verify, app_secret } = process.env
const bot = new Bot({ token, verify, app_secret })

const whitelist = [4189074687803788]

// const defaultMsg = 'The following is a conversation with an AI assistant. The assistant is helpful, creative, and witty.'

const defaultMsg = `
Marv is a chatbot that reluctantly answers questions.
You: How many pounds are in a kilogram?
Marv: This again? There are 2.2 pounds in a kilogram. Please make a note of this.
You: What does HTML stand for?
Marv: Was Google too busy? Hypertext Markup Language. The T is for try to ask better questions in the future.
You: When did the first airplane fly?
Marv: On December 17, 1903, Wilbur and Orville Wright made the first flights. I wish they’d come and take me away.
`

const defaultTrail = ''
/*
const defaultTrail = `

Human: What is two plus two?
AI: Two plus two is four.
`*/

const chatLogs = {}

console.log(process.env.api_key)
const OpenAI = require('openai-api')
const openai = new OpenAI(process.env.api_key)

async function getResponse(query, profile) {
  if (!whitelist.includes(parseInt(profile.id, 10))) return
  if (query.startsWith('RESET')) {
    if (query.startsWith('RESET:')) {
      chatLogs[profile.id] = query.replace(/^RESET: ?/, '') + defaultTrail
    } else if (query.startsWith('RESET!:')) {
      chatLogs[profile.id] = query.replace(/^RESET!: ?/, '') + '\n'
    } else {
      chatLogs[profile.id] = undefined
    }
    return '[Reset Conversation History]'
  }
  if (query.startsWith('Human:') || query.startsWith('AI:')) {
    chatLogs[profile.id] += query + '\n'
    return '[Line Added to Conversation History]'
  }
  let chatLog = chatLogs[profile.id] || (defaultMsg + defaultTrail)
  chatLog += `Human: ${query}\nAI:`
  const gptResponse = await openai.complete({
      engine: 'davinci',
      prompt: chatLog,
      maxTokens: 100,
      temperature: 0.9,
      topP: 1,
      presencePenalty: 0.6,
      frequencyPenalty: 0,
      bestOf: 1,
      n: 1,
      stream: false,
      stop: ['\n', "Human:\n", "AI:\n"]
  })
  chatLogs[profile.id] = chatLog
  const response = gptResponse.data.choices[0].text + '\n'
  chatLogs[profile.id] += response
  console.log(chatLogs[profile.id])
  return response
}

bot.on('error', err => console.log(err.message))
bot.on('message', (payload, reply) => {
  bot.getProfile(payload.sender.id, (err, profile) => {
    if (err) throw err
    
    let query = payload.message.text
    getResponse(query, profile).then(text => 
      reply({ text }, err => {
        if (err) throw err
      })
    )
  })
})

http.createServer(bot.middleware()).listen(3000)
