import "dotenv/config";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { MongoClient } from "mongodb";

let api = express.Router();
let client;
let db;
let messages;

const initApi = async (app) => {
  app.set("json spaces", 2);
  app.use("/api", api);

  client = new MongoClient(process.env.MONGODB_URI);
  db = client.db("mokshlakshmi[dot]com");
  messages = db?.collection("messages");
};

api.use(bodyParser.json());
api.use(cors());

api.get("/", (req, res) => {
  res.json({ message: "Hello, world!" });
});

api.get("/messages", async (req, res) => {
  try {
    const count = await messages.countDocuments();
    if (count === 0) {
      return res.json({
        success: true,
        messages: [
          {
            message: "No messages yet."
          }
        ]
      });
    } else {
      const cursor = await messages.find(
        {},
        { sort: { _id: 1 }, projection: { _id: 0 } }
      );
      const messageArray = await cursor.toArray();
      res.json({ success: true, messages: messageArray });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

api.post("/message", async (req, res) => {
  const { name, email, message, timestamp } = req.body;
  try {
    await messages.insertOne({ name, email, message, timestamp });
    res.json({ success: true, message: "Message sent!" });
  } catch (e) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

api.post("/echo", async (req, res) => {
  res.json(req.body);
});

/* Catch-all route to return a JSON error if endpoint not defined.
   Be sure to put all of your endpoints above this one, or they will not be called. */
api.all("/*", (req, res) => {
  res
    .status(404)
    .json({ error: `Endpoint not found: ${req.method} ${req.url}` });
});

export default initApi;
