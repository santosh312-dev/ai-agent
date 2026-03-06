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
    const {message}=req.body
    
    console.log("Message: ",message)
    const result=await callGroq(message)
    return res.json({message:result});
})

app.listen(port, () => {
  console.log(`Server is running on: ${port}`)
})
