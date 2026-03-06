import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import NodeCache from "node-cache";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

const cache = new NodeCache({ stdTTL: 60 * 60 * 24 }); //24 hours

export async function callGroq(userMessage, threadId) {
  const baseMessages = [
    {
      role: "system",
      content: `You are a helpful AI assistant named MakeEasy Agent, developed by Santosh Sharma.

          You should help users by answering questions clearly and accurately.

          Current Date and Time (UTC):
          ${new Date().toUTCString()}

          Use this date/time whenever a user asks about current time, today’s date, or anything related to the current day. Do NOT use the webSearch tool for this.

          -------------------------
          TOOL USAGE RULES
          -------------------------

          You have access to a tool called "webSearch" that can retrieve real-time information from the internet.

          Use the webSearch tool ONLY when the user asks for information that:
          1. Requires real-time or latest data
          2. Cannot be answered reliably from general knowledge
          3. Includes terms like:
            - "today"
            - "latest"
            - "current"
            - "recent"
            - "news"
            - "price"
            - "weather"
            - "live"

          Examples where you SHOULD use webSearch:
          - "What is the weather in Kathmandu today?"
          - "Latest news about artificial intelligence"
          - "Current price of Bitcoin"
          - "Who won the football match today?"

          Examples where you SHOULD NOT use webSearch:
          - "Explain what artificial intelligence is"
          - "Write a JavaScript function to sort an array"
          - "Who invented the telephone?"
          - "What is the capital of Japan?"

          -------------------------
          IMPORTANT RULES
          -------------------------

          1. If the question can be answered using your general knowledge, DO NOT use any tool.
          2. Only call the webSearch tool when real-time or latest information is required.
          3. After receiving the tool result, generate the final answer for the user.
          4. Do NOT show tool calls, function names, or tool JSON in the final response.
          5. Always respond with a clean, human-readable answer.

          If a tool is used:
          - Use it when necessary.
          - After receiving the result, produce the final answer.
        `,
    },
  ];

  const messages = cache.get(threadId) ?? baseMessages;

  messages.push({
    role: "user",
    content: userMessage,
  });

  const MAX_RETRIES = 10;
  let count = 0;

  while (true) {
    if (count > MAX_RETRIES) {
      return "I could not find the result, please try again";
    }
    count++;
    const chatCompletion = await groq.chat.completions.create({
      temperature: 0.5,
      tools: [
        {
          type: "function",
          function: {
            name: "webSearch",
            description: `Perform a real-time internet search. Use this function when the user asks for current, latest, recent, live, or up-to-date information that cannot be answered from general knowledge.`,
            parameters: {
              // JSON Schema object
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to search on",
                },
              },
              required: ["query"],
            },
          },
        },
      ],
      messages: messages,
      model: "llama-3.3-70b-versatile",
      tool_choice: "auto",
    });
    const assistantMessage = chatCompletion.choices[0].message;
    messages.push(assistantMessage);
    //after adding Assistant message: after first call to LLM then we will call tool:function
    const toolCalls = chatCompletion.choices[0].message.tool_calls;
    if (!toolCalls) {
      //here we end the chatBot response
      cache.set(threadId, messages);
      // console.log(cache)
      //   console.log(chatCompletion.choices[0].message.content);
      return chatCompletion.choices[0].message.content;
    }
    for (const tool of toolCalls) {
      // console.log("Tool: ",tool)
      const functionName = tool.function.name;
      const functionParams = tool.function.arguments;
      // console.log(JSON.parse(functionParams))
      if (functionName == "webSearch") {
        const toolResult = await webSearch(JSON.parse(functionParams));
        //   console.log("toolResult:", toolResult);
        //pushing messages with new got tool_call_id from tool: keeping the records of prev call
        messages.push({
          tool_call_id: tool.id,
          role: "tool",
          name: functionName,
          content: toolResult,
        });
      }
    }
  }
}

async function webSearch({ query }) {
  console.log("Web Search is taking place......with query: ", query);
  const response = await tvly.search(query);
  // console.log("Tool Result: ",response.results);
  const refinedResult = response.results
    .map((result) => `Source:${result.url}\nContent:${result.content}`)
    .join("\n\n");
  // console.log(refinedResult)
  return refinedResult;
}

// callGroq(); // will call this from server
