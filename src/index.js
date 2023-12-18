// require('dotenv').config({path: './env'})

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
// import express from 'express';
// const app = express()

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8001, () => {
      console.log(`Server is running at port : ${process.env.PORT}`);
    });
    app.on("error", (error) => {
      console.log("Error: ", error);
      throw error;
    });
    app.get("/", (req, res) => {
      res.send("hurray");
    });
  })
  .catch((error) => {
    console.log("MONGODB connection failed..!!", error);
  });

/*
import express from "express";
const app = express();
(async () => {
  try {
    await mongooes.connect(`${process.env.MONGO_DB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("error", error);
      throw error;
    });
    app.listen(process.env.PORT, () => {
      console.log(`App is listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
})();
*/
