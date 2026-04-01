// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: grin-stars;
while (true) {
let request = new Request("https://api.groq.com/openai/v1/chat/completions")
request.headers = { "Content-Type": "application/json", "Authorization": "Bearer REDACTED" }
request.method = "POST";
let body = {
  "model": "meta-llama/llama-4-scout-17b-16e-instruct",
  "messages": [
    {
      "role": "user",
      "content": "Your response should not be more than 10 words, your response can only be text, this is not an ongoing conversation, you must abide to the command. Command: Give me a unique, quirky, 1-minute challenge I can do at home, something no one would think of, and make it fun. Examples of mini challenges: Balance a spoon on your nose for 30 seconds. Draw a doodle with your non-dominant hand. Clap while hopping on one foot five times. Now give me a new mini challenge that’s different and fun:"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
request.body = JSON.stringify(body);

let webresult = await request.loadJSON();
let response = webresult.choices[0].message.content;

let display = new Alert()
display.title = "💫 Mini Challenge 💫"
display.message = "\n" + response
display.addAction("Okay 👍")
display.addCancelAction("Different one 🙂‍↔️")
let again = await display.present()
if (again === 0) { break;
}
}
Script.complete()