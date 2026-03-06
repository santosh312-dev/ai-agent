import express from "express"
import { callGroq } from "./chatBot.js"
import cors from 'cors'

const app = express()
const port = 3001

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Welcome to easyGpt!')
})

app.post("/chat",async (req,res)=>{
    const {message,threadId}=req.body
    // todo : validate above fields
    if(!message || !threadId){
      res.status(400).json({message:"All fields are required"})
      return;
    }
    console.log("Message: ",message)
    const result=await callGroq(message,threadId)
    return res.json({message:result});
})

app.listen(port, () => {
  console.log(`Server is running on: ${port}`)
})
