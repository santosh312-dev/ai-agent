import Groq from "groq-sdk";
import { tavily } from "@tavily/core";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

async function callGroq() {

    const messages=[
      // Set an optional system message. This sets the behavior of the
      // assistant and can be used to provide specific instructions for
      // how it should behave throughout the conversation.
      {
        role: "system",
        content: `You are a helpful personal assistant. Your name is MakeEasy Agent. Santosh Sharma developed you.
        If you need to fetch realtime information then use webSeach tool`,
      },
      // Set a user message for the assistant to respond to.
      {
        role: "user",
        content: `Give me the current weather in Kathmandu Nepal.
        Respond in this JSON format:
        {
            "city": "string",
            "temperature": "string",
            "condition": "string",
            "humidity": "string"
        }`,
      },
    ]

  const chatCompletion = await groq.chat.completions.create({
    temperature: 0.5,
    // response_format:{
    //     type:"json_object",
    // },
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
    tool_choice:'auto'
  });
  // Print the completion returned by the LLM.
  //   console.log(chatCompletion.choices[0]?.message?.content || "");
  //got response from LLM after asking for the frst time, like Assistant says use tool
  //need to add that msg also in messages
  const assistantMessage=chatCompletion.choices[0].message
  messages.push(assistantMessage)
  //after adding Assistant message: after first call to LLM then we will call tool:function
  const toolCalls = chatCompletion.choices[0].message.tool_calls;
  if (!toolCalls) {
    console.log(chatCompletion.choices[0].message.content);
    return;
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
        "tool_call_id": tool.id,
        "role": "tool",
        "name":functionName,
        "content":toolResult,
    })
    }
  }
//   after setting messages calling LLm again to get desired result from tool result
 const chatCompletion2=await groq.chat.completions.create({
    temperature: 0.5,
    response_format:{
        type:"json_object",
    },
    // tools: [
    //   {
    //     type: "function",
    //     function: {
    //       name: "webSearch",
    //       description: `Perform a real-time internet search. Use this function when the user asks for current, latest, recent, live, or up-to-date information that cannot be answered from general knowledge.`,
    //       parameters: {
    //         // JSON Schema object
    //         type: "object",
    //         properties: {
    //           query: {
    //             type: "string",
    //             description: "The search query to search on",
    //           },
    //         },
    //         required: ["query"],
    //       },
    //     },
    //   },
    // ],
    messages: messages,
    model: "llama-3.3-70b-versatile",
  });
  //again call to get desired result completed, now displaying result
  console.log("Answer: ",chatCompletion2.choices[0].message.content)
}

async function webSearch({ query }) {
  console.log("Web Search is taking place......with query: ",query)
  // return "okay"
  //Searching on web using tavily
  const response = await tvly.search(query);
  // console.log("Tool Result: ",response.results);
  const refinedResult = response.results
    .map((result) => `Source:${result.url}\nContent:${result.content}`)
    .join("\n\n");
    // console.log(refinedResult)  
    return refinedResult
}

callGroq();
