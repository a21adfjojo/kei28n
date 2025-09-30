require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error(err));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// 画像アップロード（メモリ保存、5MB制限）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = file.mimetype.toLowerCase();
    if (!["image/png","image/jpeg","image/jpg","image/gif"].includes(ext)) {
      return cb(new Error("画像はPNG/JPG/GIFのみです"));
    }
    cb(null,true);
  }
});

// 板リスト
const allowedBoards = ["総合","ゲーム","政治","ニュース","趣味","アニメ","音楽","スポーツ","技術","生活"];

// スキーマ
const threadSchema = new mongoose.Schema({
  title: { type: String, required: true },
  board: { type: String, default: "総合" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  votes: { type: Number, default: 0 },
  pinned: { type: Boolean, default: false }
});

const postSchema = new mongoose.Schema({
  threadId: { type: mongoose.Schema.Types.ObjectId, ref: "Thread", required: true },
  name: { type: String, default: "名無しさん" },
  content: { type: String, required: true },
  image: { type: String, default: null }, // Base64文字列
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 }
});

const Thread = mongoose.model("Thread", threadSchema);
const Post = mongoose.model("Post", postSchema);

// API Routes

// 全スレッド取得
app.get("/api/threads", async (req,res) => {
  try {
    const threads = await Thread.aggregate([
      { $lookup: { from:"posts", localField:"_id", foreignField:"threadId", as:"posts" }},
      { $addFields: { latestPostDate: { $max:"$posts.createdAt" }, repliesCount: { $size:"$posts" }}},
      { $sort: { pinned:-1, latestPostDate:-1, createdAt:-1 }},
      { $project: { title:1, board:1, createdAt:1, latestPostDate:1, repliesCount:1, votes:1, pinned:1 }}
    ]);
    res.json(threads);
  } catch(err){ res.status(500).json({ error: err.message }); }
});

// 板ごとのスレッド取得
app.get("/api/threads/board/:board", async(req,res)=>{
  try{
    const board = req.params.board;
    if(!allowedBoards.includes(board)) return res.status(400).json({error:"無効な板です"});
    const threads = await Thread.find({board}).sort({ pinned:-1, updatedAt:-1 });
    res.json(threads);
  }catch(err){ res.status(500).json({error:err.message}); }
});

// スレッド作成
app.post("/api/threads", async(req,res)=>{
  try{
    const { title, board } = req.body;
    if(!title?.trim()) return res.status(400).json({ error:"スレッド名は必須です" });
    const selectedBoard = allowedBoards.includes(board) ? board : "総合";
    const newThread = new Thread({ title, board:selectedBoard });
    await newThread.save();
    res.json(newThread);
  }catch(err){ res.status(500).json({ error: err.message }); }
});

// スレッド詳細・投稿取得
app.get("/api/threads/:id/posts", async(req,res)=>{
  try{
    const thread = await Thread.findById(req.params.id);
    if(!thread) return res.status(404).json({error:"スレッドが見つかりません"});
    const posts = await Post.find({ threadId: thread._id }).sort({ createdAt:-1 });
    res.json({ thread, posts });
  }catch(err){ res.status(500).json({error:err.message}); }
});

// 投稿作成（Base64画像対応）
app.post("/api/threads/:id/posts", upload.single("image"), async(req,res)=>{
  try{
    const thread = await Thread.findById(req.params.id);
    if(!thread) return res.status(404).json({error:"スレッドが見つかりません"});
    const content = req.body.content?.trim();
    if(!content) return res.status(400).json({error:"内容は必須です"});
    
    let base64Image = null;
    if(req.file){
      base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const post = new Post({
      threadId: thread._id,
      name: req.body.name?.trim() || "名無しさん",
      content,
      image: base64Image
    });

    await post.save();
    thread.updatedAt = new Date();
    await thread.save();

    res.json(post);
  }catch(err){ res.status(500).json({error:err.message}); }
});

// 投票
app.post("/api/threads/:id/vote", async(req,res)=>{
  try{
    const thread = await Thread.findById(req.params.id);
    if(!thread) return res.status(404).json({error:"スレッドが見つかりません"});
    const { type } = req.body;
    if(type==="up") thread.votes +=1;
    else if(type==="down") thread.votes -=1;
    await thread.save();
    res.json({ votes: thread.votes });
  }catch(err){ res.status(500).json({error:err.message}); }
});

app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));
