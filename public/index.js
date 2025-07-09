const threadsContainer = document.getElementById("threads");
const newThreadBtn = document.getElementById("new-thread-btn");

async function fetchThreads() {
  try {
    const res = await fetch("/api/threads");
    const threads = await res.json();
    displayThreads(threads);
  } catch (e) {
    console.error("スレッド取得エラー", e);
  }
}

function displayThreads(threads) {
  threadsContainer.innerHTML = "";
  if (threads.length === 0) {
    threadsContainer.innerHTML =
      "<p>スレッドがありません。新しく作成してください。</p>";
    return;
  }

  threads.forEach((thread) => {
    const card = document.createElement("div");
    card.className = "thread-card";
    card.addEventListener("click", () => {
      location.href = `/board.html?id=${thread._id}`;
    });

    const title = document.createElement("div");
    title.className = "thread-title";
    title.textContent = thread.title;

    const info = document.createElement("div");
    info.className = "thread-info";

    const dateStr = new Date(
      thread.latestPostDate || thread.createdAt
    ).toLocaleString();
    info.textContent = `最終投稿日: ${dateStr} | レス数: ${thread.repliesCount}`;

    card.appendChild(title);
    card.appendChild(info);
    threadsContainer.appendChild(card);
  });
}

newThreadBtn.addEventListener("click", () => {
  const title = prompt("新しいスレッド名を入力してください（20文字以内）");
  if (!title) return;
  if (title.length > 20) {
    alert("スレッド名は20文字以内にしてください");
    return;
  }
  fetch("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("スレッド作成に失敗しました");
      return res.json();
    })
    .then((thread) => {
      location.href = `/board.html?id=${thread._id}`;
    })
    .catch((e) => alert(e.message));
});

fetchThreads();
