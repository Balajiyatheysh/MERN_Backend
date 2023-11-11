import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));

//when data send/ submitted via forms
app.use(express.json({
  limit:"20kb"
}))

//when data submitted via url here extended and limit are the keys we are proving to it
app.use(express.urlencoded({extended:true, limit: "20kb"}))


//to store some static files like images/files/pdf/favicon.. etc like that
app.use(express.static("public"))

//to perform crud operation on cookies on browser by the server from thsi config server can perform crud operation on cookies on browser
app.use(cookieParser())

export {app}