require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB接続
const MONGODB_URI = process.env.MONGODB_URI;
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// multer設定（画像アップロード）
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// スキーマ
const threadSchema = new mongoose.Schema({
  title: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Thread",
    required: true,
  },
  name: { type: String, default: "名無しさん" },
  content: { type: String, required: true },
  image: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
});

const Thread = mongoose.model("Thread", threadSchema);
const Post = mongoose.model("Post", postSchema);

// API Routes

// スレッド一覧取得（最新投稿順）
app.get("/api/threads", async (req, res) => {
  try {
    const threads = await Thread.aggregate([
      {
        $lookup: {
          from: "posts",
          localField: "_id",
          foreignField: "threadId",
          as: "posts",
        },
      },
      {
        $addFields: {
          latestPostDate: { $max: "$posts.createdAt" },
          repliesCount: { $size: "$posts" },
        },
      },
      {
        $sort: { latestPostDate: -1, createdAt: -1 },
      },
      {
        $project: {
          title: 1,
          createdAt: 1,
          latestPostDate: 1,
          repliesCount: 1,
        },
      },
    ]);
    res.json(threads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// スレッド作成
app.post("/api/threads", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "スレッド名は必須です。" });
    }
    const newThread = new Thread({ title });
    await newThread.save();
    res.json(newThread);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// スレッド詳細＆レス取得
app.get("/api/threads/:id/posts", async (req, res) => {
  try {
    const threadId = req.params.id;
    const thread = await Thread.findById(threadId);
    if (!thread)
      return res.status(404).json({ error: "スレッドが見つかりません。" });

    const posts = await Post.find({ threadId }).sort({ createdAt: 1 });
    res.json({ thread, posts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 投稿（画像アップロード対応）
app.post("/api/threads/:id/posts", upload.single("image"), async (req, res) => {
  try {
    const threadId = req.params.id;
    const thread = await Thread.findById(threadId);
    if (!thread)
      return res.status(404).json({ error: "スレッドが見つかりません。" });

    const name = req.body.name?.trim() || "名無しさん";
    const content = req.body.content?.trim();
    if (!content) {
      return res.status(400).json({ error: "内容は必須です。" });
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const post = new Post({
      threadId,
      name,
      content,
      image: imagePath,
    });

    await post.save();

    thread.updatedAt = new Date();
    await thread.save();

    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
